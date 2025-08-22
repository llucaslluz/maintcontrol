document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('loginForm');

    form.addEventListener('submit', function (event) {
        event.preventDefault();

        const chapa = document.getElementById('registro').value.trim();
        const senha = document.getElementById('senha').value.trim();

        // Simulação de verificação
        if (chapa === 'Andre' && senha === 'Morais') {
            alert('✅ Login realizado com sucesso!');
            // redireciona para o dashboard
            window.location.href = "/DashboardSupervisorAdm.html";
        } else {
            alert('❌ Chapa ou senha inválidos. Tente novamente.');
        }
    });
});
