// ===== SISTEMA DE ONBOARDING =====

class OnboardingTutorial {
    constructor() {
        this.currentStep = 0;
        this.steps = [];
        this.overlay = null;
        this.spotlight = null;
        this.tooltip = null;
        this.isActive = false;
    }

    init(steps) {
        this.steps = steps;
        this.createOverlay();
        this.createSpotlight();
        this.createTooltip();
        this.createSkipButton();
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'onboarding-overlay';
        document.body.appendChild(this.overlay);
    }

    createSpotlight() {
        this.spotlight = document.createElement('div');
        this.spotlight.className = 'onboarding-spotlight';
        document.body.appendChild(this.spotlight);
    }

    createTooltip() {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'onboarding-tooltip';
        document.body.appendChild(this.tooltip);
    }

    createSkipButton() {
        this.skipBtn = document.createElement('button');
        this.skipBtn.className = 'onboarding-skip';
        this.skipBtn.textContent = '⏭️ Saltar Tutorial';
        this.skipBtn.style.display = 'none';
        this.skipBtn.onclick = () => this.end();
        document.body.appendChild(this.skipBtn);
    }

    start() {
        // Verificar si ya vio el tutorial
        const hasSeenTutorial = localStorage.getItem('hasSeenOnboarding');
        if (hasSeenTutorial) {
            return;
        }

        this.isActive = true;
        this.currentStep = 0;
        this.overlay.classList.add('active');
        this.skipBtn.style.display = 'block';
        this.showStep(0);
    }

    showStep(index) {
        if (index >= this.steps.length) {
            this.end();
            return;
        }

        const step = this.steps[index];
        
        // Encontrar el elemento objetivo
        const targetElement = document.querySelector(step.target);
        if (!targetElement) {
            console.warn(`Elemento no encontrado: ${step.target}`);
            this.next();
            return;
        }

        // Hacer scroll al elemento
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Posicionar spotlight
        setTimeout(() => {
            const rect = targetElement.getBoundingClientRect();
            this.spotlight.style.top = `${rect.top - 10}px`;
            this.spotlight.style.left = `${rect.left - 10}px`;
            this.spotlight.style.width = `${rect.width + 20}px`;
            this.spotlight.style.height = `${rect.height + 20}px`;

            // Posicionar tooltip
            this.positionTooltip(rect, step);
        }, 300);

        // Renderizar contenido del tooltip
        this.renderTooltip(step, index);
    }

    positionTooltip(rect, step) {
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;

        let top, left;

        // Determinar posición preferida
        const preferBottom = rect.top > windowHeight / 2;
        
        if (preferBottom) {
            // Mostrar arriba del elemento
            top = rect.top - tooltipRect.height - 20;
        } else {
            // Mostrar abajo del elemento
            top = rect.bottom + 20;
        }

        // Centrar horizontalmente si es posible
        left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        
        // Ajustar si se sale de la pantalla
        if (left < 20) left = 20;
        if (left + tooltipRect.width > windowWidth - 20) {
            left = windowWidth - tooltipRect.width - 20;
        }

        this.tooltip.style.top = `${Math.max(20, top)}px`;
        this.tooltip.style.left = `${left}px`;
    }

    renderTooltip(step, index) {
        const progressDots = this.steps.map((_, i) => 
            `<div class="onboarding-dot ${i === index ? 'active' : ''}"></div>`
        ).join('');

        this.tooltip.innerHTML = `
            <h3>${step.icon || '💡'} ${step.title}</h3>
            <p>${step.description}</p>
            <div class="onboarding-controls">
                <div class="onboarding-progress">
                    ${progressDots}
                </div>
                <div class="onboarding-buttons">
                    ${index > 0 ? '<button class="onboarding-btn" onclick="onboarding.previous()">⬅️ Anterior</button>' : ''}
                    ${index < this.steps.length - 1 
                        ? '<button class="onboarding-btn primary" onclick="onboarding.next()">Siguiente ➡️</button>'
                        : '<button class="onboarding-btn primary" onclick="onboarding.end()">🎉 ¡Entendido!</button>'
                    }
                </div>
            </div>
        `;
    }

    next() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.showStep(this.currentStep);
        } else {
            this.end();
        }
    }

    previous() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.showStep(this.currentStep);
        }
    }

    end() {
        this.isActive = false;
        this.overlay.classList.remove('active');
        this.spotlight.style.display = 'none';
        this.tooltip.style.display = 'none';
        this.skipBtn.style.display = 'none';
        
        // Marcar como visto
        localStorage.setItem('hasSeenOnboarding', 'true');
        
        // Mostrar mensaje de completado
        if (typeof UI !== 'undefined' && UI.toast) {
            UI.toast('🎉 ¡Tutorial completado! Ya puedes usar el panel libremente', 'success', 5000);
        }
    }

    reset() {
        localStorage.removeItem('hasSeenOnboarding');
        this.currentStep = 0;
    }
}

