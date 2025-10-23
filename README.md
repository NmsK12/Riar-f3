# 🎮 Panel de Administración - API Keys Management

Panel de control completo para la gestión de API Keys con sistema de roles (Admin, Vendedor, Cliente) y tema morado/negro estilo hacker.

## ✨ Características

### 👥 Sistema de Roles

1. **Administrador (Admin)**
   - Crear keys ilimitadas para cualquier endpoint
   - Crear usuarios (vendedores y clientes)
   - Gestión completa de todos los usuarios y keys
   - Ver y aprobar códigos de verificación
   - Acceso permanente

2. **Vendedor**
   - Crear hasta 5 clientes
   - Crear keys para sus clientes
   - Ver y gestionar solo sus propios clientes
   - Cuenta con fecha de expiración

3. **Cliente**
   - Crear 1 key por endpoint
   - Solo keys de 1 mes de duración
   - Registro con aprobación de admin
   - Cuenta con fecha de expiración

### 🔑 Sistema de API Keys

- Keys de 15-18 caracteres alfanuméricos
- Expiraciones: 1h, 2h, 12h, 1d, 7d, 1m, 2m, 6m, 1y
- Keys específicas por endpoint o acceso total
- Validación automática con expiración
- Contador de usos

### 🔐 Seguridad

- Verificación de IP para vendedores y clientes
- Códigos de verificación con expiración (2 horas)
- JWT para autenticación
- Contraseñas hasheadas con bcrypt
- Tokens con expiración de 7 días

### 📊 Endpoints de la API

- `/dni` - Consulta de personas
- `/telp` - Teléfonos
- `/nom` - Búsqueda por nombres
- `/arg` - Árbol genealógico
- `/corr` - Correos electrónicos
- `/risk` - Datos de riesgo
- `/foto` - Fotografías
- `/sunat` - Datos laborales SUNAT
- `/meta` - Todos los datos
- `/all` - Acceso total (solo admin)

## 🚀 Instalación

### Requisitos

- Node.js >= 16.0.0
- MongoDB (local o MongoDB Atlas)
- npm >= 8.0.0

### Pasos

1. **Instalar dependencias**
   ```bash
   cd panel-admin
   npm install
   ```

2. **Configurar variables de entorno**
   
   Renombra `env.example.txt` a `.env` y configura:
   ```
   MONGODB_URI=mongodb://localhost:27017/panel-admin
   JWT_SECRET=tu-secreto-super-seguro-aleatorio
   PORT=3001
   NODE_ENV=development
   ```

3. **Iniciar MongoDB**
   ```bash
   # Si usas MongoDB local
   mongod
   ```

4. **Iniciar el panel**
   ```bash
   npm start
   # O en modo desarrollo:
   npm run dev
   ```

5. **Abrir en el navegador**
   ```
   http://localhost:3001
   ```

## 👨‍💼 Administradores Iniciales

El sistema crea automáticamente 3 administradores:

| Usuario | Contraseña | Telegram |
|---------|-----------|----------|
| zGatoO | NmsK12 | @zGatoO |
| chocotete | junior.45 | @choco_tete |
| TheWinnie | Penecito89 | @WinniePoohOFC |

## 📡 Integración con la API Principal

Para integrar el sistema de keys con tu API existente (`sisfoh-api`):

### Opción 1: Middleware Automático

1. Copia el archivo `middleware/keyValidator.js` a tu API principal

2. En tu `server.js` de la API principal, importa y usa el middleware:

```javascript
const { validateKey } = require('./middleware/keyValidator');

// Proteger endpoints
app.get('/dni', validateKey('dni'), async (req, res) => {
  // Tu código existente...
});

app.get('/telp', validateKey('telp'), async (req, res) => {
  // Tu código existente...
});

// Aplicar a todos los endpoints
app.get('/arg', validateKey('arg'), async (req, res) => { ... });
app.get('/corr', validateKey('corr'), async (req, res) => { ... });
app.get('/risk', validateKey('risk'), async (req, res) => { ... });
app.get('/foto', validateKey('foto'), async (req, res) => { ... });
app.get('/sunat', validateKey('sunat'), async (req, res) => { ... });
app.get('/meta', validateKey('meta'), async (req, res) => { ... });
```

3. Configurar la URL del panel en `.env` de tu API:
```
PANEL_URL=http://localhost:3001
```

### Opción 2: Validación Manual

