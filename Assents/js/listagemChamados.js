document.addEventListener('DOMContentLoaded', () => {
  console.log("📋 Página de listagem carregada");

  const botoesDetalhe = document.querySelectorAll('.btn-detalhe');

  botoesDetalhe.forEach(btn => {
    btn.addEventListener('click', () => {
      alert("🔍 Aqui abrirá a tela de detalhes do chamado.");
      // No futuro: redirecionar para detalhesChamado.html?id=1234
    });
  });
});
