# ⚡ Inicio Rápido - Panel de Administración

Guía de 5 minutos para poner el panel en funcionamiento.

## 🎯 Opción 1: Sin Base de Datos (Prueba Rápida)

Para probar el panel sin configurar nada:

```bash
cd panel-admin
npm start
```

Abre http://localhost:3001 y... ¡eso es todo! 

**Nota**: Sin MongoDB, los datos no se guardarán, pero puedes navegar por la interfaz.

---

## 🚀 Opción 2: Con MongoDB Local (Recomendado)

### Paso 1: Instalar MongoDB

**Windows**:
```bash
# Descarga e instala desde: https://www.mongodb.com/try/download/community
```

**macOS**:
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux**:
```bash
sudo apt-get install mongodb
sudo systemctl start mongodb
```

### Paso 2: Iniciar el Panel

```bash
cd panel-admin
npm start
```

### Paso 3: Acceder

1. Abre: http://localhost:3001
2. Login como admin:
   - **Usuario**: `zGatoO`
   - **Contraseña**: `NmsK12`

¡Listo! Ahora puedes crear keys y usuarios.

---

## ☁️ Opción 3: Con MongoDB Atlas (Producción)

### Paso 1: Crear Cluster en MongoDB Atlas

1. Ve a https://www.mongodb.com/cloud/atlas
2. Crea cuenta gratuita
3. Crea un cluster (M0 gratis)
4. Obtén tu connection string

### Paso 2: Crear archivo .env

Renombra `env.example.txt` a `.env` y configura:

```env
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/panel-admin
JWT_SECRET=un-secreto-super-seguro-y-aleatorio-de-al-menos-32-caracteres
PORT=3001
NODE_ENV=production
```

### Paso 3: Iniciar

```bash
npm start
```

---

## 🧪 Verificar que Todo Funciona

Ejecuta el test:

```bash
node test-basic.js
```

Deberías ver todos ✅

---

## 📝 Primeros Pasos Después del Login

### Como Admin

1. **Ir a "API Keys"** → Crear tu primera key
2. **Ir a "Usuarios"** → Crear un vendedor o cliente de prueba
3. **Ir a "Dashboard"** → Ver estadísticas

### Crear tu Primera Key

1. Click en "API Keys" en el sidebar
2. Click en "Crear Nueva Key"
3. Selecciona:
   - Endpoint: `dni`
   - Duración: `1d` (1 día)
4. Click "Generar Key"
5. ¡Copia tu key!

### Probar la Key

```bash
# Sin key (debería dar error)
curl "http://localhost:8080/dni?dni=80660244"

# Con key (debería funcionar)
curl "http://localhost:8080/dni?dni=80660244&key=TU_KEY_AQUI"
```

**Nota**: Primero debes integrar el panel con tu API. Lee `INTEGRATION_GUIDE.md`

---

## 🔗 Integrar con tu API

El panel está listo, pero para que proteja tu API necesitas:

1. **Copiar el middleware** a tu API:
   ```bash
   cp middleware/keyValidator.js ../middleware/
   ```

2. **Modificar tu API** para usar el middleware

3. **Leer la guía completa**: `INTEGRATION_GUIDE.md`

---

## 🎨 Características del Panel

### Dashboard
- Ver estadísticas de keys y usuarios
- Lista de endpoints disponibles
- Keys próximas a vencer

### API Keys
- Crear keys con duración personalizada
- Ver todas tus keys
- Copiar y eliminar keys
- Ver endpoint y expiración

### Usuarios (Admin/Vendedor)
- Crear nuevos usuarios
- Asignar endpoints permitidos
- Configurar duración de acceso
- Ver y editar usuarios

### Notificaciones (Admin)
- Ver códigos de verificación pendientes
- Aprobar registros de clientes
- Aprobar verificaciones de IP

### Mi Perfil
- Cambiar tu contraseña
- Actualizar datos de contacto
- Ver tu rol y permisos

---

## 👥 Usuarios por Defecto

El panel crea 3 administradores automáticamente:

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| zGatoO | NmsK12 | Admin |
| chocotete | junior.45 | Admin |
| TheWinnie | Penecito89 | Admin |

---

## 🆘 Problemas Comunes

### "Cannot connect to MongoDB"

**Solución**: Inicia MongoDB o usa MongoDB Atlas.

En desarrollo, el panel funciona sin BD (los datos no se guardan).

### "Port 3001 already in use"

**Solución**: Cambia el puerto en `.env`:
```env
PORT=3002
```

### "Module not found"

**Solución**: Instala dependencias:
```bash
npm install
```

### No puedo hacer login

**Solución**: Necesitas MongoDB corriendo. Los usuarios se crean en la base de datos al iniciar.

---

## 📖 Siguientes Pasos

1. ✅ Panel funcionando
2. 📖 Lee `README.md` para documentación completa
3. 🔗 Lee `INTEGRATION_GUIDE.md` para integrar con tu API
4. 🚢 Lee sobre deploy en Railway en `README.md`

---

## 💡 Tips

- **Modo desarrollo**: El panel funciona sin BD para pruebas rápidas
- **MongoDB local**: Mejor para desarrollo, los datos se guardan
- **MongoDB Atlas**: Para producción, totalmente gratis con tier M0
- **Backup**: Exporta tu BD regularmente en producción

---

## 🎯 Checklist de Inicio

- [ ] Panel instalado (`npm install`)
- [ ] MongoDB corriendo (local o Atlas)
- [ ] Panel iniciado (`npm start`)
- [ ] Login exitoso en http://localhost:3001
- [ ] Primera key creada
- [ ] Middleware copiado a API principal
- [ ] API protegida con middleware
- [ ] Key probada en un endpoint

---

## 🌟 ¡Listo!

Ahora tienes un sistema completo de gestión de API Keys con:
- ✅ Panel web profesional
- ✅ Sistema de roles (Admin/Vendedor/Cliente)
- ✅ Keys con expiración automática
- ✅ Verificación de IP
- ✅ Notificaciones y códigos
- ✅ Diseño moderno estilo hacker

**¿Necesitas ayuda?** Contacta:
- @zGatoO
- @choco_tete
- @WinniePoohOFC

---

¡Disfruta tu nuevo panel de administración! 🎉

