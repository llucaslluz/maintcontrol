document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('formChamado');
  const botaoAnexo = document.getElementById('botao-anexo');
  const modalAnexo = document.getElementById('anexo');
  const inputArquivos = document.getElementById('arquivo');
  const listaArquivos = document.getElementById('lista-arquivos');

  // ===== Sessão do usuário (gravada no login.js) =====
  const user = getUser();
  if (!user) {
    // sem sessão -> volta para login (ou página de visitante)
    window.location.href = '/index.html';
    return;
  }

  // Preenche Identificação
  setValue('#nome',  user.nome);
  setValue('#chapa', user.chapa);
  setValue('#funcao', user.categoria_nome || ''); // se quiser exibir a categoria como “função”

  // ===== Modal de anexo (UI) =====
  window.abrirAnexo = function () {
    if (modalAnexo) modalAnexo.classList.add('show');
    if (botaoAnexo) botaoAnexo.style.display = 'none';
  };
  window.fecharAnexo = function () {
    if (modalAnexo) modalAnexo.classList.remove('show');
    if (botaoAnexo) botaoAnexo.style.display = 'inline-flex';
  };
  window.mostrarNomeArquivos = function () {
    listaArquivos.innerHTML = "";
    if (inputArquivos?.files?.length > 0) {
      Array.from(inputArquivos.files).forEach(file => {
        const li = document.createElement('li');
        li.textContent = `📎 ${file.name}`;
        listaArquivos.appendChild(li);
      });
    }
  };

  // ===== Carregar combos =====
  carregarLocais();
  carregarMaquinas();
  carregarTiposManutencao();

  async function carregarLocais() {
    const selectLocal = document.getElementById('local');
    if (!selectLocal) return;
    selectLocal.innerHTML = '<option value="">Selecione</option>';
    const { data, error } = await supabase
      .from('local')
      .select('id_local, nome_local')
      .order('nome_local', { ascending: true });
    if (error) { console.error("Erro ao carregar locais:", error.message); return; }
    data?.forEach(local => {
      const option = document.createElement('option');
      option.value = local.id_local;
      option.textContent = local.nome_local;
      selectLocal.appendChild(option);
    });
  }

  async function carregarMaquinas() {
    const select = document.getElementById('maquina');
    if (!select) return;
    select.innerHTML = '<option value="">Selecione</option>';
    const { data, error } = await supabase
      .from('maquina_dispositivo')
      .select('id_maquina, nome_maquina')
      .order('nome_maquina', { ascending: true });
    if (error) { console.error("Erro ao carregar máquinas:", error.message); return; }
    data?.forEach(row => {
      const opt = document.createElement('option');
      opt.value = row.id_maquina;
      opt.textContent = row.nome_maquina;
      select.appendChild(opt);
    });
  }

  async function carregarTiposManutencao() {
    const select = document.getElementById('tipo');
    if (!select) return;
    select.innerHTML = '<option value="">Selecione</option>';
    const { data, error } = await supabase
      .from('tipo_manutencao')
      .select('id_tipo_manutencao, nome_tipo')
      .order('nome_tipo', { ascending: true });
    if (error) { console.error("Erro ao carregar tipos de manutenção:", error.message); return; }
    data?.forEach(row => {
      const opt = document.createElement('option');
      opt.value = row.id_tipo_manutencao;
      opt.textContent = row.nome_tipo;
      select.appendChild(opt);
    });
  }

  // ===== Submit do formulário =====
  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const local = getVal('#local');
    const maquina = getVal('#maquina');
    const tipo = getVal('#tipo');
    const status = getVal('#status') || "Desconhecido";
    // padroniza prioridade para primeira letra maiúscula
    const prioridadeSel = (getVal('#prioridade') || 'media').toLowerCase();
    const prioridade = prioridadeSel === 'alta' ? 'Alta'
                      : prioridadeSel === 'baixa' ? 'Baixa'
                      : 'Média';
    const descricao = (getVal('#descricao') || '').trim();

    if (!local || !maquina || !tipo || !prioridade || !descricao) {
      alert("⚠️ Preencha todos os campos obrigatórios.");
      return;
    }

    const payload = {
      id_solicitante: user.id,      // <<<<<<<<<<<<<<<<<<<<< AQUI VAI O USUÁRIO LOGADO
      id_local: local,
      id_maquina: maquina,
      id_tipo_manutencao: tipo,
      status_maquina: status,
      prioridade: prioridade,
      descricao_problema: descricao,
      data_hora_abertura: new Date().toISOString(),
      status_chamado: "Aberto"
    };

    const { data, error } = await supabase
      .from('chamado')
      .insert([payload])
      .select('id_chamado')
      .single();

    if (error) {
      console.error("Erro ao abrir chamado:", error);
      alert("❌ Erro ao abrir chamado. Veja o console.");
      return;
    }

    alert(`✅ Chamado aberto com sucesso!\nProtocolo: ${data.id_chamado}`);
    form.reset();
    listaArquivos.innerHTML = "";
    fecharAnexo();
  });

  // ===== utils =====
  function getUser() {
    try { return JSON.parse(localStorage.getItem('mcv_user') || 'null'); }
    catch { return null; }
  }
  function getVal(sel) {
    const el = document.querySelector(sel);
    return el ? el.value : '';
    }
  function setValue(sel, value) {
    const el = document.querySelector(sel);
    if (el) el.value = value ?? '';
  }
});
