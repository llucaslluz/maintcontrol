
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();

  const triggers = document.querySelectorAll('.mobile-dropdown-trigger');
  let activeMenu = null;

  triggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const menuId = trigger.getAttribute('data-menu');
      const submenu = document.getElementById(menuId);

      // Fecha qualquer outro aberto
      if (activeMenu && activeMenu !== submenu) {
        activeMenu.classList.remove('mobile-dropdown-menu');
        activeMenu.style.display = 'none';
      }

      // Toggle atual
      if (submenu.classList.contains('mobile-dropdown-menu')) {
        submenu.classList.remove('mobile-dropdown-menu');
        submenu.style.display = 'none';
        activeMenu = null;
      } else {
        submenu.classList.add('mobile-dropdown-menu');
        submenu.style.display = 'flex';
        activeMenu = submenu;
      }
    });
  });

  // Clica fora fecha
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.mobile-dropdown-trigger') && !e.target.closest('.mobile-dropdown-menu')) {
      if (activeMenu) {
        activeMenu.classList.remove('mobile-dropdown-menu');
        activeMenu.style.display = 'none';
        activeMenu = null;
      }
    }
  });
});
