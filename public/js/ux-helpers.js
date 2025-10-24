// ===== SISTEMA DE TOOLTIPS =====

function initTooltips() {
    // Agregar tooltips a elementos clave
    const tooltips = {
        '#create-key-btn': 'Crea una nueva API key con duración y endpoint personalizados',
        '#create-user-btn': 'Agrega un nuevo usuario al sistema',
        '#block-ip-btn': 'Bloquea manualmente una dirección IP',
        '#export-audit-btn': 'Exporta los logs de auditoría a CSV',
        '#clear-all-notifications-btn': 'Elimina todas las notificaciones de una vez',
        '#theme-toggle': 'Cambia entre modo oscuro y claro',
        '.nav-item[data-section="dashboard"]': 'Vista general y acceso rápido',
        '.nav-item[data-section="keys"]': 'Administra tus API keys',
        '.nav-item[data-section="users"]': 'Gestiona usuarios del sistema',
        '.nav-item[data-section="notifications"]': 'Revisa notificaciones pendientes',
        '.nav-item[data-section="security"]': 'Monitoreo de seguridad y logs',
        '.nav-item[data-section="tickets"]': 'Sistema de soporte al cliente',
        '.nav-item[data-section="profile"]': 'Configura tu perfil',
        '.nav-item[data-section="help"]': 'Preguntas frecuentes y ayuda',
        '.nav-item[data-section="requests"]': 'Solicita acceso a nuevos endpoints',
        '.nav-item[data-section="pending-requests"]': 'Aprueba solicitudes de clientes'
    };

    for (const [selector, text] of Object.entries(tooltips)) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            if (!el.hasAttribute('data-tooltip')) {
                el.setAttribute('data-tooltip', text);
            }
        });
    }
}

// ===== SKELETON LOADERS =====

const SkeletonLoaders = {
    // Skeleton para tabla
    table(columns = 5, rows = 3) {
        const skeletonRows = Array(rows).fill().map(() => `
            <tr>
                ${Array(columns).fill('<td><div class="skeleton skeleton-text"></div></td>').join('')}
            </tr>
        `).join('');

        return `
            <table class="skeleton-table">
                <tbody>${skeletonRows}</tbody>
            </table>
        `;
    },

    // Skeleton para tarjetas
    cards(count = 3) {
        return Array(count).fill().map(() => `
            <div class="skeleton skeleton-card">
                <div class="skeleton skeleton-header"></div>
                <div class="skeleton skeleton-line"></div>
                <div class="skeleton skeleton-line short"></div>
            </div>
        `).join('');
    },

    // Skeleton para lista
    list(count = 5) {
        return Array(count).fill().map(() => `
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                <div class="skeleton skeleton-circle"></div>
                <div style="flex: 1;">
                    <div class="skeleton skeleton-text medium" style="margin-bottom: 8px;"></div>
                    <div class="skeleton skeleton-text short"></div>
                </div>
                <div class="skeleton skeleton-button"></div>
            </div>
        `).join('');
    },

    // Skeleton para stats cards
    statsCards() {
        return Array(4).fill().map(() => `
            <div class="stats-card" style="position: relative; overflow: hidden;">
                <div class="skeleton skeleton-text short" style="margin-bottom: 15px;"></div>
                <div class="skeleton skeleton-header" style="width: 60%;"></div>
            </div>
        `).join('');
    }
};

// ===== LOADING STATES =====

function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const originalContent = container.innerHTML;
    container.dataset.originalContent = originalContent;

    // Determinar qué tipo de skeleton mostrar
    if (container.querySelector('table')) {
        container.innerHTML = SkeletonLoaders.table();
    } else if (container.classList.contains('stats-container')) {
        container.innerHTML = SkeletonLoaders.statsCards();
    } else {
        container.innerHTML = SkeletonLoaders.cards();
    }
}

function hideLoading(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const originalContent = container.dataset.originalContent;
    if (originalContent) {
        container.innerHTML = originalContent;
        delete container.dataset.originalContent;
    }
}

// ===== SMOOTH TRANSITIONS =====

function smoothTransition(element, newContent, animation = 'fade') {
    if (!element) return;

    // Fade out
    element.style.opacity = '0';
    element.style.transform = 'translateY(10px)';

    setTimeout(() => {
        element.innerHTML = newContent;

        // Fade in
        requestAnimationFrame(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        });
    }, 200);
}

// ===== MEJORAS EN TRANSICIONES DE SECCIONES =====

