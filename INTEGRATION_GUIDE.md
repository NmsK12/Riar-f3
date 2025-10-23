# 🔗 Guía de Integración del Panel con la API Principal

Esta guía te muestra cómo integrar el sistema de validación de API Keys en tu API existente (`sisfoh-api`).

## 📋 Pasos de Integración

### 1. Copiar el Middleware

Copia el archivo `middleware/keyValidator.js` a tu proyecto `sisfoh-api`:

```bash
cp panel-admin/middleware/keyValidator.js ../middleware/
```

### 2. Instalar Dependencia (si no la tienes)

```bash
cd ../
npm install axios
```

### 3. Modificar `server.js` de tu API Principal

Abre `server.js` y agrega el middleware a cada endpoint protegido:

```javascript
// Al inicio del archivo, después de los otros requires
const { validateKey } = require('./middleware/keyValidator');

// ... tu código existente ...

// Modificar endpoints para requerir key
app.get('/dni', validateKey('dni'), async (req, res) => {
  try {
    const { dni } = req.query;
    
    if (!dni || !/^\d{8}$/.test(dni)) {
      return res.status(400).json({ 
        success: false, 
        message: 'DNI debe ser 8 dígitos' 
      });
    }

    const resultado = await bridge.buscarDNI(dni);
    
    if (resultado.success && resultado.data) {
      res.json({
        success: true,
        message: resultado.from_cache ? 'Consulta exitosa (desde caché)' : 'Consulta exitosa',
        data: {
          dni: resultado.data.dni,
          nombre: resultado.data.nombre,
          datos: resultado.data.datos || {},
          foto: resultado.data.foto
        },
        from_cache: resultado.from_cache || false
      });
    } else {
      res.json(resultado);
    }
  } catch (error) {
    console.error('❌ Error en endpoint DNI:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor', 
      error: error.message 
    });
  }
});

// Aplicar a TODOS los endpoints
app.get('/telp', validateKey('telp'), async (req, res) => {
  // ... código existente del endpoint telp ...
});

app.get('/nom', validateKey('nom'), async (req, res) => {
  // ... código existente del endpoint nom ...
});

app.get('/arg', validateKey('arg'), async (req, res) => {
  // ... código existente del endpoint arg ...
});

app.get('/corr', validateKey('corr'), async (req, res) => {
  // ... código existente del endpoint corr ...
});

app.get('/risk', validateKey('risk'), async (req, res) => {
  // ... código existente del endpoint risk ...
});

app.get('/foto', validateKey('foto'), async (req, res) => {
  // ... código existente del endpoint foto ...
});

app.get('/sunat', validateKey('sunat'), async (req, res) => {
  // ... código existente del endpoint sunat ...
});

app.get('/meta', validateKey('meta'), async (req, res) => {
  // ... código existente del endpoint meta ...
});

app.get('/stats', validateKey('all'), async (req, res) => {
  // ... código existente del endpoint stats ...
});
```

### 4. Configurar Variables de Entorno

Agrega a tu archivo `.env` (o crea uno si no existe):

```env
# URL del panel de administración
PANEL_URL=http://localhost:3001

# En producción:
# PANEL_URL=https://tu-panel.railway.app
```

### 5. Modo de Prueba (Opcional)

El middleware tiene un modo de desarrollo que permite el acceso si el panel no está disponible. Para activarlo, simplemente no inicies el panel y el middleware permitirá las peticiones con un warning en los logs.

## 🎯 Cómo Funciona

1. Usuario hace petición a tu API incluyendo su key:
   ```
   GET /dni?dni=80660244&key=ABC123XYZ456
   ```

2. El middleware `validateKey` intercepta la petición

3. Se conecta al panel para validar la key:
   ```javascript
   POST http://localhost:3001/api/keys/validate
   Body: { key: "ABC123XYZ456", endpoint: "dni" }
   ```

4. El panel verifica:
   - ✅ Key existe
   - ✅ Key está activa
   - ✅ Key no ha expirado
   - ✅ Key tiene permiso para ese endpoint

5. Si todo está OK, la petición continúa normal

6. Si falla, retorna error 401 con mensaje de contacto

## 📝 Ejemplo Completo

