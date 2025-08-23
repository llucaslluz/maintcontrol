// login.js

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const chapa = document.getElementById('registro').value.trim();
    const senha = document.getElementById('senha').value.trim();

    // Simulação de login (pode trocar por autenticação real depois)
    if (chapa === 'Andre' && senha === 'Morais') {
      alert('✅ Login realizado com sucesso!');
      
      // Opcional: mostrar o loader manualmente
      window.MCLoader?.show();

      // Redirecionar após 500ms para mostrar o carregamento
      setTimeout(() => {
        window.location.href = "/DashboardSupervisorAdm.html";
      }, 500);
    } else {
      alert('❌ Chapa ou senha inválidos. Tente novamente.');
    }
  });
});
