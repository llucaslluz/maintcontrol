document.addEventListener('DOMContentLoaded', async () => {
  const supa = window.supabase;
  const user = getUser();
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) return alert('ID do chamado não informado.');

  // helper formatadores
  const fmt = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—';
  const safe = (s) => (s ?? '').toString();

  async function carregarChamado() {
    const { data, error } = await supa
      .from('chamado')
      .select(`
        id_chamado, descricao_problema, prioridade, status_chamado,
        data_hora_abertura, data_hora_fechamento, solucao_aplicada, observacao_fechamento,
        local:local (nome_local),
        maquina:maquina_dispositivo (nome_maquina),
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

  async function carregarHistorico() {
    const { data } = await supa
      .from('historico_acao')
      .select('tipo_acao, descricao_acao, data_hora_acao, usuario:usuario (nome)')
      .eq('id_chamado', id)
      .order('data_hora_acao', { ascending: false });
    return data || [];
  }

  async function carregarTecnicos() {
    const { data } = await supa
      .from('atendimento_chamado')
      .select(`
        hora_inicio_atendimento, hora_fim_atendimento,
        usuario:usuario (nome, categoria_nome)
      `)
      .eq('id_chamado', id);
    return data || [];
  }

  async function carregarPendencias() {
    const { data } = await supa
      .from('pendencia')
      .select('id_pendencia, descricao_pendencia, status_pendencia, data_criacao, usuario:usuario (nome)')
      .eq('id_chamado', id);
    return data || [];
  }

  async function carregarAnexos() {
    const { data } = await supa
      .from('anexo')
      .select('id_anexo, nome_arquivo, url_arquivo, data_upload')
      .eq('id_chamado', id);
    return data || [];
  }

  async function render() {
    const chamado = await carregarChamado();
    if (!chamado) return;

    // cabeçalho
    document.getElementById('det-id').textContent = `#${chamado.id_chamado}`;
    const statusEl = document.getElementById('det-status');
    statusEl.textContent = safe(chamado.status_chamado);
    statusEl.dataset.status = safe(chamado.status_chamado);
    const prioridadeEl = document.getElementById('det-prioridade');
    prioridadeEl.textContent = safe(chamado.prioridade);
    prioridadeEl.dataset.prioridade = safe(chamado.prioridade);

    document.getElementById('det-local').textContent = safe(chamado.local?.nome_local);
    document.getElementById('det-maquina').textContent = safe(chamado.maquina?.nome_maquina);
    document.getElementById('det-solicitante').textContent = `${safe(chamado.solicitante?.nome)} (${safe(chamado.solicitante?.chapa)})`;
    document.getElementById('det-abertura').textContent = fmt(chamado.data_hora_abertura);
    document.getElementById('det-fechamento').textContent = fmt(chamado.data_hora_fechamento);
    document.getElementById('det-descricao').textContent = safe(chamado.descricao_problema);
    document.getElementById('det-solucao').textContent =
      chamado.status_chamado === 'Concluído'
        ? `${safe(chamado.solucao_aplicada || chamado.observacao_fechamento)}`
        : 'A solução será exibida quando o chamado for finalizado.';

    // histórico
    const hist = await carregarHistorico();
    const histUl = document.getElementById('lista-historico');
    histUl.innerHTML = hist.length
      ? hist.map(h =>
        `<li>[${fmt(h.data_hora_acao)}] ${safe(h.usuario?.nome)} — ${safe(h.tipo_acao)}: ${safe(h.descricao_acao)}</li>`
      ).join('')
      : '<li>Sem histórico.</li>';

    // técnicos
    const tecnicos = await carregarTecnicos();
    const tbody = document.getElementById('tabela-tecnicos-body');
    tbody.innerHTML = tecnicos.length
      ? tecnicos.map(t => `
          <tr>
            <td>${safe(t.usuario?.nome)}</td>
            <td>${safe(t.usuario?.categoria_nome)}</td>
            <td>${fmt(t.hora_inicio_atendimento)}</td>
            <td>${fmt(t.hora_fim_atendimento)}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="4">Nenhum técnico em atendimento.</td></tr>';

    // pendências
    const pendencias = await carregarPendencias();
    const pendUl = document.getElementById('lista-pendencias');
    pendUl.innerHTML = pendencias.length
      ? pendencias.map(p =>
        `<li>[${fmt(p.data_criacao)}] (${safe(p.status_pendencia)}) ${safe(p.descricao_pendencia)} — ${safe(p.usuario?.nome)}</li>`
      ).join('')
      : '<li>Sem pendências registradas.</li>';

    // anexos
    const anexos = await carregarAnexos();
    const anexDiv = document.getElementById('lista-anexos');
    anexDiv.innerHTML = anexos.length
      ? anexos.map(a => `<p>📄 <a href="${a.url_arquivo}" target="_blank">${safe(a.nome_arquivo)}</a> — ${fmt(a.data_upload)}</p>`).join('')
      : '<p>Nenhum anexo enviado.</p>';
  }

  // inicializa
  await render();

  // botão adicionar nota
  document.getElementById('btn-adicionar-nota').addEventListener('click', async () => {
    const desc = prompt('Digite a observação ou anotação:');
    if (!desc) return;
    await supa.from('historico_acao').insert([{
      tipo_acao: 'Anotação',
      descricao_acao: desc,
      id_usuario: user?.id,
      id_chamado: id
    }]);
    await render();
  });

  function getUser() {
    try { return JSON.parse(localStorage.getItem('mcv_user') || 'null'); }
    catch { return null; }
  }
});
