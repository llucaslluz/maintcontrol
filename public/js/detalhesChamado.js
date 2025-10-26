document.addEventListener('DOMContentLoaded', async () => {
  const supa = window.supabase;
  const user = getUser(); // {id, nome, chapa, categoria_nome, ...}
  const params = new URLSearchParams(location.search);
  const id = params.get('id');

  if (!id) {
    alert('ID do chamado não informado.');
    return;
  }

  // elementos base
  const blocos    = document.querySelectorAll('.info-bloco');
  const blocoInfo = blocos[0];
  const blocoHist = blocos[1];
  const blocoAcoes= blocos[2];

  // permissões simples por categoria
  const papel = (user?.categoria_nome || '').toLowerCase();
  const podeAtender = (papel === 'técnico' || papel === 'tecnico' || papel === 'supervisor' || papel === 'administrador');
  const podeFechar  = (papel === 'técnico' || papel === 'tecnico' || papel === 'supervisor' || papel === 'administrador');

  // ------------ carregar chamado + nomes ------------
  async function carregarChamado() {
    const { data, error } = await supa
      .from('chamado')
      .select(`
        id_chamado,
        descricao_problema,
        prioridade,
        status_chamado,
        status_maquina,
        emergencia,
        data_hora_abertura,
        data_hora_fechamento,

        local:local (nome_local),
        maquina:maquina_dispositivo (nome_maquina),
        tipo:tipo_manutencao (nome_tipo),

        solicitante:usuario!chamado_id_solicitante_fkey (nome, chapa)
      `)
      .eq('id_chamado', id)
      .maybeSingle();

    if (error) {
      console.error(error);
      alert('Erro ao carregar chamado.');
      return null;
    }
    return data;
  }

  // ------------ carregar histórico ------------
  async function carregarHistorico() {
    const { data, error } = await supa
      .from('historico_acao')
      .select('id_historico,tipo_acao,descricao_acao,data_hora_acao')
      .eq('id_chamado', id)
      .order('data_hora_acao', { ascending: false });

    if (error) {
      console.error(error);
      return [];
    }
    return data || [];
  }

  // ------------ helpers ------------
  const fmt = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—';
  const safe = (s) => (s ?? '').toString();

  // ------------ render ------------
  async function render() {
    const ch = await carregarChamado();
    if (!ch) return;

    // título
    const h1 = document.querySelector('main h1');
    if (h1) h1.textContent = `Detalhes do Chamado #${ch.id_chamado}`;

    // bloco "Informações Gerais"
    const solicitanteNome = ch.solicitante?.nome || '—';
    const solicitanteChapa= ch.solicitante?.chapa || '—';

    blocoInfo.innerHTML = `
      <h2>Informações Gerais</h2>
      <p><strong>Status:</strong> ${safe(ch.status_chamado)}</p>
      <p><strong>Máquina:</strong> ${safe(ch.maquina?.nome_maquina) || '-'}</p>
      <p><strong>Local:</strong> ${safe(ch.local?.nome_local) || '-'}</p>
      <p><strong>Solicitante:</strong> ${safe(solicitanteNome)} (${safe(solicitanteChapa)})</p>
      <p><strong>Data de Abertura:</strong> ${fmt(ch.data_hora_abertura)}</p>
      <p><strong>Prioridade:</strong> ${safe(ch.prioridade)}</p>
      <p><strong>Descrição:</strong> ${safe(ch.descricao_problema)}</p>
    `;

    // bloco "Histórico"
    const hist = await carregarHistorico();
    const lis = hist.map(h =>
      `<li>[${fmt(h.data_hora_acao)}] ${safe(h.tipo_acao)} — ${safe(h.descricao_acao)}</li>`
    ).join('');
    blocoHist.innerHTML = `
      <h2>Histórico do Chamado</h2>
      <ul class="historico">${lis || '<li>Sem histórico.</li>'}</ul>
    `;

    // bloco "Ações"
    // mantém seus 3 botões e injeta "Iniciar atendimento" quando aplicável
    let acoesHTML = `
      <h2>Ações Disponíveis</h2>
      <button onclick="abrirAnexo()">📎 Anexar Arquivo</button>
      <button id="btn-fechar">✔️ Finalizar Chamado</button>
      <button id="btn-pendencia">⚠️ Criar Pendência</button>
    `;

    if (podeAtender && ch.status_chamado === 'Aberto') {
      acoesHTML += `<button id="btn-atender">🛠️ Iniciar Atendimento</button>`;
    }
    blocoAcoes.innerHTML = acoesHTML;

    // binds
    const btnAtender  = document.getElementById('btn-atender');
    const btnFechar   = document.getElementById('btn-fechar');
    const btnPendencia= document.getElementById('btn-pendencia');

    if (btnAtender)  btnAtender.addEventListener('click', atenderChamado);
    if (btnFechar)   btnFechar.addEventListener('click', finalizarChamado);
    if (btnPendencia)btnPendencia.addEventListener('click', criarPendencia);
  }

  // ------------ ações ------------
  async function atenderChamado() {
    if (!podeAtender) return alert('Sem permissão.');
    const descricao = prompt('Descrição do início do atendimento (opcional):') || 'Atendimento iniciado';
    // 1) muda status do chamado
    const { error: e1 } = await supa
      .from('chamado')
      .update({ status_chamado: 'Em Andamento' })
      .eq('id_chamado', id);
    if (e1) return alert('Erro ao iniciar atendimento.');

    // 2) registra em historico_acao
    await supa.from('historico_acao').insert([{
      tipo_acao: 'Atendimento iniciado',
      descricao_acao: `${user?.nome || 'Usuário'}: ${descricao}`,
      id_usuario: user?.id || null,
      id_chamado: id
    }]);

    alert('Atendimento iniciado.');
    render();
  }

  async function finalizarChamado() {
    if (!podeFechar) return alert('Sem permissão.');
    const obs = prompt('Observação de fechamento (opcional):') || '';
    const agora = new Date().toISOString();
    // 1) fecha chamado
    const { error: e1 } = await supa
      .from('chamado')
      .update({
        status_chamado: 'Concluído',
        data_hora_fechamento: agora,
        observacao_fechamento: obs
      })
      .eq('id_chamado', id);
    if (e1) return alert('Erro ao finalizar chamado.');

    // 2) historico
    await supa.from('historico_acao').insert([{
      tipo_acao: 'Fechamento',
      descricao_acao: `${user?.nome || 'Usuário'} finalizou o chamado. ${obs}`,
      id_usuario: user?.id || null,
      id_chamado: id
    }]);

    alert('Chamado finalizado.');
    render();
  }

  async function criarPendencia() {
    const desc = prompt('Descreva a pendência:');
    if (!desc) return;
    const { error } = await supa.from('pendencia').insert([{
      descricao_pendencia: desc,
      id_chamado: id,
      id_usuario_criador: user?.id || null,
      status_pendencia: 'Aberta'
    }]);
    if (error) return alert('Erro ao criar pendência.');

    // histórico
    await supa.from('historico_acao').insert([{
      tipo_acao: 'Pendência',
      descricao_acao: `Criada pendência: ${desc}`,
      id_usuario: user?.id || null,
      id_chamado: id
    }]);

    alert('Pendência criada.');
    render();
  }

  // ------------ init ------------
  await render();

  // helpers
  function getUser() {
    try { return JSON.parse(localStorage.getItem('mcv_user') || 'null'); }
    catch { return null; }
  }
});
