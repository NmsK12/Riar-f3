# 🚂 DESPLEGAR EN RAILWAY

## 📋 PREPARACIÓN

### 1. Verificar archivos necesarios
```bash
# Debes tener estos archivos en panel-admin/:
✅ Procfile
✅ railway.json
✅ package.json
✅ server.js
```

---

## 🚀 PASOS PARA DESPLEGAR

### 1. Crear cuenta en Railway
1. Ve a https://railway.app/
2. Regístrate con GitHub
3. Confirma tu email

### 2. Crear nuevo proyecto
1. Click en "New Project"
2. Selecciona "Deploy from GitHub repo"
3. Conecta tu repositorio `sisfoh-api`

### 3. Configurar variables de entorno
En Railway, ve a tu proyecto → Variables → Add Variables:

```bash
NODE_ENV=production
MONGODB_URI=<tu-mongodb-uri>
JWT_SECRET=<tu-secreto-jwt-super-seguro>
PORT=3001
API_URL=<url-de-tu-api-principal>
```

#### Para obtener MongoDB URI:
1. Ve a https://www.mongodb.com/cloud/atlas
2. Crea cluster gratuito
3. Ve a "Connect" → "Connect your application"
4. Copia la URI y reemplaza `<password>` con tu password

**Ejemplo:**
```
mongodb+srv://usuario:password@cluster.mongodb.net/apiPanel?retryWrites=true&w=majority
```

### 4. Especificar directorio (MUY IMPORTANTE)
Railway debe saber que el código está en `panel-admin/`:

**Opción A: En railway.json** (Ya está configurado)
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Opción B: Settings en Railway**
1. Ve a Settings
2. En "Root Directory" pon: `panel-admin`

### 5. Desplegar
1. Railway detectará los cambios automáticamente
2. Click en "Deploy"
3. Espera 2-3 minutos
4. ¡Listo!

---

## 🔗 CONECTAR CON API PRINCIPAL

### En la API principal (sisfoh-api):
Edita el archivo `.env`:

```bash
# .env en raíz del proyecto
PANEL_URL=https://tu-panel-admin.railway.app
```

**Ejemplo real:**
```bash
PANEL_URL=https://sisfoh-panel-production.railway.app
```

### Reiniciar API principal
```bash
# Si está en Railway, redeploy
# Si está local:
npm start
```

---

## 📊 VERIFICAR QUE FUNCIONA

### 1. Acceder al panel
Abre: `https://tu-panel-admin.railway.app`

### 2. Login
Usuario: `zGatoO`  
Password: `NmsK12`

### 3. Crear una key de prueba
1. Ve a "Mis Keys"
2. Crea key con:
   - Endpoint: DNI
   - Cantidad: 24
   - Unidad: horas

### 4. Probar en la API principal
```bash
curl "https://tu-api-principal.railway.app/dni?dni=80660244&key=TU_KEY_AQUI"
```

Si devuelve datos, ¡funciona! ✅

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Error: "Application failed to respond"
**Causa:** Puerto incorrecto  
**Solución:** En Railway, asegúrate que `PORT` esté configurado o usa `process.env.PORT`

### Error: "MongoNetworkError"
**Causa:** MongoDB URI incorrecta  
**Solución:** 
1. Verifica que el URI esté completo
2. Verifica que la IP de Railway esté en la whitelist de MongoDB (0.0.0.0/0)

### Error: Keys no funcionan en API principal
**Causa:** `PANEL_URL` no configurada  
**Solución:** Agrega `PANEL_URL` en las variables de entorno de la API principal

### No aparece el contador
**Causa:** Archivos CSS/JS no se cargaron  
**Solución:** Verifica que `public/` esté desplegado correctamente

---

## 📝 COMANDOS ÚTILES

### Ver logs en tiempo real
```bash
# En Railway:
# Ve a tu proyecto → Deployments → View Logs
```

### Redeploy manual
```bash
# En Railway:
# Click en los 3 puntos → Redeploy
```

### Ver variables de entorno
```bash
# En Railway:
# Click en Variables
```

---

## 🔒 SEGURIDAD

### Cambiar contraseñas por defecto
Después del primer despliegue:

1. Login como admin
2. Ve a "Mi Perfil"
3. Cambia password de:
   - zGatoO
   - chocotete
   - TheWinnie

### Cambiar JWT_SECRET
```bash
# Genera uno nuevo:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Copia el resultado y actualízalo en Railway
```

---

## 📦 ESTRUCTURA FINAL EN RAILWAY

```
Proyecto Railway: sisfoh-api
├── Service 1: API Principal (/)
│   └── Variables:
│       ├── NODE_ENV=production
│       ├── SEEKER_USER=...
│       ├── SEEKER_PASS=...
│       └── PANEL_URL=https://panel.railway.app
│
└── Service 2: Panel Admin (/panel-admin)
    └── Variables:
        ├── NODE_ENV=production
        ├── MONGODB_URI=mongodb+srv://...
        ├── JWT_SECRET=...
        ├── PORT=3001
        └── API_URL=https://api.railway.app
```

---

## ✅ CHECKLIST DE DESPLIEGUE

- [ ] Cuenta de Railway creada
- [ ] Repositorio conectado
- [ ] MongoDB Atlas configurado
- [ ] Variables de entorno configuradas
- [ ] Root directory = `panel-admin`
- [ ] Primer despliegue exitoso
- [ ] Login funciona
- [ ] Crear key funciona
- [ ] Contador se actualiza
- [ ] API principal conectada
- [ ] Validación de keys funciona
- [ ] Contraseñas cambiadas

---

## 🎉 ¡LISTO!

Tu panel admin está desplegado en Railway y completamente funcional.

**URLs importantes:**
- Panel Admin: `https://tu-panel.railway.app`
- API Principal: `https://tu-api.railway.app`
- MongoDB: `https://cloud.mongodb.com`

---

## 🆘 AYUDA ADICIONAL

### Railway Docs
https://docs.railway.app/

### MongoDB Atlas Docs
https://docs.atlas.mongodb.com/

### Verificar estado
```bash
# Panel Admin
curl https://tu-panel.railway.app/health

# API Principal
curl https://tu-api.railway.app/
```

