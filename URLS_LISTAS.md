# 🔗 URLs LISTAS PARA USAR - v3.1

## ✅ NUEVA FUNCIONALIDAD

Ahora el panel genera automáticamente **URLs completas con tu API Key incluida** para cada endpoint.

---

## 🎯 ¿QUÉ ES?

En la sección **"Mis Keys"**, debajo de la tabla de keys, encontrarás una nueva sección llamada **"URLs Listas para Usar"**.

Esta sección muestra:
- ✅ URLs completas con tu key incluida
- ✅ Ejemplos para cada tipo de consulta
- ✅ Botón de copiado rápido
- ✅ Tiempo restante de la key

---

## 📸 EJEMPLO VISUAL

```
┌──────────────────────────────────────────────────┐
│ 🔑 DNI                    ⏰ Expira en 29d      │
├──────────────────────────────────────────────────┤
│ 🔍 DNI:                                          │
│ [https://tu-api.com/dni?dni=80660244&key=ABC]   │
│                                  [📋 Copiar]     │
│                                                  │
│ 🌳 ARG:                                          │
│ [https://tu-api.com/arg?dni=80660244&key=ABC]   │
│                                  [📋 Copiar]     │
└──────────────────────────────────────────────────┘
```

---

## 🚀 CÓMO USAR

### **1. Crea una Key**
- Ve a "Mis Keys"
- Click en "Crear Nueva Key"
- Selecciona endpoint (DNI, TEL, META, etc.)
- Elige duración

### **2. Copia la URL Lista**
Automáticamente verás las URLs listas debajo de la tabla.

**Ejemplo para endpoint DNI:**
```
https://sisfoh-api.up.railway.app/dni?dni=80660244&key=TU_KEY_REAL
```

**Solo cambia el DNI:**
```
https://sisfoh-api.up.railway.app/dni?dni=12345678&key=TU_KEY_REAL
```

### **3. Usa la URL**
- En tu navegador
- En Postman/Insomnia
- En tu aplicación
- En cURL:
```bash
curl "https://sisfoh-api.up.railway.app/dni?dni=80660244&key=TU_KEY"
```

---

## 📋 ENDPOINTS DISPONIBLES

### **DNI** - Consulta por documento
```
https://sisfoh-api.up.railway.app/dni?dni=80660244&key=TU_KEY
```
Retorna: Datos personales completos + foto

### **TELP** - Consulta por teléfono
```
https://sisfoh-api.up.railway.app/telp?tel=904684131&key=TU_KEY
```
Retorna: Teléfonos asociados + operador

### **NOM** - Búsqueda por nombres
```
https://sisfoh-api.up.railway.app/nom?nom=MARIA%20ELENA&key=TU_KEY
```
Retorna: Lista de personas con ese nombre

### **ARG** - Árbol genealógico
```
https://sisfoh-api.up.railway.app/arg?dni=80660244&key=TU_KEY
```
Retorna: Familiares directos

### **CORR** - Correos electrónicos
```
https://sisfoh-api.up.railway.app/corr?dni=80660244&key=TU_KEY
```
Retorna: Emails asociados

### **RISK** - Datos de riesgo
```
https://sisfoh-api.up.railway.app/risk?dni=80660244&key=TU_KEY
```
Retorna: Información de riesgo crediticio

### **FOTO** - Solo fotografía
```
https://sisfoh-api.up.railway.app/foto?dni=80660244&key=TU_KEY
```
Retorna: Foto en base64

### **SUNAT** - Datos laborales
```
https://sisfoh-api.up.railway.app/sunat?dni=80660244&key=TU_KEY
```
Retorna: Historial laboral SUNAT

### **META** - Todo junto
```
https://sisfoh-api.up.railway.app/meta?dni=80660244&key=TU_KEY
```
Retorna: TODOS los datos disponibles

---

## 🎨 CARACTERÍSTICAS

### **1. Copiado Rápido**
- Click en "Copiar" → URL en portapapeles
- Feedback visual: ✅ Copiado!
- Auto-selección al hacer click en el input

### **2. Ejemplos Dinámicos**
- Solo muestra endpoints de tu key
- Si tienes key "DNI" → Solo URLs de DNI
- Si tienes key "all" → URLs de TODOS los endpoints

### **3. Información de Expiración**
```
⏰ Expira en 29d
⏰ Expira en 5h
⏰ Expirado
```

### **4. Visual Atractivo**
- 🟣 Tema morado/negro hacker
- ✨ Animaciones suaves
- 📱 Responsive (mobile-friendly)

---

## 💡 CASOS DE USO

### **Caso 1: Integración Rápida**
```javascript
// En tu app
const DNI = "80660244";
const URL = `https://sisfoh-api.up.railway.app/dni?dni=${DNI}&key=${TU_KEY}`;

fetch(URL)
  .then(res => res.json())
  .then(data => console.log(data));
```

### **Caso 2: Pruebas Manuales**
1. Copia URL del panel
2. Pégala en el navegador
3. Cambia el DNI
4. Enter

### **Caso 3: Compartir con Equipo**
```
Hola equipo,
Usen esta URL para consultar DNIs:
https://sisfoh-api.up.railway.app/dni?dni=CAMBIAR_ESTE_DNI&key=ABC123XYZ

Reemplacen "CAMBIAR_ESTE_DNI" con el DNI real.
```

---

## 🔒 SEGURIDAD

### **⚠️ NUNCA COMPARTAS TU KEY**
- La key es personal
- No la subas a GitHub
- No la compartas públicamente
- Si se compromete, elimínala y crea una nueva

### **✅ Buenas Prácticas**
```javascript
// ❌ MAL
const API_KEY = "ABC123"; // Hardcodeado

// ✅ BIEN
const API_KEY = process.env.API_KEY; // Variable de entorno
```

---

## 📊 VENTAJAS

| Antes | Ahora |
|-------|-------|
| Construir URL manualmente | URL lista para copiar |
| Recordar formato | Ejemplos automáticos |
| Copiar key aparte | Key ya incluida |
| Confusión con parámetros | Todo claro y visible |

---

## 🎯 PRÓXIMAS MEJORAS

- [ ] Editor de parámetros en vivo
- [ ] Generador de código (JS, Python, cURL)
- [ ] Historial de consultas
- [ ] Testing directo desde el panel

---

## 🆘 SOPORTE

**Si las URLs no funcionan:**
1. Verifica que la key no haya expirado
2. Comprueba que la API esté en línea
3. Revisa que el endpoint sea correcto
4. Contacta: @zGatoO, @choco_tete, @WinniePoohOFC

---

## 🚀 ¡LISTO!

Ahora solo:
1. Crea una key
2. Copia la URL
3. Úsala donde quieras

**¡Es así de simple!** ✨

