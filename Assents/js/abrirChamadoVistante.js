// Espera o carregamento completo da página
document.addEventListener('DOMContentLoaded', function () {

  // Captura o formulário pelo ID
  const form = document.getElementById('formChamado');

  // Escuta o envio do formulário
  form.addEventListener('submit', function (event) {
    event.preventDefault(); // Impede o recarregamento da página

    // Coleta os valores dos campos
    const nome = document.getElementById('nome').value.trim();
    const chapa = document.getElementById('chapa').value.trim();
    const funcao = document.getElementById('funcao').value.trim();
    const local = document.getElementById('local').value;
    const maquina = document.getElementById('maquina').value;
    const tipo = document.getElementById('tipo').value;
    const prioridade = document.getElementById('prioridade').value;
    const status = document.getElementById('status').value;
    const descricao = document.getElementById('descricao').value.trim();
    const anexo = document.getElementById('anexo').files[0]; // opcional

    // Validação simples
    if (!nome || !chapa || !funcao || !local || !maquina || !tipo || !prioridade || !status || !descricao) {
      alert("⚠️ Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    // Simulação de envio (poderia salvar no Supabase ou backend aqui)
    alert("✅ Chamado aberto com sucesso!\nO supervisor será notificado.");

    // Limpa o formulário (reset visual)
    form.reset();
  });
});