```javascript
// server.js de tu API principal
const express = require('express');
const { validateKey } = require('./middleware/keyValidator');

const app = express();

// Endpoint protegido
app.get('/dni', validateKey('dni'), async (req, res) => {
  // Tu lógica aquí - solo se ejecuta si la key es válida
  const { dni } = req.query;
  
  // ... resto de tu código ...
  
  res.json({ success: true, data: resultado });
});

// Sin key = Error 401
// Con key inválida = Error 401
// Con key válida = ✅ Acceso permitido
```

## 🔄 Respuestas de Error

Cuando no hay key:
```json
{
  "success": false,
  "message": "❌ API Key requerida. Compra acceso contactando a: @zGatoO, @choco_tete o @WinniePoohOFC",
  "error": "NO_API_KEY",
  "contacts": ["@zGatoO", "@choco_tete", "@WinniePoohOFC"]
}
```

Cuando la key es inválida:
```json
{
  "success": false,
  "message": "❌ API Key inválida o expirada. Contacta a: @zGatoO, @choco_tete o @WinniePoohOFC",
  "error": "INVALID_KEY",
  "contacts": ["@zGatoO", "@choco_tete", "@WinniePoohOFC"]
}
```

## 🚀 Deploy

### 1. Deploy del Panel (Railway)

```bash
cd panel-admin
git init
git add .
git commit -m "Panel admin inicial"
railway login
railway init
railway up
```

Agrega MongoDB en Railway y configura las variables de entorno.

### 2. Deploy de la API Principal

Actualiza la variable `PANEL_URL` en Railway con la URL de tu panel:

```
PANEL_URL=https://tu-panel-admin.up.railway.app
```

Redeploy tu API.

### 3. Verificar

1. Crea una key en el panel
2. Prueba tu API con la key:
   ```bash
   curl "https://tu-api.railway.app/dni?dni=80660244&key=TU_KEY"
   ```

## ⚙️ Configuración Avanzada

### Timeout Personalizado

Modifica el middleware si necesitas cambiar el timeout:

```javascript
const validation = await axios.post(`${PANEL_URL}/api/keys/validate`, {
  key,
  endpoint
}, {
  timeout: 10000 // 10 segundos en vez de 5
});
```

### Modo Solo Desarrollo

Para deshabilitar la validación en desarrollo:

```javascript
if (process.env.NODE_ENV === 'development' && process.env.SKIP_KEY_VALIDATION === 'true') {
  return next();
}
```

### Cache de Keys

Para evitar consultar el panel en cada petición, puedes implementar cache:

```javascript
const keyCache = new Map();

// Antes de validar con el panel
const cached = keyCache.get(key);
if (cached && cached.expiresAt > new Date()) {
  return next();
}

// Después de validar exitosamente
keyCache.set(key, { expiresAt: new Date(validation.data.data.expiresAt) });
```

## 🔍 Debugging

Ver logs del middleware:
```javascript
// En keyValidator.js, agrega console.logs:
console.log('🔍 Validando key:', key);
console.log('📍 Endpoint:', endpoint);
console.log('✅ Validación exitosa');
```

## 📚 Endpoints del Panel para la API

Tu API solo necesita usar:
- `POST /api/keys/validate` - Validar una key

Los demás endpoints son para el panel web.

## ⚠️ Consideraciones

1. **Seguridad**: Las keys viajan en query params o headers. En producción usa HTTPS.

2. **Performance**: Cada petición valida con el panel. Considera implementar cache.

3. **Disponibilidad**: Si el panel cae, la API queda inaccesible (excepto en modo desarrollo).

4. **Rate Limiting**: El panel no tiene rate limiting. Considera agregarlo.

## 🆘 Problemas Comunes

### "ECONNREFUSED" al validar key

El panel no está corriendo. Inicia el panel:
```bash
cd panel-admin
npm start
```

### Key válida pero da error

Verifica que `PANEL_URL` en tu API apunte correctamente al panel.

### En producción no valida

Asegúrate de que ambos servicios (API y Panel) estén deployados y `PANEL_URL` esté configurado correctamente en Railway.

## 💡 Tips

1. **Prueba Local Primero**: Inicia el panel en 3001 y tu API en 8080
2. **Crea Key de Test**: Usa el panel para crear una key de prueba
3. **Verifica Logs**: Ambos servicios tienen logs detallados
4. **Modo Desarrollo**: El middleware permite acceso si el panel no responde

---

¿Necesitas ayuda? Contacta a los administradores:
- @zGatoO
- @choco_tete  
- @WinniePoohOFC