// Crear instancia global
const onboarding = new OnboardingTutorial();

// Definir pasos del tutorial según el rol
function getOnboardingSteps(role) {
    const commonSteps = [
        {
            target: '#dashboard-section',
            icon: '🏠',
            title: '¡Bienvenido al Panel!',
            description: 'Este es tu panel de administración. Desde aquí puedes gestionar todo lo relacionado con las APIs.'
        },
        {
            target: '.nav-item[data-section="keys"]',
            icon: '🔑',
            title: 'Gestión de Keys',
            description: 'Aquí puedes crear, ver y administrar tus API keys. Cada key tiene un tiempo de expiración y endpoints asignados.'
        },
        {
            target: '#create-key-btn',
            icon: '✨',
            title: 'Crear Nueva Key',
            description: 'Haz clic aquí para crear una nueva API key. Podrás elegir el endpoint, duración y usuario asignado.'
        }
    ];

    if (role === 'admin') {
        return [
            ...commonSteps,
            {
                target: '.nav-item[data-section="users"]',
                icon: '👥',
                title: 'Gestión de Usuarios',
                description: 'Como admin, puedes crear y administrar vendedores y clientes desde aquí.'
            },
            {
                target: '.nav-item[data-section="notifications"]',
                icon: '🔔',
                title: 'Notificaciones',
                description: 'Aquí verás las solicitudes de registro y verificaciones de IP que necesitan tu aprobación.'
            },
            {
                target: '.nav-item[data-section="security"]',
                icon: '🛡️',
                title: 'Seguridad',
                description: 'Monitorea IPs bloqueadas, logs de auditoría y actividad sospechosa en tiempo real.'
            },
            {
                target: '.nav-item[data-section="tickets"]',
                icon: '🎫',
                title: 'Sistema de Tickets',
                description: 'Gestiona las consultas y problemas de los usuarios desde el sistema de soporte integrado.'
            }
        ];
    } else if (role === 'vendedor') {
        return [
            ...commonSteps,
            {
                target: '.nav-item[data-section="users"]',
                icon: '👥',
                title: 'Tus Clientes',
                description: 'Puedes crear hasta 5 clientes y gestionar sus accesos desde aquí.'
            },
            {
                target: '.nav-item[data-section="pending-requests"]',
                icon: '📋',
                title: 'Solicitudes Pendientes',
                description: 'Aprueba o rechaza las solicitudes de keys de tus clientes.'
            }
        ];
    } else {
        return [
            ...commonSteps,
            {
                target: '.nav-item[data-section="requests"]',
                icon: '📝',
                title: 'Solicitar Keys',
                description: 'Si necesitas acceso a más endpoints, solicítalos aquí y un admin o vendedor te los aprobará.'
            },
            {
                target: '.nav-item[data-section="tickets"]',
                icon: '💬',
                title: 'Soporte',
                description: '¿Tienes algún problema? Crea un ticket de soporte y te ayudaremos lo antes posible.'
            }
        ];
    }
}

// Iniciar tutorial automáticamente
function initOnboardingWhenReady() {
    // Esperar a que UI esté disponible
    if (typeof UI === 'undefined' || typeof UI.showScreen !== 'function') {
        setTimeout(initOnboardingWhenReady, 100);
        return;
    }

    const originalShowScreen = UI.showScreen;
    UI.showScreen = function(screenId) {
        originalShowScreen.call(this, screenId);
        
        // Si cambió a dashboard y no ha visto el tutorial
        if (screenId === 'dashboard-screen') {
            setTimeout(() => {
                if (window.state && window.state.user) {
                    const steps = getOnboardingSteps(state.user.role);
                    onboarding.init(steps);
                    onboarding.start();
                }
            }, 1000);
        }
    };
}

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOnboardingWhenReady);
} else {
    initOnboardingWhenReady();
}

// Función para reiniciar tutorial (útil para testing)
window.restartOnboarding = function() {
    if (window.state && window.state.user) {
        onboarding.reset();
        const steps = getOnboardingSteps(state.user.role);
        onboarding.init(steps);
        onboarding.start();
    }
};

console.log('🎓 Sistema de Onboarding cargado');

