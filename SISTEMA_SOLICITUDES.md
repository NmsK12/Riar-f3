# 🛒 SISTEMA DE SOLICITUDES DE API KEYS

## 📋 ¿Cómo Funciona?

### Para Clientes:
1. **Solicitar Keys**: Elige qué endpoints necesitas y por cuánto tiempo
2. **Esperar Aprobación**: Tu solicitud se envía al admin/vendedor
3. **Recibir Keys**: Cuando aprueban, recibes las keys automáticamente

### Para Admins/Vendedores:
1. **Ver Solicitudes**: Lista de todas las solicitudes pendientes
2. **Aprobar**: Click en aprobar genera las keys automáticamente
3. **Rechazar**: Si no procede, puedes rechazar con motivo

---

## 🎯 Flujo Completo

```
CLIENTE                                    ADMIN/VENDEDOR
   │                                              │
   ├─ Entra a "Solicitar Keys"                   │
   ├─ Marca DNI (1 mes)                          │
   ├─ Marca TELP (1 mes)                         │
   ├─ Marca ARG (1 mes)                          │
   ├─ Click "Enviar Solicitud" ──────────────────▶ Ve notificación
   │                                              │
   ├─ Ve estado: "Pendiente"                     ├─ Entra a "Aprobar Solicitudes"
   │                                              ├─ Ve solicitud del cliente
   │                                              ├─ Click "Aprobar"
   │                                              ├─ Sistema genera 3 keys:
   │                                              │   • DNI key (1 mes)
   │                                              │   • TELP key (1 mes)
   │                                              │   • ARG key (1 mes)
   │                                              │
   ├─ Recibe notificación ◀──────────────────────┤
   ├─ Ve estado: "Aprobado"                      │
   ├─ Ve las 3 keys generadas                    │
   ├─ Copia y usa las keys                       │
   └─ ✅ Listo para usar la API                  └─ ✅ Cliente activado
```

---

## 🔑 Archivos Creados

### Backend:
- ✅ `models/KeyRequest.js` - Modelo de solicitudes
- ✅ `routes/keyRequests.js` - Rutas para solicitudes
- ✅ `server.js` - Ruta integrada

### Frontend:
- ✅ `public/index.html` - UI actualizada
- ⚠️ `public/js/app.js` - **FALTA completar** (ver abajo)

---

## 📝 Lo Que Falta por Hacer

### Agregar al archivo `public/js/app.js`:

Debes agregar estas funciones al final del archivo (antes del último cierre):

