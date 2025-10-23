// ===== ESTADO GLOBAL =====
// Version: 2.0.1 - Fix event listener duplicado
const state = {
    user: null,
    token: null,
    keys: [],
    users: [],
    notifications: []
};

// ===== API CLIENT =====
const API = {
    baseURL: window.location.origin,

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            credentials: 'include'
        };

        if (state.token) {
            config.headers['Authorization'] = `Bearer ${state.token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Error en la solicitud');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Auth
    login: (credentials) => API.request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
    }),

    verifyIP: (data) => API.request('/api/auth/verify-ip', {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    registerClient: (data) => API.request('/api/auth/register-client', {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    // Keys
    getKeys: () => API.request('/api/keys'),
    createKey: (data) => API.request('/api/keys', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    deleteKey: (id) => API.request(`/api/keys/${id}`, {
        method: 'DELETE'
    }),

    // Users
    getUsers: () => API.request('/api/users'),
    createUser: (data) => API.request('/api/users', {
        method: 'POST',
        body: JSON.stringify(data)
    }),
    updateUser: (id, data) => API.request(`/api/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    }),
    deleteUser: (id) => API.request(`/api/users/${id}`, {
        method: 'DELETE'
    }),

    // Notifications
    getNotifications: () => API.request('/api/notifications'),
    approveCode: (code) => API.request('/api/notifications/approve', {
        method: 'POST',
        body: JSON.stringify({ code })
    }),

    // Stats
    getStats: () => API.request('/api/stats'),

    // Profile
    updateProfile: (data) => API.request('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(data)
    })
};

