document.addEventListener('DOMContentLoaded', () => {
  const currentPath = window.location.pathname.split('/').pop();
  const links = document.querySelectorAll('.menu-superior a');

  links.forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
    }
  });

  // Dropdown toggle
  document.querySelectorAll('.menu-dropdown').forEach(menu => {
    const title = menu.querySelector('.menu-title');
    const submenu = menu.querySelector('.submenu');

    title.addEventListener('click', () => {
      submenu.classList.toggle('open');
    });
  });
});