```javascript
// ===== SOLICITUDES DE KEYS =====

// Cargar formulario de solicitud
async function loadRequestsForm() {
    const container = document.getElementById('endpoints-request-container');
    const endpoints = [
        { id: 'dni', name: 'DNI', desc: 'Consulta de personas' },
        { id: 'telp', name: 'TELP', desc: 'Teléfonos' },
        { id: 'nom', name: 'NOM', desc: 'Búsqueda por nombres' },
        { id: 'arg', name: 'ARG', desc: 'Árbol genealógico' },
        { id: 'corr', name: 'CORR', desc: 'Correos electrónicos' },
        { id: 'risk', name: 'RISK', desc: 'Datos de riesgo' },
        { id: 'foto', name: 'FOTO', desc: 'Fotografías' },
        { id: 'sunat', name: 'SUNAT', desc: 'Datos laborales' },
        { id: 'meta', name: 'META', desc: 'Todos los datos' }
    ];

    container.innerHTML = endpoints.map(ep => `
        <div class="endpoint-request-item">
            <label class="checkbox-label">
                <input type="checkbox" name="endpoint-${ep.id}" value="${ep.id}">
                <strong>${ep.name}</strong> - ${ep.desc}
            </label>
            <select name="duration-${ep.id}" class="duration-select">
                <option value="1m">1 Mes</option>
                <option value="2m">2 Meses</option>
            </select>
        </div>
    `).join('');

    // Cargar mis solicitudes
    await loadMyRequests();
}

// Cargar mis solicitudes
async function loadMyRequests() {
    try {
        const response = await API.request('/api/key-requests');
        const requests = response.data || [];
        
        const container = document.getElementById('my-requests-list');
        
        if (requests.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No tienes solicitudes</p>';
            return;
        }

        container.innerHTML = requests.map(req => `
            <div class="request-item status-${req.status}">
                <div class="request-header">
                    <h4>Solicitud #${req._id.substring(0, 8)}</h4>
                    <span class="status-badge ${req.status}">${
                        req.status === 'pending' ? 'Pendiente' :
                        req.status === 'approved' ? 'Aprobado' : 'Rechazado'
                    }</span>
                </div>
                <div class="request-endpoints">
                    ${req.endpoints.map(ep => `
                        <span class="endpoint-badge">${ep.endpoint.toUpperCase()} (${ep.duration})</span>
                    `).join('')}
                </div>
                ${req.status === 'approved' && req.generatedKeys ? `
                    <div class="generated-keys">
                        <h5>Keys Generadas:</h5>
                        ${req.generatedKeys.map(gk => `
                            <div class="key-generated">
                                <strong>${gk.endpoint.toUpperCase()}:</strong>
                                <code>${gk.key}</code>
                                <button onclick="copyToClipboard('${gk.key}')" class="btn-copy">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                <small>Creado: ${new Date(req.createdAt).toLocaleString()}</small>
            </div>
        `).join('');
        
        // Actualizar badge
        const pendingCount = requests.filter(r => r.status === 'pending').length;
        document.getElementById('requests-count').textContent = pendingCount;
    } catch (error) {
        console.error('Error cargando solicitudes:', error);
    }
}

// Enviar solicitud
document.getElementById('request-keys-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const endpoints = [];
    
    // Recoger todos los endpoints seleccionados
    ['dni', 'telp', 'nom', 'arg', 'corr', 'risk', 'foto', 'sunat', 'meta'].forEach(ep => {
        const checkbox = formData.get(`endpoint-${ep}`);
        if (checkbox) {
            const duration = formData.get(`duration-${ep}`);
            endpoints.push({ endpoint: ep, duration });
        }
    });
    
    if (endpoints.length === 0) {
        UI.toast('Selecciona al menos un endpoint', 'warning');
        return;
    }
    
    try {
        const response = await API.request('/api/key-requests', {
            method: 'POST',
            body: JSON.stringify({ endpoints })
        });
        
        if (response.success) {
            UI.toast('Solicitud enviada exitosamente', 'success');
            e.target.reset();
            await loadMyRequests();
        }
    } catch (error) {
        UI.toast(error.message, 'error');
    }
});

// Cargar solicitudes pendientes (admin/vendedor)
async function loadPendingRequests() {
    try {
        const response = await API.request('/api/key-requests');
        const allRequests = response.data || [];
        const pendingRequests = allRequests.filter(r => r.status === 'pending');
        
        const container = document.getElementById('pending-requests-list');
        
        if (pendingRequests.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No hay solicitudes pendientes</p>';
            document.getElementById('pending-count').textContent = '0';
            return;
        }

        container.innerHTML = pendingRequests.map(req => `
            <div class="pending-request-card">
                <div class="request-info">
                    <h3>${req.username}</h3>
                    <p>Solicitud: ${new Date(req.createdAt).toLocaleString()}</p>
                    <div class="requested-endpoints">
                        ${req.endpoints.map(ep => `
                            <span class="endpoint-tag">${ep.endpoint.toUpperCase()} - ${ep.duration}</span>
                        `).join('')}
                    </div>
                </div>
                <div class="request-actions">
                    <button class="btn-approve" onclick="approveRequest('${req._id}')">
                        <i class="fas fa-check"></i> Aprobar
                    </button>
                    <button class="btn-reject" onclick="rejectRequest('${req._id}')">
                        <i class="fas fa-times"></i> Rechazar
                    </button>
                </div>
            </div>
        `).join('');
        
        document.getElementById('pending-count').textContent = pendingRequests.length;
    } catch (error) {
        console.error('Error cargando solicitudes pendientes:', error);
    }
}

// Aprobar solicitud
window.approveRequest = async (id) => {
    if (!confirm('¿Aprobar esta solicitud y generar las keys?')) return;
    
    try {
        const response = await API.request(`/api/key-requests/${id}/approve`, {
            method: 'POST'
        });
        
        if (response.success) {
            UI.toast(`Aprobado! ${response.data.keys.length} keys generadas`, 'success');
            await loadPendingRequests();
        }
    } catch (error) {
        UI.toast(error.message, 'error');
    }
};

// Rechazar solicitud
window.rejectRequest = async (id) => {
    const notes = prompt('Motivo del rechazo (opcional):');
    if (notes === null) return;
    
    try {
        const response = await API.request(`/api/key-requests/${id}/reject`, {
            method: 'POST',
            body: JSON.stringify({ notes })
        });
        
        if (response.success) {
            UI.toast('Solicitud rechazada', 'info');
            await loadPendingRequests();
        }
    } catch (error) {
        UI.toast(error.message, 'error');
    }
};

// Copiar al portapapeles
window.copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    UI.toast('Key copiada', 'success');
};

// Actualizar navegación para incluir las nuevas secciones
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        UI.showSection(section);
        
        if (section === 'requests') loadRequestsForm();
        else if (section === 'pending-requests') loadPendingRequests();
        // ... resto de secciones ...
    });
});
```

---

## 🎨 Estilos CSS Necesarios

Agregar al `public/css/style.css`:

```css
/* Solicitudes de Keys */
.request-form-container {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 25px;
    margin-bottom: 20px;
}

.info-box {
    background: rgba(0, 170, 255, 0.1);
    border: 1px solid var(--info);
    padding: 15px;
    border-radius: 5px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 15px;
}

.info-box i {
    font-size: 24px;
    color: var(--info);
}

.endpoint-request-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    background: var(--bg-darker);
    border-radius: 5px;
    margin-bottom: 10px;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--text-primary);
    cursor: pointer;
}

.duration-select {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    padding: 8px 12px;
    border-radius: 5px;
}

.request-item {
    background: var(--bg-darker);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 15px;
}

.request-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.endpoint-badge {
    background: var(--primary-purple);
    color: white;
    padding: 5px 12px;
    border-radius: 15px;
    font-size: 12px;
    margin-right: 8px;
}

.generated-keys {
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid var(--border-color);
}

.key-generated {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
}

.key-generated code {
    background: var(--bg-card);
    padding: 5px 10px;
    border-radius: 3px;
    color: var(--success);
    font-family: 'Courier New', monospace;
    flex: 1;
}

.btn-copy {
    background: none;
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    padding: 5px 10px;
    border-radius: 3px;
    cursor: pointer;
}

.btn-copy:hover {
    border-color: var(--primary-purple);
    color: var(--primary-purple);
}

.pending-request-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 20px;
    margin-bottom: 15px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.requested-endpoints {
    margin-top: 10px;
}

.endpoint-tag {
    background: rgba(157, 78, 221, 0.2);
    color: var(--light-purple);
    padding: 5px 10px;
    border-radius: 5px;
    font-size: 12px;
    margin-right: 8px;
}

.request-actions {
    display: flex;
    gap: 10px;
}

.btn-approve {
    background: var(--success);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
}

.btn-reject {
    background: var(--danger);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 5px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
}
```

---

## ✅ Para Completar la Implementación:

1. **Agregar el código JavaScript** al final de `public/js/app.js`
2. **Agregar los estilos CSS** a `public/css/style.css`
3. **Reiniciar el panel**: `npm start`
4. **Probar el flujo completo**

---

## 🎯 Cómo Usar (Cliente):

1. Login como cliente
2. Click en "Solicitar Keys"
3. Marca los endpoints que necesitas (ej: DNI, TELP, ARG)
4. Elige la duración para cada uno (1m o 2m)
5. Click "Enviar Solicitud"
6. Espera aprobación
7. Cuando aprueban, verás las keys en "Mis Solicitudes"
8. Copia las keys y úsalas en la API

---

## 🎯 Cómo Usar (Admin/Vendedor):

1. Login como admin/vendedor
2. Verás badge en "Aprobar Solicitudes" con el número pendiente
3. Click en "Aprobar Solicitudes"
4. Ve la lista de solicitudes
5. Click "Aprobar" para generar las keys automáticamente
6. El cliente recibe sus keys inmediatamente

---

¿Necesitas que pegue el código completo en los archivos o prefieres hacerlo manualmente? 🚀

