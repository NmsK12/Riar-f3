// ===== SISTEMA DE TEMAS =====

// Cargar tema guardado
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

// Toggle de tema
document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  // Animación suave
  document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
});

// Detectar preferencia del sistema
if (!localStorage.getItem('theme')) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
}

