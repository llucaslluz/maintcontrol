document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('formChamado');
  const botaoAnexo = document.getElementById('botao-anexo');
  const modalAnexo = document.getElementById('anexo');
  const inputArquivos = document.getElementById('arquivo');
  const listaArquivos = document.getElementById('lista-arquivos');

  // 🟢 Exibe a modal de anexo
  window.abrirAnexo = function () {
    if (modalAnexo) modalAnexo.classList.add('show');
    if (botaoAnexo) botaoAnexo.style.display = 'none';
  };

  // 🔴 Fecha a modal de anexo
  window.fecharAnexo = function () {
    if (modalAnexo) modalAnexo.classList.remove('show');
    if (botaoAnexo) botaoAnexo.style.display = 'inline-flex';
  };

  // 📎 Exibe nomes dos arquivos anexados
  window.mostrarNomeArquivos = function () {
    listaArquivos.innerHTML = "";

    if (inputArquivos.files.length > 0) {
      Array.from(inputArquivos.files).forEach(file => {
        const li = document.createElement('li');
        li.textContent = `📎 ${file.name}`;
        listaArquivos.appendChild(li);
      });
    }
  };

  // 🔄 Carregar Locais
  async function carregarLocais() {
    const selectLocal = document.getElementById('local');

    const { data, error } = await supabase
      .from('local')
      .select('id_local, nome_local')
      .order('nome_local', { ascending: true });

    if (error) {
      console.error("Erro ao carregar locais:", error.message);
      return;
    }

    data.forEach(local => {
      const option = document.createElement('option');
      option.value = local.id_local;
      option.textContent = local.nome_local;
      selectLocal.appendChild(option);
    });
  }

  // 🔄 Carregar Máquinas
  async function carregarMaquinas() {
    const selectMaquina = document.getElementById('maquina');

    const { data, error } = await supabase
      .from('maquina_dispositivo')
      .select('id_maquina, nome_maquina')
      .order('nome_maquina', { ascending: true });

    if (error) {
      console.error("Erro ao carregar máquinas:", error.message);
      return;
    }

    data.forEach(maquina => {
      const option = document.createElement('option');
      option.value = maquina.id_maquina;
      option.textContent = maquina.nome_maquina;
      selectMaquina.appendChild(option);
    });
  }

  // 🔄 Carregar Tipos de Manutenção
  async function carregarTiposManutencao() {
    const selectTipo = document.getElementById('tipo');

    // Limpa os valores fixos do HTML
    selectTipo.innerHTML = '<option value="">Selecione</option>';

    const { data, error } = await supabase
      .from('tipo_manutencao')
      .select('id_tipo_manutencao, nome_tipo')
      .order('nome_tipo', { ascending: true });

    if (error) {
      console.error("Erro ao carregar tipos de manutenção:", error.message);
      return;
    }

    data.forEach(tipo => {
      const option = document.createElement('option');
      option.value = tipo.id_tipo_manutencao;
      option.textContent = tipo.nome_tipo;
      selectTipo.appendChild(option);
    });
  }

  // ✅ Submit do formulário
  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const local = document.getElementById('local').value;
    const maquina = document.getElementById('maquina').value;
    const tipo = document.getElementById('tipo').value;
    const status = document.getElementById('status').value;
    const prioridade = document.getElementById('prioridade').value;
    const descricao = document.getElementById('descricao').value.trim();

    const idUsuario = "5c5b36b6-e3ad-48d5-adbe-70cb2bb15d5a"; // <-- mock fixo

    const { data, error } = await supabase
      .from('chamado')
      .insert([{
        id_solicitante: idUsuario,
        id_local: local,
        id_maquina: maquina,
        id_tipo_manutencao: tipo,
        status_maquina: status,
        prioridade: prioridade,
        descricao_problema: descricao,
        data_hora_abertura: new Date().toISOString(),
        status_chamado: "Aberto"
      }]);

    if (error) {
      console.error("Erro ao abrir chamado:", error.message);
      alert("❌ Erro ao abrir chamado. Veja o console.");
      return;
    }

    alert("✅ Chamado aberto com sucesso!");
    form.reset();
    listaArquivos.innerHTML = "";
    fecharAnexo();
  });

  // ⏬ Executa os carregamentos
  carregarLocais();
  carregarMaquinas();
  carregarTiposManutencao();
});