// ===== UI UTILITIES =====
const UI = {
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    },

    showSection(sectionId) {
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${sectionId}-section`).classList.add('active');

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionId}"]`)?.classList.add('active');
    },

    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    },

    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    },

    toast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        toast.innerHTML = `
            <i class="fas ${icons[type]}"></i>
            <div class="toast-content">${message}</div>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 5000);
    },

    updateUserDisplay() {
        if (!state.user) return;

        const avatar = document.getElementById('user-avatar');
        const name = document.getElementById('user-name');
        const role = document.getElementById('user-role');

        avatar.textContent = state.user.username.charAt(0).toUpperCase();
        name.textContent = state.user.username;
        role.textContent = state.user.role;

        // Ocultar elementos solo admin
        const isAdmin = state.user.role === 'admin';
        const isVendor = state.user.role === 'vendedor';

        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = isAdmin ? '' : 'none';
        });

        document.querySelectorAll('.admin-vendor-only').forEach(el => {
            el.style.display = (isAdmin || isVendor) ? '' : 'none';
        });
    }
};

// ===== LOGIN =====
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const credentials = {
        username: formData.get('username'),
        password: formData.get('password'),
        role: formData.get('role')
    };

    try {
        const response = await API.login(credentials);

        if (response.needsVerification) {
            // Ocultar formulario de login y mostrar formulario de verificación
            document.getElementById('login-form').classList.add('hidden');
            document.getElementById('verification-form').classList.remove('hidden');
            document.getElementById('verification-form').dataset.username = credentials.username;
            
            // NO mostrar el código al usuario - solo los admins lo tienen
            UI.toast('🔒 Código de verificación enviado a los administradores. Contáctalos por Telegram.', 'warning');
        } else if (response.success) {
            state.user = response.user;
            state.token = response.token;
            localStorage.setItem('token', response.token);
            UI.showScreen('dashboard-screen');
            UI.updateUserDisplay();
            await loadDashboard();
            UI.toast('¡Bienvenido!', 'success');
        }
    } catch (error) {
        UI.toast(error.message, 'error');
    }
});

// ===== VERIFICACIÓN IP =====
document.getElementById('verify-ip-btn')?.addEventListener('click', async () => {
    const code = document.getElementById('verification-code').value;
    const username = document.getElementById('verification-form').dataset.username;

    if (!code) {
        UI.toast('Ingresa el código de verificación', 'warning');
        return;
    }

    try {
        const response = await API.verifyIP({ username, code });
        
        if (response.success) {
            state.token = response.token;
            localStorage.setItem('token', response.token);
            UI.showScreen('dashboard-screen');
            UI.updateUserDisplay();
            await loadDashboard();
            UI.toast('IP verificada correctamente', 'success');
        }
    } catch (error) {
        UI.toast(error.message, 'error');
    }
});

// ===== REGISTRO =====
document.getElementById('show-register')?.addEventListener('click', (e) => {
    e.preventDefault();
    UI.showScreen('register-screen');
});

document.getElementById('back-to-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    UI.showScreen('login-screen');
});

document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Confirmación
    const confirmed = confirm('¿Estás seguro que quieres solicitar acceso ahora mismo?\n\nSi solicitas acceso pero no compras, serás BLOQUEADO y REPORTADO.');
    if (!confirmed) return;

    const formData = new FormData(e.target);
    const data = {
        username: formData.get('username'),
        password: formData.get('password'),
        telegram: formData.get('telegram'),
        phone: formData.get('phone'),
        fullName: formData.get('fullName')
    };

    try {
        const response = await API.registerClient(data);
        
        if (response.success) {
            const adminsList = response.admins.join(', ');
            alert(`¡Solicitud enviada!\n\nTu código de registro es: ${response.code}\n\nContacta a un administrador:\n${adminsList}\n\nProporciona tu usuario de Telegram (${data.telegram}) para que te contacten con el método de pago.`);
            UI.showScreen('login-screen');
            UI.toast('Solicitud enviada. Espera la aprobación de un admin', 'success');
        }
    } catch (error) {
        UI.toast(error.message, 'error');
    }
});

// ===== LOGOUT =====
document.getElementById('logout-btn')?.addEventListener('click', () => {
    if (confirm('¿Seguro que quieres cerrar sesión?')) {
        state.user = null;
        state.token = null;
        localStorage.removeItem('token');
        UI.showScreen('login-screen');
        UI.toast('Sesión cerrada', 'info');
    }
});

// ===== NAVEGACIÓN =====
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        UI.showSection(section);
        
        // Cargar datos según la sección
        if (section === 'keys') loadKeys();
        else if (section === 'users') loadUsers();
        else if (section === 'notifications') loadNotifications();
        else if (section === 'profile') loadProfile();
    });
});

// ===== MODALES =====
document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
        btn.closest('.modal').classList.remove('active');
    });
});

// Cerrar modal al hacer click fuera
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// ===== DASHBOARD =====
async function loadDashboard() {
    try {
        // Cargar endpoints
        const endpoints = [
            { id: 'dni', icon: 'fa-id-card', name: 'DNI', desc: 'Consulta de personas' },
            { id: 'telp', icon: 'fa-phone', name: 'TELP', desc: 'Teléfonos' },
            { id: 'nom', icon: 'fa-user', name: 'NOM', desc: 'Búsqueda por nombres' },
            { id: 'arg', icon: 'fa-sitemap', name: 'ARG', desc: 'Árbol genealógico' },
            { id: 'corr', icon: 'fa-envelope', name: 'CORR', desc: 'Correos electrónicos' },
            { id: 'risk', icon: 'fa-exclamation-triangle', name: 'RISK', desc: 'Datos de riesgo' },
            { id: 'foto', icon: 'fa-camera', name: 'FOTO', desc: 'Fotografías' },
            { id: 'sunat', icon: 'fa-building', name: 'SUNAT', desc: 'Datos laborales' },
            { id: 'meta', icon: 'fa-database', name: 'META', desc: 'Todos los datos' }
        ];

        const endpointsGrid = document.getElementById('endpoints-grid');
        endpointsGrid.innerHTML = endpoints.map(ep => `
            <div class="endpoint-card" data-endpoint="${ep.id}">
                <i class="fas ${ep.icon}"></i>
                <h3>${ep.name}</h3>
                <p>${ep.desc}</p>
            </div>
        `).join('');

        // Eventos para crear key desde endpoint
        document.querySelectorAll('.endpoint-card').forEach(card => {
            card.addEventListener('click', () => {
                const endpoint = card.dataset.endpoint;
                document.getElementById('key-endpoint').value = endpoint;
                UI.showModal('create-key-modal');
            });
        });

        // Cargar stats si hay conexión a BD
        try {
            const stats = await API.getStats();
            if (stats.success) {
                document.getElementById('total-keys').textContent = stats.data.totalKeys || 0;
                document.getElementById('total-users').textContent = stats.data.totalUsers || 0;
                document.getElementById('active-endpoints').textContent = stats.data.activeEndpoints || 0;
                document.getElementById('expiring-keys').textContent = stats.data.expiringKeys || 0;
            }
        } catch (error) {
            console.log('Stats no disponibles (esperado sin BD)');
        }

        // Cargar notificaciones si es admin
        if (state.user.role === 'admin') {
            loadNotifications();
        }

        // Cargar keys
        await loadKeys();

    } catch (error) {
        console.error('Error cargando dashboard:', error);
    }
}

// ===== KEYS =====
async function loadKeys() {
    try {
        const response = await API.getKeys();
        state.keys = response.data || [];
        renderKeysTable();
    } catch (error) {
        console.error('Error cargando keys:', error);
        UI.toast('Error cargando keys', 'error');
    }
}

function renderKeysTable() {
    const tbody = document.getElementById('keys-table-body');
    
    if (state.keys.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">No hay keys creadas</td></tr>';
        return;
    }

    tbody.innerHTML = state.keys.map(key => {
        const isExpired = new Date(key.expiresAt) < new Date();
        const status = isExpired ? 'expired' : (key.active ? 'active' : 'inactive');
        const statusText = isExpired ? 'Expirada' : (key.active ? 'Activa' : 'Inactiva');

        return `
            <tr>
                <td><code style="color: var(--success);">${key.key}</code></td>
                <td><span style="color: var(--primary-purple);">${key.endpoint.toUpperCase()}</span></td>
                <td>${key.duration}</td>
                <td>${new Date(key.expiresAt).toLocaleString()}</td>
                <td><span class="status-badge ${status}">${statusText}</span></td>
                <td>
                    <button class="action-btn" onclick="copyKey('${key.key}')">
                        <i class="fas fa-copy"></i> Copiar
                    </button>
                    <button class="action-btn danger" onclick="deleteKey('${key._id}')">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Botón crear key
