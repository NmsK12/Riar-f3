const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));

// Servir archivos estáticos
app.use(express.static('public'));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'tu-secreto-super-seguro-cambialo';

// Conexión a MongoDB (usaremos MongoDB en memoria por ahora)
// En producción usa MongoDB Atlas o Railway MongoDB
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/panel-admin';

// Modelos
const User = require('./models/User');
const ApiKey = require('./models/ApiKey');
const VerificationCode = require('./models/VerificationCode');

// Conectar a MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ Conectado a MongoDB');
  initializeAdmins();
}).catch(err => {
  console.log('⚠️ MongoDB no disponible, usando modo sin BD (solo para desarrollo)');
  console.log('   Instala MongoDB o usa MongoDB Atlas para producción');
});

// Inicializar administradores
async function initializeAdmins() {
  try {
    const admins = [
      { username: 'zGatoO', password: 'NmsK12', role: 'admin', telegram: '@zGatoO' },
      { username: 'chocotete', password: 'junior.45', role: 'admin', telegram: '@choco_tete' },
      { username: 'TheWinnie', password: 'Penecito89', role: 'admin', telegram: '@WinniePoohOFC' }
    ];

    for (const admin of admins) {
      const exists = await User.findOne({ username: admin.username });
      if (!exists) {
        const hashedPassword = await bcrypt.hash(admin.password, 10);
        await User.create({
          username: admin.username,
          password: hashedPassword,
          role: admin.role,
          telegram: admin.telegram,
          active: true,
          createdBy: 'system'
        });
        console.log(`✅ Admin creado: ${admin.username}`);
      }
    }
  } catch (error) {
    console.error('Error inicializando admins:', error.message);
  }
}

// Middleware de autenticación
const authenticate = (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'No autorizado' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token inválido' });
  }
};

// Middleware de roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'No tienes permisos' });
    }
    next();
  };
};

// RUTAS

// Página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    const user = await User.findOne({ username, role });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
    }

    if (!user.active) {
      return res.status(401).json({ success: false, message: 'Usuario inactivo' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
    }

    // Verificar IP para vendedores y clientes
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    
    if (role !== 'admin' && !user.verifiedIPs.includes(clientIP)) {
      // Generar código de verificación
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      await VerificationCode.create({
        userId: user._id,
        code,
        type: 'ip_verification',
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 horas
      });

      return res.json({
        success: false,
        needsVerification: true,
        message: 'Se ha enviado un código de verificación a los administradores',
        code // En producción, esto se enviaría solo a los admins
      });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      message: 'Login exitoso',
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        telegram: user.telegram
      },
      token
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error en login', error: error.message });
  }
});

// Verificar código IP
app.post('/api/auth/verify-ip', async (req, res) => {
  try {
    const { username, code } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const verification = await VerificationCode.findOne({
      userId: user._id,
      code,
      type: 'ip_verification',
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!verification) {
      return res.status(400).json({ success: false, message: 'Código inválido o expirado' });
    }

    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    user.verifiedIPs.push(clientIP);
    await user.save();

    verification.used = true;
    await verification.save();

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      message: 'IP verificada exitosamente',
      token
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error verificando IP', error: error.message });
  }
});

// REGISTRO DE CLIENTE
app.post('/api/auth/register-client', async (req, res) => {
  try {
    const { username, password, telegram, phone, fullName } = req.body;

    if (!username || !password || !telegram || !phone || !fullName) {
      return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }

    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(400).json({ success: false, message: 'El usuario ya existe' });
    }

    const code = Math.random().toString(36).substring(2, 10).toUpperCase();

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      password: hashedPassword,
      role: 'cliente',
      telegram,
      phone,
      fullName,
      active: false,
      registrationCode: code
    });

    // Crear código de verificación para admins
    await VerificationCode.create({
      userId: user._id,
      code,
      type: 'client_registration',
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 horas
      metadata: { username, telegram, phone, fullName }
    });

    res.json({
      success: true,
      message: 'Solicitud enviada. Por favor contacta a un administrador con el código',
      code,
      admins: ['@zGatoO', '@choco_tete', '@WinniePoohOFC']
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error en registro', error: error.message });
  }
});

