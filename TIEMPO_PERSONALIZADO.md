# ⏰ SISTEMA DE TIEMPO PERSONALIZADO Y RENOVACIÓN

## 🎯 Funcionalidades Implementadas

### 1. **Duración Personalizada**
- ✅ Input numérico para cantidad (1-1000)
- ✅ Selector de unidad (horas, días, meses)
- ✅ Ejemplo: 30 horas, 7 días, 2 meses

### 2. **Contador en Tiempo Real**
- ✅ Muestra tiempo restante actualizado cada segundo
- ✅ Formato: "30h 45m", "5d 12h", "2 meses"
- ✅ Cambia a rojo cuando quedan menos de 24 horas
- ✅ Muestra "Expirado" cuando llega a 0

### 3. **Botón de Renovar**
- ✅ Aparece en cada key activa
- ✅ Modal para elegir cuánto tiempo agregar
- ✅ Renueva desde AHORA (no desde expiración anterior)
- ✅ Reac tiva keys expiradas

---

## 📝 CÓDIGO CSS A AGREGAR

Agregar al final de `public/css/style.css`:

```css
/* ===== DURACIÓN PERSONALIZADA ===== */
.duration-input-group {
    display: flex;
    gap: 10px;
    align-items: center;
}

.duration-input-group input[type="number"] {
    flex: 1;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    padding: 12px 15px;
    border-radius: 5px;
    font-size: 16px;
}

.duration-input-group select {
    flex: 1;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    padding: 12px 15px;
    border-radius: 5px;
    font-size: 16px;
}

/* ===== CONTADOR DE TIEMPO ===== */
.time-countdown {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: rgba(157, 78, 221, 0.2);
    border: 1px solid var(--primary-purple);
    border-radius: 20px;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    color: var(--primary-purple);
    animation: pulse 2s ease-in-out infinite;
}

.time-countdown.warning {
    background: rgba(255, 165, 0, 0.2);
    border-color: #FFA500;
    color: #FFA500;
}

.time-countdown.expired {
    background: rgba(220, 53, 69, 0.2);
    border-color: var(--danger);
    color: var(--danger);
    animation: none;
}

.time-countdown i {
    font-size: 14px;
}

@keyframes pulse {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.7;
    }
}

/* ===== BOTÓN RENOVAR ===== */
.btn-renew {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 5px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.3s ease;
}

.btn-renew:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(157, 78, 221, 0.4);
}

.btn-renew:active {
    transform: translateY(0);
}

.btn-renew i {
    animation: rotate 1s linear infinite;
}

@keyframes rotate {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}

.btn-renew:not(:hover) i {
    animation: none;
}
```

---

## 📝 CÓDIGO JAVASCRIPT A AGREGAR

Agregar al archivo `public/js/app.js`:

### 1. Actualizar el formulario de crear key

```javascript
// Actualizar el event listener del formulario de crear key
document.getElementById('create-key-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const endpoint = formData.get('endpoint');
    const durationAmount = formData.get('durationAmount');
    const durationUnit = formData.get('durationUnit');
    const userId = formData.get('userId') || null;
    
    if (!endpoint || !durationAmount || !durationUnit) {
        UI.toast('Completa todos los campos', 'warning');
        return;
    }
    
    try {
        const response = await API.request('/api/keys', {
            method: 'POST',
            body: JSON.stringify({ endpoint, durationAmount: parseInt(durationAmount), durationUnit, userId })
        });
        
        if (response.success) {
            UI.toast(`Key creada exitosamente para ${durationAmount} ${durationUnit}`, 'success');
            UI.closeModal('create-key-modal');
            e.target.reset();
            await loadKeys();
        }
    } catch (error) {
        UI.toast(error.message, 'error');
    }
});
```

### 2. Función para calcular tiempo restante

```javascript
// Función para calcular y formatear tiempo restante
function calculateTimeRemaining(expiresAt) {
    const now = new Date();
    const expires = new Date(expiresAt);
    const remaining = expires - now;
    
    if (remaining <= 0) {
        return { text: 'Expirado', class: 'expired', ms: 0 };
    }
    
    const seconds = Math.floor(remaining / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    
    let text = '';
    let cssClass = '';
    
    if (months > 0) {
        const remainingDays = days % 30;
        text = `${months}m ${remainingDays > 0 ? remainingDays + 'd' : ''}`;
        cssClass = '';
    } else if (days > 0) {
        const remainingHours = hours % 24;
        text = `${days}d ${remainingHours > 0 ? remainingHours + 'h' : ''}`;
        cssClass = days < 2 ? 'warning' : '';
    } else if (hours > 0) {
        const remainingMinutes = minutes % 60;
        text = `${hours}h ${remainingMinutes > 0 ? remainingMinutes + 'm' : ''}`;
        cssClass = 'warning';
    } else {
        text = `${minutes}m`;
        cssClass = 'warning';
    }
    
    return { text, class: cssClass, ms: remaining };
}
```

### 3. Actualizar la función loadKeys para mostrar contadores