document.getElementById('create-key-btn')?.addEventListener('click', () => {
    UI.showModal('create-key-modal');
});

// Copiar key
window.copyKey = (key) => {
    navigator.clipboard.writeText(key);
    UI.toast('Key copiada al portapapeles', 'success');
};

// Eliminar key
window.deleteKey = async (id) => {
    if (!confirm('¿Seguro que quieres eliminar esta key?')) return;

    try {
        await API.deleteKey(id);
        UI.toast('Key eliminada', 'success');
        await loadKeys();
    } catch (error) {
        UI.toast(error.message, 'error');
    }
};

// ===== USERS =====
async function loadUsers() {
    if (state.user.role !== 'admin' && state.user.role !== 'vendedor') return;

    try {
        const response = await API.getUsers();
        state.users = response.data || [];
        renderUsersTable();
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        UI.toast('Error cargando usuarios', 'error');
    }
}

function renderUsersTable() {
    const tbody = document.getElementById('users-table-body');
    
    if (state.users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">No hay usuarios</td></tr>';
        return;
    }

    tbody.innerHTML = state.users.map(user => {
        const isExpired = user.expiresAt && new Date(user.expiresAt) < new Date();
        const status = isExpired ? 'expired' : (user.active ? 'active' : 'inactive');
        const statusText = isExpired ? 'Expirado' : (user.active ? 'Activo' : 'Inactivo');
        const expiresText = user.expiresAt ? new Date(user.expiresAt).toLocaleString() : 'Permanente';

        return `
            <tr>
                <td>${user.username}</td>
                <td><span style="text-transform: uppercase; color: var(--primary-purple);">${user.role}</span></td>
                <td>${user.telegram}</td>
                <td><span class="status-badge ${status}">${statusText}</span></td>
                <td>${expiresText}</td>
                <td>
                    <button class="action-btn" onclick="editUser('${user._id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    ${user.role !== 'admin' ? `
                        <button class="action-btn danger" onclick="deleteUser('${user._id}')">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

// Botón crear usuario
document.getElementById('create-user-btn')?.addEventListener('click', () => {
    // Llenar checkboxes de endpoints
    const checkboxesContainer = document.getElementById('endpoints-checkboxes');
    const endpoints = ['dni', 'telp', 'nom', 'arg', 'corr', 'risk', 'foto', 'sunat', 'meta'];
    
    checkboxesContainer.innerHTML = endpoints.map(ep => `
        <label>
            <input type="checkbox" name="endpoints" value="${ep}">
            ${ep.toUpperCase()}
        </label>
    `).join('');

    UI.showModal('create-user-modal');
});

// Formulario crear usuario
document.getElementById('create-user-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const endpoints = Array.from(e.target.querySelectorAll('input[name="endpoints"]:checked'))
        .map(cb => cb.value);

    const data = {
        username: formData.get('username'),
        password: formData.get('password'),
        role: formData.get('role'),
        telegram: formData.get('telegram'),
        duration: formData.get('duration'),
        allowedEndpoints: endpoints
    };

    try {
        const response = await API.createUser(data);
        
        if (response.success) {
            UI.toast('Usuario creado exitosamente', 'success');
            UI.hideModal('create-user-modal');
            e.target.reset();
            await loadUsers();
        }
    } catch (error) {
        UI.toast(error.message, 'error');
    }
});

// Editar usuario
window.editUser = async (id) => {
    const user = state.users.find(u => u._id === id);
    if (!user) {
        UI.toast('Usuario no encontrado', 'error');
        return;
    }
    
    // Mostrar opciones
    const action = prompt(`Editar usuario: ${user.username}\n\n1 = Activar/Desactivar\n2 = Cambiar duración\n3 = Editar endpoints\n\nElige una opción:`, '1');
    
    if (!action) return;
    
    if (action === '1') {
        const newStatus = !user.active;
        try {
            await API.updateUser(id, { active: newStatus });
            UI.toast(`Usuario ${newStatus ? 'activado' : 'desactivado'} exitosamente`, 'success');
            await loadUsers();
        } catch (error) {
            UI.toast(error.message, 'error');
        }
    } else if (action === '2') {
        const duration = prompt('Nueva duración:\n1d = 1 día\n7d = 7 días\n1m = 1 mes\n2m = 2 meses\n6m = 6 meses\n1y = 1 año\npermanent = Permanente', '1m');
        if (duration) {
            try {
                await API.updateUser(id, { duration });
                UI.toast('Duración actualizada', 'success');
                await loadUsers();
            } catch (error) {
                UI.toast(error.message, 'error');
            }
        }
    } else if (action === '3') {
        const endpointsInput = prompt('Endpoints permitidos (separados por coma):\ndni, telp, nom, arg, corr, risk, foto, sunat, meta\n\nActuales: ' + (user.allowedEndpoints || []).join(', '), (user.allowedEndpoints || []).join(','));
        if (endpointsInput !== null) {
            const allowedEndpoints = endpointsInput ? endpointsInput.split(',').map(e => e.trim()) : [];
            try {
                await API.updateUser(id, { allowedEndpoints });
                UI.toast('Endpoints actualizados', 'success');
                await loadUsers();
            } catch (error) {
                UI.toast(error.message, 'error');
            }
        }
    }
};

// Eliminar usuario
window.deleteUser = async (id) => {
    if (!confirm('¿Seguro que quieres eliminar este usuario?')) return;

    try {
        await API.deleteUser(id);
        UI.toast('Usuario eliminado', 'success');
        await loadUsers();
    } catch (error) {
        UI.toast(error.message, 'error');
    }
};

// ===== NOTIFICACIONES =====
async function loadNotifications() {
    if (state.user.role !== 'admin') return;

    try {
        const response = await API.getNotifications();
        state.notifications = response.data || [];
        renderNotifications();
        
        // Actualizar badge
        const count = state.notifications.filter(n => !n.used).length;
        document.getElementById('notification-count').textContent = count;
    } catch (error) {
        console.error('Error cargando notificaciones:', error);
    }
}

function renderNotifications() {
    const container = document.getElementById('notifications-list');
    
    if (state.notifications.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No hay notificaciones</p>';
        return;
    }

    container.innerHTML = state.notifications.map(notif => `
        <div class="notification-item ${notif.used ? 'opacity-50' : ''}">
            <div class="notification-content">
                <h3>${notif.type === 'ip_verification' ? '🔒 Verificación de IP' : 
                     notif.type === 'client_registration' ? '👤 Registro de Cliente' : 
                     '💼 Creación de Cliente por Vendedor'}</h3>
                <p>${notif.metadata?.username || 'Usuario'} - ${new Date(notif.createdAt).toLocaleString()}</p>
                ${notif.metadata?.telegram ? `<p>Telegram: ${notif.metadata.telegram}</p>` : ''}
            </div>
            <div class="notification-code">${notif.code}</div>
            ${!notif.used ? `
                <button class="btn-primary" onclick="approveCode('${notif.code}')">
                    <i class="fas fa-check"></i> Aprobar
                </button>
            ` : '<span style="color: var(--success);">✓ Aprobado</span>'}
            <button class="btn-delete-notification" onclick="deleteNotification('${notif._id}')">
                <i class="fas fa-trash"></i> Eliminar
            </button>
        </div>
    `).join('');
}

// Eliminar notificación individual
window.deleteNotification = async (id) => {
    if (!confirm('¿Eliminar esta notificación?')) return;
    
    try {
        const response = await API.request(`/api/notifications/${id}`, {
            method: 'DELETE'
        });
        
        if (response.success) {
            UI.toast('Notificación eliminada', 'success');
            await loadNotifications();
        }
    } catch (error) {
        UI.toast(error.message, 'error');
    }
};

// Limpiar todas las notificaciones
document.getElementById('clear-all-notifications-btn')?.addEventListener('click', async () => {
    if (!confirm('¿Estás seguro de eliminar TODAS las notificaciones?\n\nEsta acción no se puede deshacer.')) return;
    
    try {
        const response = await API.request('/api/notifications', {
            method: 'DELETE'
        });
        
        if (response.success) {
            UI.toast(`${response.deletedCount} notificaciones eliminadas`, 'success');
            await loadNotifications();
        }
    } catch (error) {
        UI.toast(error.message, 'error');
    }
});

// Aprobar código
window.approveCode = async (code) => {
    // Mostrar opciones de configuración
    const duration = prompt('Duración del acceso:\n1d = 1 día\n7d = 7 días\n1m = 1 mes\n2m = 2 meses\n6m = 6 meses\n1y = 1 año\npermanent = Permanente', '1m');
    
    if (!duration) return;
    
    const endpointsInput = prompt('Endpoints permitidos (separados por coma):\ndni, telp, nom, arg, corr, risk, foto, sunat, meta\n\nDeja vacío para permitir todos:', 'dni,telp,nom,arg,corr,risk,foto,sunat,meta');
    
    const allowedEndpoints = endpointsInput ? endpointsInput.split(',').map(e => e.trim()) : [];
    
    try {
        const response = await fetch('/api/notifications/approve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            credentials: 'include',
            body: JSON.stringify({ code, duration, allowedEndpoints })
        });
        
        const data = await response.json();
        
        if (data.success) {
            UI.toast('Usuario activado y código aprobado exitosamente', 'success');
            await loadNotifications();
            await loadUsers(); // Recargar usuarios para ver el cambio
        } else {
            UI.toast(data.message, 'error');
        }
    } catch (error) {
        UI.toast(error.message, 'error');
    }
};

// ===== PERFIL =====
function loadProfile() {
    if (!state.user) return;

    document.getElementById('profile-username').value = state.user.username;
    document.getElementById('profile-role').value = state.user.role;
    document.getElementById('profile-telegram').value = state.user.telegram || '';
}

document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        telegram: formData.get('telegram'),
        password: formData.get('password') || undefined
    };

    try {
        await API.updateProfile(data);
        UI.toast('Perfil actualizado', 'success');
    } catch (error) {
        UI.toast(error.message, 'error');
    }
});