```javascript
const axios = require('axios');

async function validateApiKey(key, endpoint) {
  try {
    const response = await axios.post('http://localhost:3001/api/keys/validate', {
      key,
      endpoint
    });
    return response.data.valid;
  } catch (error) {
    return false;
  }
}
```

## 🎨 Uso de la API con Keys

Una vez integrado, los usuarios deberán incluir su key en cada petición:

### Como Query Parameter
```bash
curl "http://localhost:8080/dni?dni=80660244&key=TU_API_KEY_AQUI"
```

### Como Header
```bash
curl -H "X-API-Key: TU_API_KEY_AQUI" "http://localhost:8080/dni?dni=80660244"
```

## 📋 Flujo de Trabajo

### Para Clientes Nuevos

1. Cliente se registra en `/register`
2. Sistema genera código de registro
3. Cliente contacta a admin con el código
4. Admin aprueba y configura:
   - Duración del acceso
   - Endpoints permitidos
5. Cliente puede iniciar sesión y crear keys

### Para Vendedores

1. Admin crea cuenta de vendedor
2. Vendedor inicia sesión
3. Vendedor crea hasta 5 clientes
4. Por cada cliente, se genera código
5. Vendedor envía código a admin
6. Admin aprueba cliente
7. Cliente ya puede acceder

### Creación de Keys

1. Usuario inicia sesión
2. Va a sección "API Keys"
3. Click en "Crear Nueva Key"
4. Selecciona:
   - Endpoint
   - Duración
5. Key generada y lista para usar

## 🗄️ Estructura de Base de Datos

### Colecciones

- **users**: Usuarios del sistema
- **apikeys**: Keys generadas
- **verificationcodes**: Códigos de verificación temporal

### Expiración Automática

MongoDB TTL Index elimina automáticamente:
- Keys expiradas
- Códigos de verificación usados o expirados
- Usuarios con fecha de expiración cumplida

## 🎯 Endpoints del Panel

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register-client` - Registro de cliente
- `POST /api/auth/verify-ip` - Verificar IP
- `GET /api/auth/me` - Obtener usuario actual

### Keys
- `GET /api/keys` - Listar keys
- `POST /api/keys` - Crear key
- `DELETE /api/keys/:id` - Eliminar key
- `POST /api/keys/validate` - Validar key (para API principal)

### Usuarios (Admin/Vendedor)
- `GET /api/users` - Listar usuarios
- `POST /api/users` - Crear usuario
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Eliminar usuario

### Notificaciones (Admin)
- `GET /api/notifications` - Ver notificaciones
- `POST /api/notifications/approve` - Aprobar código

### Estadísticas
- `GET /api/stats` - Estadísticas del dashboard

### Perfil
- `GET /api/profile` - Ver perfil
- `PUT /api/profile` - Actualizar perfil

## 🚢 Deploy en Railway

### Panel de Admin

1. **Crear nuevo proyecto en Railway**
   ```bash
   railway login
   railway init
   ```

2. **Agregar MongoDB**
   - En Railway dashboard, agrega MongoDB plugin
   - Copia la URL de conexión

3. **Configurar variables de entorno**
   ```
   MONGODB_URI=<tu-mongodb-url>
   JWT_SECRET=<secreto-aleatorio-seguro>
   PORT=3001
   NODE_ENV=production
   ```

4. **Deploy**
   ```bash
   git add .
   git commit -m "Panel admin listo"
   git push
   ```

### Conectar con API Principal

1. En las variables de entorno de tu API principal, agrega:
   ```
   PANEL_URL=https://tu-panel.railway.app
   ```

2. Asegúrate de tener el middleware en tu API

3. Redeploy tu API

## 🔧 Desarrollo

```bash
# Modo desarrollo con auto-reload
npm run dev

# Producción
npm start
```

## 📝 Notas Importantes

1. **Seguridad**:
   - Cambia el `JWT_SECRET` por uno aleatorio y seguro
   - En producción, usa HTTPS
   - Configura CORS apropiadamente

2. **MongoDB**:
   - Para producción, usa MongoDB Atlas
   - Los índices TTL limpian datos expirados automáticamente

3. **Keys**:
   - Las keys son permanentes hasta su expiración
   - No se regeneran automáticamente
   - Se eliminan automáticamente al expirar

4. **Usuarios**:
   - Admins no expiran ni se pueden eliminar
   - Vendedores y clientes expiran según configuración
   - Al eliminar usuario, sus keys se mantienen hasta expirar

## 🆘 Soporte

Contactar a los administradores:
- @zGatoO
- @choco_tete
- @WinniePoohOFC

## 📜 Licencia

MIT