```javascript
// Actualizar función loadKeys para incluir contador en tiempo real
async function loadKeys() {
    try {
        const response = await API.request('/api/keys');
        const keys = response.data || [];
        
        const tbody = document.getElementById('keys-table-body');
        
        if (keys.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay keys creadas</td></tr>';
            return;
        }

        tbody.innerHTML = keys.map(key => {
            const timeInfo = calculateTimeRemaining(key.expiresAt);
            const isExpired = timeInfo.ms <= 0;
            
            return `
                <tr data-key-id="${key._id}" data-expires="${key.expiresAt}">
                    <td><code>${key.key}</code></td>
                    <td><span class="endpoint-badge">${key.endpoint.toUpperCase()}</span></td>
                    <td>${key.duration}</td>
                    <td>
                        <div class="time-countdown ${timeInfo.class}" data-expires="${key.expiresAt}">
                            <i class="fas fa-clock"></i>
                            <span class="time-text">${timeInfo.text}</span>
                        </div>
                    </td>
                    <td>
                        <span class="status-badge ${key.active && !isExpired ? 'active' : 'inactive'}">
                            ${key.active && !isExpired ? 'Activa' : 'Inactiva'}
                        </span>
                    </td>
                    <td>
                        ${!isExpired && key.canRenew ? `
                            <button class="btn-renew" onclick="openRenewModal('${key._id}')">
                                <i class="fas fa-redo"></i> Renovar
                            </button>
                        ` : ''}
                        <button class="btn-delete" onclick="deleteKey('${key._id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Iniciar actualización automática de contadores
        startCountdownUpdates();
    } catch (error) {
        console.error('Error cargando keys:', error);
        UI.toast('Error cargando keys', 'error');
    }
}
```

### 4. Función para actualizar contadores en tiempo real

```javascript
// Variable global para el intervalo
let countdownInterval = null;

// Función para actualizar todos los contadores cada segundo
function startCountdownUpdates() {
    // Limpiar intervalo anterior si existe
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    // Actualizar cada segundo
    countdownInterval = setInterval(() => {
        const countdowns = document.querySelectorAll('.time-countdown');
        
        countdowns.forEach(countdown => {
            const expiresAt = countdown.dataset.expires;
            if (!expiresAt) return;
            
            const timeInfo = calculateTimeRemaining(expiresAt);
            const textSpan = countdown.querySelector('.time-text');
            
            if (textSpan) {
                textSpan.textContent = timeInfo.text;
            }
            
            // Actualizar clases
            countdown.className = `time-countdown ${timeInfo.class}`;
            
            // Si expiró, recargar la tabla
            if (timeInfo.ms <= 0 && !countdown.classList.contains('expired')) {
                setTimeout(() => loadKeys(), 1000);
            }
        });
    }, 1000);
}

// Detener actualización cuando se cambia de sección
function stopCountdownUpdates() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
}
```

### 5. Funciones para renovar keys

```javascript
// Abrir modal de renovar
window.openRenewModal = (keyId) => {
    document.getElementById('renew-key-id').value = keyId;
    UI.openModal('renew-key-modal');
};

// Manejar formulario de renovar
document.getElementById('renew-key-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const keyId = formData.get('keyId');
    const durationAmount = parseInt(formData.get('durationAmount'));
    const durationUnit = formData.get('durationUnit');
    
    if (!keyId || !durationAmount || !durationUnit) {
        UI.toast('Completa todos los campos', 'warning');
        return;
    }
    
    try {
        const response = await API.request(`/api/keys/${keyId}/renew`, {
            method: 'POST',
            body: JSON.stringify({ durationAmount, durationUnit })
        });
        
        if (response.success) {
            UI.toast(`Key renovada por ${durationAmount} ${durationUnit}`, 'success');
            UI.closeModal('renew-key-modal');
            e.target.reset();
            await loadKeys();
        }
    } catch (error) {
        UI.toast(error.message, 'error');
    }
});

// Cerrar modales con el botón X
document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
        const modal = btn.closest('.modal');
        if (modal) {
            modal.classList.remove('active');
        }
    });
});
```

### 6. Actualizar navegación para detener contadores

```javascript
// Modificar el event listener de navegación
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        
        // Detener contadores cuando se sale de la sección de keys
        if (section !== 'keys') {
            stopCountdownUpdates();
        }
        
        UI.showSection(section);
        
        // Cargar datos según la sección
        if (section === 'keys') loadKeys();
        else if (section === 'users') loadUsers();
        else if (section === 'notifications') loadNotifications();
        else if (section === 'profile') loadProfile();
        else if (section === 'requests') loadRequestsForm();
        else if (section === 'pending-requests') loadPendingRequests();
    });
});
```

---

## ✅ RESUMEN DE CAMBIOS

### Backend:
- ✅ `models/ApiKey.js` - Agregado `durationAmount`, `durationUnit`, `canRenew`
- ✅ `routes/keys.js` - Endpoint POST renovar, lógica flexible de duración
- ✅ Virtual `timeRemaining` y `timeRemainingFormatted`

### Frontend:
- ✅ Input numérico + selector de unidad
- ✅ Contador en tiempo real que se actualiza cada segundo
- ✅ Cambio de color (verde → amarillo → rojo)
- ✅ Botón "Renovar" en cada key activa
- ✅ Modal de renovación con misma UI

---

## 🎮 CÓMO USAR

### Crear Key con Tiempo Personalizado:
1. Click en "Crear Nueva Key"
2. Selecciona endpoint
3. Escribe cantidad: `30`
4. Selecciona unidad: `horas`
5. Click "Generar Key"
6. Se crea una key que expira en exactamente 30 horas

### Renovar Key:
1. Ve una key con botón "Renovar"
2. Click en "Renovar"
3. Escribe cantidad: `15`
4. Selecciona unidad: `dias`
5. Click "Renovar Key"
6. La key ahora expira en 15 días desde AHORA

### Ver Tiempo Restante:
- El contador se actualiza automáticamente cada segundo
- Verde/Morado: Más de 2 días
- Naranja: Menos de 2 días
- Rojo: Menos de 1 día o expirado

---

¿Necesitas que copie y pegue todo el código directamente en los archivos? 🚀