// Obtener info del usuario actual
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        telegram: user.telegram
      }
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Usuario no encontrado' });
  }
});

// Activar cliente desde código de registro
app.post('/api/auth/activate-client', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { code, duration, allowedEndpoints } = req.body;

    const verification = await VerificationCode.findOne({
      code,
      type: 'client_registration',
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!verification) {
      return res.status(400).json({ success: false, message: 'Código inválido o expirado' });
    }

    const user = await User.findById(verification.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    // Activar usuario
    user.active = true;
    user.allowedEndpoints = allowedEndpoints || [];
    
    // Calcular expiración
    if (duration && duration !== 'permanent') {
      const durations = {
        '1d': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '1m': 30 * 24 * 60 * 60 * 1000,
        '2m': 60 * 24 * 60 * 60 * 1000,
        '6m': 180 * 24 * 60 * 60 * 1000,
        '1y': 365 * 24 * 60 * 60 * 1000
      };
      user.expiresAt = new Date(Date.now() + (durations[duration] || durations['1m']));
    }

    await user.save();

    verification.used = true;
    await verification.save();

    res.json({
      success: true,
      message: 'Cliente activado exitosamente',
      data: {
        username: user.username,
        expiresAt: user.expiresAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error activando cliente', error: error.message });
  }
});

// RUTAS PROTEGIDAS
const keysRouter = require('./routes/keys');
const usersRouter = require('./routes/users');
const notificationsRouter = require('./routes/notifications');
const statsRouter = require('./routes/stats');
const profileRouter = require('./routes/profile');
const keyRequestsRouter = require('./routes/keyRequests');

// Ruta pública para validar keys (usado por la API principal)
const ApiKey = require('./models/ApiKey');
app.post('/api/keys/validate', async (req, res) => {
  try {
    const { key, endpoint } = req.body;

    if (!key) {
      return res.status(400).json({ success: false, message: 'Key requerida', valid: false });
    }

    const apiKey = await ApiKey.findOne({ key, active: true });
    
    if (!apiKey) {
      return res.status(401).json({ success: false, message: 'Key inválida', valid: false });
    }

    // Verificar expiración
    if (new Date() > apiKey.expiresAt) {
      apiKey.active = false;
      await apiKey.save();
      return res.status(401).json({ success: false, message: 'Key expirada', valid: false });
    }

    // Verificar endpoint
    if (apiKey.endpoint !== 'all' && endpoint && apiKey.endpoint !== endpoint) {
      return res.status(403).json({ 
        success: false, 
        message: `Esta key solo es válida para el endpoint: ${apiKey.endpoint}`, 
        valid: false 
      });
    }

    // Actualizar uso
    apiKey.usageCount += 1;
    apiKey.lastUsed = new Date();
    await apiKey.save();

    res.json({
      success: true,
      message: 'Key válida',
      valid: true,
      data: {
        endpoint: apiKey.endpoint,
        expiresAt: apiKey.expiresAt
      }
    });
  } catch (error) {
    console.error('Error validando key:', error);
    res.status(500).json({ success: false, message: 'Error validando key', error: error.message, valid: false });
  }
});

app.use('/api/keys', authenticate, keysRouter);
app.use('/api/users', authenticate, authorize('admin', 'vendedor'), usersRouter);
app.use('/api/notifications', authenticate, notificationsRouter);
app.use('/api/stats', authenticate, statsRouter);
app.use('/api/profile', authenticate, profileRouter);
app.use('/api/key-requests', authenticate, keyRequestsRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Panel de administración iniciado en puerto ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log('👥 Administradores iniciales:');
  console.log('   - zGatoO / NmsK12');
  console.log('   - chocotete / junior.45');
  console.log('   - TheWinnie / Penecito89');
});

module.exports = app;

