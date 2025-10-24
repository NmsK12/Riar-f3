const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();

// Trust proxy configurado para Railway (1 = confiar en el primer proxy)
// Esto es más seguro que 'true' ya que solo confía en el primer hop
app.set('trust proxy', 1);

// ===== SEGURIDAD MÁXIMA =====

// 1. Helmet - Headers de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'no-referrer' },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true
}));

// 2. Rate Limiting - Anti scraping/brute force
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por IP
  message: {
    success: false,
    message: '🚫 Demasiadas solicitudes. Intenta de nuevo en 15 minutos.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limit más estricto para login
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Solo 5 intentos de login
  message: {
    success: false,
    message: '🚫 Demasiados intentos de login. Espera 15 minutos.',
    error: 'AUTH_RATE_LIMIT'
  }
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// 3. Deshabilitar caché completamente
app.use((req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  });
  next();
});

// 4. Middleware básico
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 5. CORS con configuración segura
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3001',
  'https://web-production-a57a5.up.railway.app'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('❌ Acceso denegado por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  maxAge: 86400 // 24 horas
}));

// 6. Servir archivos estáticos con headers de seguridad
app.use(express.static('public', {
  maxAge: 0,
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
}));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'tu-secreto-super-seguro-cambialo';

// Conexión a MongoDB (usaremos MongoDB en memoria por ahora)
// En producción usa MongoDB Atlas o Railway MongoDB
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/panel-admin';

// Modelos
const User = require('./models/User');
const ApiKey = require('./models/ApiKey');
const VerificationCode = require('./models/VerificationCode');
const Blacklist = require('./models/Blacklist');
const AuditLog = require('./models/AuditLog');
const ApiLog = require('./models/ApiLog');
const Ticket = require('./models/Ticket');

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

// Importar middleware de autenticación
const { authenticate, authorize } = require('./middleware/auth');

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

    // Cookie con máxima seguridad
    res.cookie('token', token, {
      httpOnly: true, // No accesible desde JavaScript
      secure: true, // Solo HTTPS
      sameSite: 'strict', // Protección CSRF
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      path: '/'
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

    // Cookie con máxima seguridad
    res.cookie('token', token, {
      httpOnly: true, // No accesible desde JavaScript
      secure: true, // Solo HTTPS
      sameSite: 'strict', // Protección CSRF
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      path: '/'
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

// Middleware de seguridad avanzada
const { createUserRateLimit, detectSuspiciousPatterns } = require('./middleware/advancedRateLimit');
const { logAction } = require('./middleware/auditLogger');

// Ruta pública para validar keys (usado por la API principal)
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

// Aplicar middleware de seguridad avanzada a todas las rutas protegidas
app.use('/api/', authenticate, detectSuspiciousPatterns, createUserRateLimit());

// Rutas protegidas
app.use('/api/keys', keysRouter);
app.use('/api/users', authorize('admin', 'vendedor'), usersRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/profile', profileRouter);
app.use('/api/key-requests', keyRequestsRouter);

// Rutas de seguridad y soporte
const securityRouter = require('./routes/security');
const ticketsRouter = require('./routes/tickets');

app.use('/api/security', securityRouter);
app.use('/api/tickets', ticketsRouter);

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