// ===== TIEMPO PERSONALIZADO Y RENOVACIÓN =====

// Variable global para el intervalo del contador
let countdownInterval = null;

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
        text = `${months}m ${remainingDays > 0 ? remainingDays + 'd' : ''}`.trim();
        cssClass = '';
    } else if (days > 0) {
        const remainingHours = hours % 24;
        text = `${days}d ${remainingHours > 0 ? remainingHours + 'h' : ''}`.trim();
        cssClass = days < 2 ? 'warning' : '';
    } else if (hours > 0) {
        const remainingMinutes = minutes % 60;
        text = `${hours}h ${remainingMinutes > 0 ? remainingMinutes + 'm' : ''}`.trim();
        cssClass = 'warning';
    } else {
        text = `${minutes}m`;
        cssClass = 'warning';
    }
    
    return { text, class: cssClass, ms: remaining };
}

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
        
        // Renderizar URLs listas
        renderReadyUrls(keys);
    } catch (error) {
        console.error('Error cargando keys:', error);
        UI.toast('Error cargando keys', 'error');
    }
}

// Renderizar URLs listas para copiar
function renderReadyUrls(keys) {
    const container = document.getElementById('ready-urls-list');
    const API_BASE_URL = process.env.API_URL || 'https://sisfoh-api.up.railway.app';
    
    const activeKeys = keys.filter(k => {
        const timeInfo = calculateTimeRemaining(k.expiresAt);
        return k.active && timeInfo.ms > 0;
    });
    
    if (activeKeys.length === 0) {
        container.innerHTML = `
            <div class="no-keys-message">
                <i class="fas fa-info-circle"></i>
                <p>No tienes keys activas. Crea una key para ver las URLs listas para usar.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = activeKeys.map(key => {
        const timeInfo = calculateTimeRemaining(key.expiresAt);
        const endpoint = key.endpoint;
        
        // Generar ejemplos de URLs según el endpoint
        let examples = '';
        
        if (endpoint === 'dni' || endpoint === 'all') {
            examples += `
                <div class="url-example-item">
                    <span class="url-label">🔍 DNI:</span>
                    <div class="url-input-group">
                        <input type="text" class="url-input" readonly value="${API_BASE_URL}/dni?dni=80660244&key=${key.key}" onclick="this.select()">
                        <button class="btn-copy-url" onclick="copyUrl(this, '${API_BASE_URL}/dni?dni=80660244&key=${key.key}')">
                            <i class="fas fa-copy"></i> Copiar
                        </button>
                    </div>
                </div>
            `;
        }
        
        if (endpoint === 'telp' || endpoint === 'all') {
            examples += `
                <div class="url-example-item">
                    <span class="url-label">📱 TEL:</span>
                    <div class="url-input-group">
                        <input type="text" class="url-input" readonly value="${API_BASE_URL}/telp?tel=904684131&key=${key.key}" onclick="this.select()">
                        <button class="btn-copy-url" onclick="copyUrl(this, '${API_BASE_URL}/telp?tel=904684131&key=${key.key}')">
                            <i class="fas fa-copy"></i> Copiar
                        </button>
                    </div>
                </div>
            `;
        }
        
        if (endpoint === 'nom' || endpoint === 'all') {
            examples += `
                <div class="url-example-item">
                    <span class="url-label">👤 NOM:</span>
                    <div class="url-input-group">
                        <input type="text" class="url-input" readonly value="${API_BASE_URL}/nom?nom=MARIA%20ELENA&key=${key.key}" onclick="this.select()">
                        <button class="btn-copy-url" onclick="copyUrl(this, '${API_BASE_URL}/nom?nom=MARIA%20ELENA&key=${key.key}')">
                            <i class="fas fa-copy"></i> Copiar
                        </button>
                    </div>
                </div>
            `;
        }
        
        if (endpoint === 'arg' || endpoint === 'all') {
            examples += `
                <div class="url-example-item">
                    <span class="url-label">🌳 ARG:</span>
                    <div class="url-input-group">
                        <input type="text" class="url-input" readonly value="${API_BASE_URL}/arg?dni=80660244&key=${key.key}" onclick="this.select()">
                        <button class="btn-copy-url" onclick="copyUrl(this, '${API_BASE_URL}/arg?dni=80660244&key=${key.key}')">
                            <i class="fas fa-copy"></i> Copiar
                        </button>
                    </div>
                </div>
            `;
        }
        
        if (endpoint === 'corr' || endpoint === 'all') {
            examples += `
                <div class="url-example-item">
                    <span class="url-label">📧 CORR:</span>
                    <div class="url-input-group">
                        <input type="text" class="url-input" readonly value="${API_BASE_URL}/corr?dni=80660244&key=${key.key}" onclick="this.select()">
                        <button class="btn-copy-url" onclick="copyUrl(this, '${API_BASE_URL}/corr?dni=80660244&key=${key.key}')">
                            <i class="fas fa-copy"></i> Copiar
                        </button>
                    </div>
                </div>
            `;
        }
        
        if (endpoint === 'risk' || endpoint === 'all') {
            examples += `
                <div class="url-example-item">
                    <span class="url-label">⚠️ RISK:</span>
                    <div class="url-input-group">
                        <input type="text" class="url-input" readonly value="${API_BASE_URL}/risk?dni=80660244&key=${key.key}" onclick="this.select()">
                        <button class="btn-copy-url" onclick="copyUrl(this, '${API_BASE_URL}/risk?dni=80660244&key=${key.key}')">
                            <i class="fas fa-copy"></i> Copiar
                        </button>
                    </div>
                </div>
            `;
        }
        
        if (endpoint === 'foto' || endpoint === 'all') {
            examples += `
                <div class="url-example-item">
                    <span class="url-label">📷 FOTO:</span>
                    <div class="url-input-group">
                        <input type="text" class="url-input" readonly value="${API_BASE_URL}/foto?dni=80660244&key=${key.key}" onclick="this.select()">
                        <button class="btn-copy-url" onclick="copyUrl(this, '${API_BASE_URL}/foto?dni=80660244&key=${key.key}')">
                            <i class="fas fa-copy"></i> Copiar
                        </button>
                    </div>
                </div>
            `;
        }
        
        if (endpoint === 'sunat' || endpoint === 'all') {
            examples += `
                <div class="url-example-item">
                    <span class="url-label">💼 SUNAT:</span>
                    <div class="url-input-group">
                        <input type="text" class="url-input" readonly value="${API_BASE_URL}/sunat?dni=80660244&key=${key.key}" onclick="this.select()">
                        <button class="btn-copy-url" onclick="copyUrl(this, '${API_BASE_URL}/sunat?dni=80660244&key=${key.key}')">
                            <i class="fas fa-copy"></i> Copiar
                        </button>
                    </div>
                </div>
            `;
        }
        
        if (endpoint === 'meta' || endpoint === 'all') {
            examples += `
                <div class="url-example-item">
                    <span class="url-label">🔥 META:</span>
                    <div class="url-input-group">
                        <input type="text" class="url-input" readonly value="${API_BASE_URL}/meta?dni=80660244&key=${key.key}" onclick="this.select()">
                        <button class="btn-copy-url" onclick="copyUrl(this, '${API_BASE_URL}/meta?dni=80660244&key=${key.key}')">
                            <i class="fas fa-copy"></i> Copiar
                        </button>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="url-ready-item">
                <div class="url-header">
                    <span class="url-endpoint-badge">
                        <i class="fas fa-key"></i> ${endpoint.toUpperCase()}
                    </span>
                    <span class="url-expiry">
                        <i class="fas fa-clock"></i> Expira en ${timeInfo.text}
                    </span>
                </div>
                <div class="url-examples">
                    ${examples}
                </div>
                <div class="url-note">
                    <i class="fas fa-info-circle"></i>
                    <span>Reemplaza "80660244" con el DNI/teléfono real que quieres consultar.</span>
                </div>
            </div>
        `;
    }).join('');
}

// Copiar URL y mostrar feedback visual
window.copyUrl = (button, url) => {
    navigator.clipboard.writeText(url);
    const originalHtml = button.innerHTML;
    button.innerHTML = '<i class="fas fa-check"></i> Copiado!';
    button.classList.add('copied');
    
    setTimeout(() => {
        button.innerHTML = originalHtml;
        button.classList.remove('copied');
    }, 2000);
    
    UI.toast('URL copiada al portapapeles', 'success');
}

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

// Formulario crear key con tiempo personalizado
document.getElementById('create-key-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const endpoint = formData.get('endpoint');
    const durationAmount = parseInt(formData.get('durationAmount'));
    const durationUnit = formData.get('durationUnit');
    const userId = formData.get('userId') || null;
    
    if (!endpoint || !durationAmount || !durationUnit) {
        UI.toast('Completa todos los campos', 'warning');
        return;
    }
    
    try {
        const response = await API.request('/api/keys', {
            method: 'POST',
            body: JSON.stringify({ endpoint, durationAmount, durationUnit, userId })
        });
        
        if (response.success) {
            UI.toast(`Key creada exitosamente para ${durationAmount} ${durationUnit}`, 'success');
            UI.hideModal('create-key-modal');
            e.target.reset();
            await loadKeys();
            
            // Mostrar key generada
            alert(`✅ Key creada exitosamente!\n\n🔑 Key: ${response.data.key}\n📍 Endpoint: ${response.data.endpoint.toUpperCase()}\n⏰ Expira: ${new Date(response.data.expiresAt).toLocaleString()}`);
        }
    } catch (error) {
        UI.toast(error.message, 'error');
    }
});

// ===== SISTEMA DE SOLICITUDES DE KEYS =====

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
                ${req.status === 'rejected' && req.notes ? `
                    <p style="color: var(--danger); margin-top: 10px;">
                        <strong>Motivo:</strong> ${req.notes}
                    </p>
                ` : ''}
                <small style="color: var(--text-secondary);">Creado: ${new Date(req.createdAt).toLocaleString()}</small>
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
        const checkbox = document.querySelector(`input[name="endpoint-${ep}"]`);
        if (checkbox && checkbox.checked) {
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
        
        // Detener contadores cuando se sale de la sección de keys
        if (section !== 'keys') {
            stopCountdownUpdates();
        }
        
        UI.showSection(section);
        
        // Cargar datos según la sección
        if (section === 'dashboard') loadDashboard();
        else if (section === 'keys') loadKeys();
        else if (section === 'users') loadUsers();
        else if (section === 'notifications') loadNotifications();
        else if (section === 'profile') loadProfile();
        else if (section === 'requests') loadRequestsForm();
        else if (section === 'pending-requests') loadPendingRequests();
    });
});

// ===== INICIALIZACIÓN =====
window.addEventListener('DOMContentLoaded', () => {
    // Verificar si hay token guardado
    const savedToken = localStorage.getItem('token');
    
    if (savedToken) {
        state.token = savedToken;
        // Intentar cargar datos del usuario
        API.request('/api/auth/me').then(response => {
            if (response.success) {
                state.user = response.user;
                UI.showScreen('dashboard-screen');
                UI.updateUserDisplay();
                loadDashboard();
            }
        }).catch(() => {
            localStorage.removeItem('token');
            UI.showScreen('login-screen');
        });
    } else {
        UI.showScreen('login-screen');
    }
});

