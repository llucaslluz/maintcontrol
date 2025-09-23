document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('formChamadoVisitante');
  const listaArquivos = document.getElementById('lista-arquivos');

  // ✅ Submit do formulário
  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    // Dados do visitante
    const nome = document.getElementById('nome').value.trim();
    const chapa = document.getElementById('chapa').value.trim();
    const cargo = document.getElementById('funcao').value.trim();

    // Dados do chamado
    const local = document.getElementById('local').value;
    const maquina = document.getElementById('maquina').value;
    const tipo = document.getElementById('tipo').value;
    const status = document.getElementById('status')?.value || "Desconhecido";
    const prioridade = document.getElementById('prioridade').value;
    const descricao = document.getElementById('descricao').value.trim();

    // Validação básica
    if (!nome || !chapa || !cargo || !local || !maquina || !tipo || !prioridade || !descricao) {
      alert("⚠️ Preencha todos os campos obrigatórios.");
      return;
    }

    // Inserir chamado no Supabase
    const { data, error } = await supabase
      .from('chamado')
      .insert([{
        id_solicitante: null, // visitante não tem usuário
        nome_solicitante_externo: nome,
        chapa_solicitante_externo: chapa,
        categoria_solicitante_externo: cargo,
        id_local: local,
        id_maquina: maquina,
        id_tipo_manutencao: tipo,
        status_maquina: status,
        prioridade: prioridade,
        descricao_problema: descricao,
        data_hora_abertura: new Date().toISOString(),
        status_chamado: "Aberto"
      }])
      .select();

    if (error) {
      console.error("Erro ao abrir chamado visitante:", error.message);
      alert("❌ Erro ao abrir chamado. Veja o console.");
      return;
    }

    alert("✅ Chamado aberto com sucesso!");
    form.reset();
    if (listaArquivos) listaArquivos.innerHTML = "";
  });
});
