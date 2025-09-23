document.addEventListener('DOMContentLoaded', function () {
  // ⚠️ Mesma assinatura do form da página do Usuário
  const form = document.getElementById('formChamado');
  const botaoAnexo = document.getElementById('botao-anexo');
  const modalAnexo = document.getElementById('anexo');
  const inputArquivos = document.getElementById('arquivo');
  const listaArquivos = document.getElementById('lista-arquivos');

  // ---------- Modal de anexo (mantida; upload desativado) ----------
  window.abrirAnexo = function () {
    if (modalAnexo) modalAnexo.classList.add('show');
    if (botaoAnexo) botaoAnexo.style.display = 'none';
  };
  window.fecharAnexo = function () {
    if (modalAnexo) modalAnexo.classList.remove('show');
    if (botaoAnexo) botaoAnexo.style.display = 'inline-flex';
  };
  window.mostrarNomeArquivos = function () {
    if (!listaArquivos || !inputArquivos) return;
    listaArquivos.innerHTML = "";
    if (inputArquivos.files.length > 0) {
      Array.from(inputArquivos.files).forEach(file => {
        const li = document.createElement('li');
        li.textContent = `📎 ${file.name}`;
        listaArquivos.appendChild(li);
      });
    }
  };

  // ---------- Carregamentos ----------
  async function carregarLocais() {
    const selectLocal = document.getElementById('local');
    if (!selectLocal) return;
    selectLocal.innerHTML = '<option value="">Selecione</option>';

    const { data, error } = await supabase
      .from('local')
      .select('id_local, nome_local')
      .order('nome_local', { ascending: true });

    if (error) {
      console.error("Erro ao carregar locais:", error.message);
      return;
    }
    data?.forEach(local => {
      const option = document.createElement('option');
      option.value = local.id_local;
      option.textContent = local.nome_local;
      selectLocal.appendChild(option);
    });
  }

  async function carregarMaquinas() {
    const selectMaquina = document.getElementById('maquina');
    if (!selectMaquina) return;
    selectMaquina.innerHTML = '<option value="">Selecione</option>';

    const { data, error } = await supabase
      .from('maquina_dispositivo')
      .select('id_maquina, nome_maquina')
      .order('nome_maquina', { ascending: true });

    if (error) {
      console.error("Erro ao carregar máquinas:", error.message);
      return;
    }
    data?.forEach(maquina => {
      const option = document.createElement('option');
      option.value = maquina.id_maquina;
      option.textContent = maquina.nome_maquina;
      selectMaquina.appendChild(option);
    });
  }

  async function carregarTiposManutencao() {
    const selectTipo = document.getElementById('tipo');
    if (!selectTipo) return;
    selectTipo.innerHTML = '<option value="">Selecione</option>';

    const { data, error } = await supabase
      .from('tipo_manutencao')
      .select('id_tipo_manutencao, nome_tipo')
      .order('nome_tipo', { ascending: true });

    if (error) {
      console.error("Erro ao carregar tipos de manutenção:", error.message);
      return;
    }
    data?.forEach(tipo => {
      const option = document.createElement('option');
      option.value = tipo.id_tipo_manutencao;
      option.textContent = tipo.nome_tipo;
      selectTipo.appendChild(option);
    });
  }

  // ---------- Submit ----------
  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const nome = document.getElementById('nome').value.trim();
    const chapa = document.getElementById('chapa').value.trim();
    const cargo = document.getElementById('funcao').value.trim();
    const local = document.getElementById('local').value;
    const maquina = document.getElementById('maquina').value;
    const tipo = document.getElementById('tipo').value;
    const status = document.getElementById('status').value;       // mesmos valores da outra página
    const prioridade = document.getElementById('prioridade').value; // 'alta' | 'media' | 'baixa'
    const descricao = document.getElementById('descricao').value.trim();

    if (!nome || !chapa || !cargo || !local || !maquina || !tipo || !status || !prioridade || !descricao) {
      alert("⚠️ Preencha todos os campos obrigatórios.");
      return;
    }

    // Insert para visitante (id_solicitante = null + campos *_externo)
    const { error } = await supabase
      .from('chamado')
      .insert([{
        id_solicitante: null,
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
      }]); // 🔹 sem .select() para não exigir policy de SELECT

    if (error) {
      console.error("❌ Erro ao abrir chamado (visitante):", error.message);
      alert("❌ Erro ao abrir chamado. Veja o console.");
      return;
    }

    alert("✅ Chamado aberto com sucesso!");
    form.reset();
    if (listaArquivos) listaArquivos.innerHTML = "";
    if (typeof fecharAnexo === 'function') fecharAnexo();
  });

  // ---------- Start ----------
  carregarLocais();
  carregarMaquinas();
  carregarTiposManutencao();
});
