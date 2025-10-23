/**
 * Script de pruebas básicas del panel
 * Ejecutar con: node test-basic.js
 */

console.log('🧪 Iniciando pruebas básicas...\n');

// Test 1: Verificar estructura de archivos
console.log('📁 Test 1: Verificar estructura de archivos');
const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'server.js',
  'package.json',
  'models/User.js',
  'models/ApiKey.js',
  'models/VerificationCode.js',
  'routes/keys.js',
  'routes/users.js',
  'routes/notifications.js',
  'routes/stats.js',
  'routes/profile.js',
  'middleware/keyValidator.js',
  'public/index.html',
  'public/css/style.css',
  'public/js/app.js'
];

let filesOK = true;
requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) filesOK = false;
});

if (filesOK) {
  console.log('✅ Todos los archivos requeridos están presentes\n');
} else {
  console.log('❌ Faltan algunos archivos\n');
  process.exit(1);
}

// Test 2: Verificar modelos
console.log('📦 Test 2: Verificar modelos');
try {
  const User = require('./models/User');
  const ApiKey = require('./models/ApiKey');
  const VerificationCode = require('./models/VerificationCode');
  console.log('  ✅ User model');
  console.log('  ✅ ApiKey model');
  console.log('  ✅ VerificationCode model');
  console.log('✅ Todos los modelos se cargan correctamente\n');
} catch (error) {
  console.log('❌ Error cargando modelos:', error.message, '\n');
  process.exit(1);
}

// Test 3: Verificar dependencias
console.log('📚 Test 3: Verificar dependencias');
const package = require('./package.json');
const requiredDeps = [
  'express',
  'mongoose',
  'bcryptjs',
  'jsonwebtoken',
  'cookie-parser',
  'cors',
  'dotenv',
  'axios'
];

let depsOK = true;
requiredDeps.forEach(dep => {
  const exists = package.dependencies[dep];
  console.log(`  ${exists ? '✅' : '❌'} ${dep}`);
  if (!exists) depsOK = false;
});

if (depsOK) {
  console.log('✅ Todas las dependencias están en package.json\n');
} else {
  console.log('❌ Faltan algunas dependencias\n');
  process.exit(1);
}

// Test 4: Verificar node_modules
console.log('📦 Test 4: Verificar instalación');
const nodeModulesExists = fs.existsSync(path.join(__dirname, 'node_modules'));
if (nodeModulesExists) {
  console.log('  ✅ node_modules existe');
  console.log('✅ Dependencias instaladas\n');
} else {
  console.log('  ❌ node_modules no existe');
  console.log('⚠️  Ejecuta: npm install\n');
}

// Test 5: Verificar configuración
console.log('⚙️  Test 5: Verificar configuración');
const envExample = fs.existsSync(path.join(__dirname, 'env.example.txt'));
const envFile = fs.existsSync(path.join(__dirname, '.env'));

console.log(`  ${envExample ? '✅' : '❌'} env.example.txt`);
console.log(`  ${envFile ? '✅' : '⚠️ '} .env ${!envFile ? '(no existe - crear para producción)' : ''}`);

if (!envFile) {
  console.log('\n💡 Para crear .env:');
  console.log('   1. Renombra env.example.txt a .env');
  console.log('   2. Configura MONGODB_URI y JWT_SECRET');
  console.log('   3. El panel funcionará sin .env en modo desarrollo\n');
}

// Test 6: Verificar rutas en server.js
console.log('🛣️  Test 6: Verificar rutas');
const serverContent = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
const routes = [
  '/api/auth/login',
  '/api/auth/register-client',
  '/api/keys',
  '/api/users',
  '/api/notifications',
  '/api/stats',
  '/api/profile'
];

let routesOK = true;
routes.forEach(route => {
  const exists = serverContent.includes(route);
  console.log(`  ${exists ? '✅' : '❌'} ${route}`);
  if (!exists) routesOK = false;
});

if (routesOK) {
  console.log('✅ Todas las rutas están configuradas\n');
} else {
  console.log('❌ Faltan algunas rutas\n');
}

// Resumen
console.log('═══════════════════════════════════════');
console.log('📊 RESUMEN DE PRUEBAS');
console.log('═══════════════════════════════════════');
console.log(`✅ Estructura de archivos: ${filesOK ? 'OK' : 'FALLO'}`);
console.log(`✅ Modelos: OK`);
console.log(`✅ Dependencias: ${depsOK ? 'OK' : 'FALLO'}`);
console.log(`${nodeModulesExists ? '✅' : '⚠️ '} Instalación: ${nodeModulesExists ? 'OK' : 'Ejecutar npm install'}`);
console.log(`${envFile ? '✅' : '⚠️ '} Configuración: ${envFile ? 'OK' : 'Crear .env (opcional)'}`);
console.log(`✅ Rutas: ${routesOK ? 'OK' : 'FALLO'}`);
console.log('═══════════════════════════════════════\n');

if (filesOK && depsOK && routesOK) {
  console.log('✅ ¡TODAS LAS PRUEBAS PASARON!\n');
  console.log('🚀 Para iniciar el panel:');
  console.log('   1. Asegúrate de tener MongoDB corriendo');
  console.log('   2. Ejecuta: npm start');
  console.log('   3. Abre: http://localhost:3001');
  console.log('   4. Login con: zGatoO / NmsK12\n');
  console.log('📖 Lee README.md para más información');
  console.log('🔗 Lee INTEGRATION_GUIDE.md para integrar con tu API\n');
  process.exit(0);
} else {
  console.log('❌ Algunas pruebas fallaron. Revisa los errores arriba.\n');
  process.exit(1);
}

