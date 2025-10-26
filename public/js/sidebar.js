document.addEventListener('DOMContentLoaded', () => {
  // --- Marca link ativo na sidebar ---
  const currentPath = window.location.pathname.split('/').pop();
  const links = document.querySelectorAll('.menu-superior a');

  links.forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
    }
  });

  // --- Dropdown toggle ---
  document.querySelectorAll('.menu-dropdown').forEach(menu => {
    const title = menu.querySelector('.menu-title');
    const submenu = menu.querySelector('.submenu');

    title.addEventListener('click', () => {
      submenu.classList.toggle('open');
    });
  });

  // ========================================================
  // 🔹 NOVA PARTE: redireciona Dashboard conforme categoria
  // ========================================================

  // 1️⃣ Lê o usuário logado (salvo no localStorage no login)
  const user = getUser();

  // 2️⃣ Mapeia o dashboard de cada categoria
  const ROUTES = {
    'Supervisor': '/DashboardSupervisorAdm.html',
    'Técnico': '/DashboardTecnico.html',
    'Operador': '/DashboardOperacao.html',
    'Administrador': '/DashboardSupervisorAdm.html',
    'Operação': '/DashboardOperacao.html',
    'Manutenção': '/DashboardTecnico.html',
    'DEFAULT': '/DashboardSupervisorAdm.html'
  };

  // 3️⃣ Determina o destino correto
  const categoria = user?.categoria_nome || '';
  const destino = ROUTES[categoria] || ROUTES.DEFAULT;

  // 4️⃣ Atualiza os links do tipo “Dashboard”
  document.querySelectorAll('a[data-dashboard-link]').forEach((a) => {
    a.setAttribute('href', destino);
    if (!user) {
      // se não tiver login, leva pro index
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        window.location.href = '/index.html';
      });
    }
  });

  // (opcional) se quiser forçar redirecionar dashboards errados:
  // const current = location.pathname.toLowerCase();
  // const desired = new URL(destino, location.origin).pathname.toLowerCase();
  // if (current.includes('dashboard') && current !== desired) {
  //   location.replace(destino);
  // }

  // --- Helper para ler o usuário ---
  function getUser() {
    try { return JSON.parse(localStorage.getItem('mcv_user') || 'null'); }
    catch { return null; }
  }
});