function enhanceSectionTransitions() {
    const originalShowSection = UI?.showSection;
    if (!originalShowSection) return;

    UI.showSection = function(sectionId) {
        // Ocultar secciones actuales con fade out
        document.querySelectorAll('.content-section.active').forEach(section => {
            section.style.opacity = '0';
            section.style.transform = 'translateY(20px)';
        });

        setTimeout(() => {
            // Llamar a la función original
            originalShowSection.call(this, sectionId);

            // Mostrar nueva sección con fade in
            const newSection = document.getElementById(`${sectionId}-section`);
            if (newSection) {
                newSection.style.opacity = '0';
                newSection.style.transform = 'translateY(20px)';

                requestAnimationFrame(() => {
                    newSection.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
                    newSection.style.opacity = '1';
                    newSection.style.transform = 'translateY(0)';
                });

                // Animar elementos dentro de la sección
                setTimeout(() => {
                    const cards = newSection.querySelectorAll('.stats-card, .endpoint-card, .ticket-item, .data-table tr');
                    cards.forEach((card, index) => {
                        card.style.opacity = '0';
                        card.style.transform = 'translateY(20px)';
                        
                        setTimeout(() => {
                            card.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                            card.style.opacity = '1';
                            card.style.transform = 'translateY(0)';
                        }, index * 50);
                    });
                }, 100);
            }
        }, 200);
    };
}

// ===== ANIMACIONES DE ENTRADA PARA ELEMENTOS NUEVOS =====

function animateNewElement(element, animation = 'scale-in') {
    if (!element) return;

    element.classList.add(animation);
    
    element.addEventListener('animationend', () => {
        element.classList.remove(animation);
    }, { once: true });
}

// ===== MEJORAS EN MODALES =====

function enhanceModals() {
    const originalShowModal = UI?.showModal;
    const originalHideModal = UI?.hideModal;

    if (originalShowModal) {
        UI.showModal = function(modalId) {
            const modal = document.getElementById(modalId);
            if (!modal) return;

            originalShowModal.call(this, modalId);

            // Animar contenido del modal
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.transform = 'scale(0.9)';
                modalContent.style.opacity = '0';

                requestAnimationFrame(() => {
                    modalContent.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                    modalContent.style.transform = 'scale(1)';
                    modalContent.style.opacity = '1';
                });
            }
        };
    }

    if (originalHideModal) {
        UI.hideModal = function(modalId) {
            const modal = document.getElementById(modalId);
            if (!modal) return;

            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.transform = 'scale(0.9)';
                modalContent.style.opacity = '0';

                setTimeout(() => {
                    originalHideModal.call(this, modalId);
                    // Resetear estilos
                    modalContent.style.transform = '';
                    modalContent.style.opacity = '';
                }, 200);
            } else {
                originalHideModal.call(this, modalId);
            }
        };
    }
}

// ===== MEJORAS EN TOASTS =====

function enhanceToasts() {
    const originalToast = UI?.toast;
    if (!originalToast) return;

    UI.toast = function(message, type = 'info', duration = 5000) {
        originalToast.call(this, message, type, duration);

        // Animar el último toast añadido
        const container = document.getElementById('toast-container');
        const toasts = container?.querySelectorAll('.toast');
        if (toasts && toasts.length > 0) {
            const lastToast = toasts[toasts.length - 1];
            lastToast.style.transform = 'translateX(400px)';
            lastToast.style.opacity = '0';

            requestAnimationFrame(() => {
                lastToast.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
                lastToast.style.transform = 'translateX(0)';
                lastToast.style.opacity = '1';
            });
        }
    };
}

// ===== INICIALIZAR TODO =====

document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que UI esté disponible
    const initWhenReady = setInterval(() => {
        if (typeof UI !== 'undefined') {
            clearInterval(initWhenReady);
            
            console.log('🎨 Inicializando mejoras UX...');
            
            // Inicializar tooltips
            initTooltips();
            
            // Mejorar transiciones
            enhanceSectionTransitions();
            enhanceModals();
            enhanceToasts();
            
            // Re-inicializar tooltips cuando cambie de sección
            document.querySelectorAll('.nav-item').forEach(item => {
                item.addEventListener('click', () => {
                    setTimeout(initTooltips, 500);
                });
            });
            
            console.log('✅ Mejoras UX cargadas');
        }
    }, 100);
});

// Exportar funciones para uso global
window.SkeletonLoaders = SkeletonLoaders;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.smoothTransition = smoothTransition;
window.animateNewElement = animateNewElement;
window.initTooltips = initTooltips;

console.log('🚀 UX Helpers cargados');

