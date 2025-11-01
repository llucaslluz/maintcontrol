document.addEventListener('DOMContentLoaded', async () => {
  const supa = window.supabase;
  const user = getUser();
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) return alert('ID do chamado não informado.');

  // permissões simples por categoria
  const papel = (user?.categoria_nome || '').toLowerCase();
  const podeAtender = (papel === 'técnico' || papel === 'tecnico' || papel === 'supervisor' || papel === 'administrador');
  const podeFechar  = (papel === 'técnico' || papel === 'tecnico' || papel === 'supervisor' || papel === 'administrador');

  // helpers
  const fmt  = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—';
  const safe = (s) => (s ?? '').toString();

  // ---------- loads ----------
  async function carregarChamado() {
    const { data, error } = await supa
      .from('chamado')
      .select(`
        id_chamado, descricao_problema, prioridade, status_chamado,
        data_hora_abertura, data_hora_fechamento,
        solucao_aplicada, observacao_fechamento,
        local:local (nome_local),
        maquina:maquina_dispositivo (nome_maquina),
        solicitante:usuario!chamado_id_solicitante_fkey (nome, chapa)
      `)
      .eq('id_chamado', id)
      .maybeSingle();
    if (error) { console.error(error); alert('Erro ao carregar chamado.'); return null; }
    return data;
  }

  async function carregarHistorico() {
    const { data, error } = await supa
      .from('historico_acao')
      .select('tipo_acao, descricao_acao, data_hora_acao, usuario:usuario (nome)')
      .eq('id_chamado', id)
      .order('data_hora_acao', { ascending: false });
    if (error) { console.error(error); return []; }
    return data || [];
  }

  async function carregarTecnicos() {
    const { data, error } = await supa
      .from('atendimento_chamado')
      .select(`
        id_atendimento, hora_inicio_atendimento, hora_fim_atendimento,
        usuario:usuario (id, nome, categoria_nome)
      `)
      .eq('id_chamado', id)
      .order('hora_inicio_atendimento', { ascending: false });
    if (error) { console.error(error); return []; }
    return data || [];
  }

  async function carregarPendencias() {
    const { data, error } = await supa
      .from('pendencia')
      .select('id_pendencia, descricao_pendencia, status_pendencia, data_criacao, usuario:usuario (nome)')
      .eq('id_chamado', id)
      .order('data_criacao', { ascending: false });
    if (error) { console.error(error); return []; }
    return data || [];
  }

  async function carregarAnexos() {
    const { data, error } = await supa
      .from('anexo')
      .select('id_anexo, nome_arquivo, url_arquivo, data_upload')
      .eq('id_chamado', id)
      .order('data_upload', { ascending: false });
    if (error) { console.error(error); return []; }
    return data || [];
  }

  // ---------- render ----------
  async function render() {
    const chamado = await carregarChamado();
    if (!chamado) return;

    // header
    document.getElementById('det-id').textContent = `#${chamado.id_chamado}`;
    const statusEl = document.getElementById('det-status');
    statusEl.textContent = safe(chamado.status_chamado);
    statusEl.dataset.status = safe(chamado.status_chamado);

    const prioridadeEl = document.getElementById('det-prioridade');
    prioridadeEl.textContent = safe(chamado.prioridade);
    prioridadeEl.dataset.prioridade = safe(chamado.prioridade);

    document.getElementById('det-local').textContent   = safe(chamado.local?.nome_local);
    document.getElementById('det-maquina').textContent = safe(chamado.maquina?.nome_maquina);
    document.getElementById('det-solicitante').textContent =
      `${safe(chamado.solicitante?.nome)} (${safe(chamado.solicitante?.chapa)})`;
    document.getElementById('det-abertura').textContent   = fmt(chamado.data_hora_abertura);
    document.getElementById('det-fechamento').textContent = fmt(chamado.data_hora_fechamento);
    document.getElementById('det-descricao').textContent  = safe(chamado.descricao_problema);

    document.getElementById('det-solucao').textContent =
      chamado.status_chamado === 'Concluído'
        ? safe(chamado.solucao_aplicada || chamado.observacao_fechamento || '—')
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
      ? anexos.map(a => `<p>📄 <a href="${a.url_arquivo}" target="_blank" rel="noopener">${safe(a.nome_arquivo)}</a> — ${fmt(a.data_upload)}</p>`).join('')
      : '<p>Nenhum anexo enviado.</p>';

    // estado dos botões (barra de ações)
    const btnAtender  = document.getElementById('btn-atender');
    const btnFinalizar= document.getElementById('btn-finalizar');

    btnAtender.disabled   = !(podeAtender && chamado.status_chamado === 'Aberto');
    btnFinalizar.disabled = !(podeFechar  && chamado.status_chamado !== 'Concluído');
  }

  // ---------- ações ----------
  async function iniciarAtendimento() {
    if (!podeAtender) return alert('Sem permissão.');

    // verifica atendimento aberto (qualquer técnico)
    const { data: abertos, error: eCheck } = await supa
      .from('atendimento_chamado')
      .select('id_atendimento')
      .eq('id_chamado', id)
      .is('hora_fim_atendimento', null)
      .limit(1);

    if (eCheck) { console.error(eCheck); return alert('Erro ao validar atendimento aberto.'); }

    const descricao = prompt('Descrição do início do atendimento (opcional):') || 'Atendimento iniciado';

    // cria um atendimento para o usuário atual somente se não houver nenhum aberto
    if (!abertos?.length) {
      const { error: eIns } = await supa.from('atendimento_chamado').insert([{
        id_chamado: id,
        id_tecnico: user?.id || null,
        hora_inicio_atendimento: new Date().toISOString(),
        descricao_andamento: descricao
      }]);
      if (eIns) { console.error(eIns); return alert('Erro ao criar atendimento.'); }
    }

    // atualiza status do chamado
    const { error: eUp } = await supa
      .from('chamado')
      .update({ status_chamado: 'Em Andamento' })
      .eq('id_chamado', id);
    if (eUp) { console.error(eUp); return alert('Erro ao atualizar status do chamado.'); }

    // histórico
    await supa.from('historico_acao').insert([{
      tipo_acao: 'Atendimento iniciado',
      descricao_acao: `${user?.nome || 'Usuário'}: ${descricao}`,
      id_usuario: user?.id || null,
      id_chamado: id
    }]);

    await render();
    alert('Atendimento iniciado.');
  }

  async function finalizarChamado() {
    if (!podeFechar) return alert('Sem permissão.');

    const solucao = prompt('Descreva a solução/observações de fechamento (obrigatório para concluir):');
    if (solucao === null || solucao.trim() === '') return;

    const agora = new Date().toISOString();

    // encerra atendimentos em aberto
    const { error: eClose } = await supa
      .from('atendimento_chamado')
      .update({ hora_fim_atendimento: agora })
      .eq('id_chamado', id)
      .is('hora_fim_atendimento', null);
    if (eClose) { console.error(eClose); return alert('Erro ao encerrar atendimento em aberto.'); }

    // fecha chamado
    const { error: eUp } = await supa
      .from('chamado')
      .update({
        status_chamado: 'Concluído',
        data_hora_fechamento: agora,
        solucao_aplicada: solucao,
        observacao_fechamento: solucao
      })
      .eq('id_chamado', id);
    if (eUp) { console.error(eUp); return alert('Erro ao finalizar chamado.'); }

    // histórico
    await supa.from('historico_acao').insert([{
      tipo_acao: 'Fechamento',
      descricao_acao: `${user?.nome || 'Usuário'} finalizou o chamado. ${solucao}`,
      id_usuario: user?.id || null,
      id_chamado: id
    }]);

    await render();
    alert('Chamado finalizado.');
  }

  async function adicionarTecnico() {
    if (!podeAtender) return alert('Sem permissão.');

    const entrada = prompt('Digite o NOME ou CHAPA do técnico que vai iniciar atendimento:');
    if (!entrada) return;

    // tenta achar por chapa exata primeiro; depois por nome (ilike)
    let tecnico = null;

    const { data: porChapa } = await supa
      .from('usuario')
      .select('id, nome, categoria_nome, chapa')
      .eq('chapa', entrada)
      .limit(1);
    if (porChapa && porChapa.length) {
      tecnico = porChapa[0];
    } else {
      const { data: porNome } = await supa
        .from('usuario')
        .select('id, nome, categoria_nome, chapa')
        .ilike('nome', `%${entrada}%`)
        .limit(1);
      tecnico = porNome?.[0] || null;
    }

    if (!tecnico) return alert('Técnico não encontrado.');

    // se já existe atendimento aberto para esse técnico, oferece encerrar
    const { data: atdAberto } = await supa
      .from('atendimento_chamado')
      .select('id_atendimento')
      .eq('id_chamado', id)
      .eq('id_tecnico', tecnico.id)
      .is('hora_fim_atendimento', null)
      .limit(1);

    if (atdAberto?.length) {
      const encerrar = confirm(`O técnico ${tecnico.nome} já está em atendimento. Deseja encerrar agora?`);
      if (encerrar) {
        const { error: eEnd } = await supa
          .from('atendimento_chamado')
          .update({ hora_fim_atendimento: new Date().toISOString() })
          .eq('id_chamado', id)
          .eq('id_tecnico', tecnico.id)
          .is('hora_fim_atendimento', null);
        if (eEnd) { console.error(eEnd); return alert('Erro ao encerrar atendimento do técnico.'); }

        await supa.from('historico_acao').insert([{
          tipo_acao: 'Atendimento encerrado',
          descricao_acao: `Técnico ${tecnico.nome} encerrou o atendimento.`,
          id_usuario: user?.id || null,
          id_chamado: id
        }]);
      }
    } else {
      // cria novo atendimento
      const { error: eIns } = await supa.from('atendimento_chamado').insert([{
        id_chamado: id,
        id_tecnico: tecnico.id,
        hora_inicio_atendimento: new Date().toISOString(),
        descricao_andamento: 'Início por inclusão manual'
      }]);
      if (eIns) { console.error(eIns); return alert('Erro ao iniciar atendimento para o técnico.'); }

      await supa.from('historico_acao').insert([{
        tipo_acao: 'Atendimento iniciado',
        descricao_acao: `Técnico ${tecnico.nome} iniciou atendimento.`,
        id_usuario: user?.id || null,
        id_chamado: id
      }]);
    }

    await render();
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

    await supa.from('historico_acao').insert([{
      tipo_acao: 'Pendência',
      descricao_acao: `Criada pendência: ${desc}`,
      id_usuario: user?.id || null,
      id_chamado: id
    }]);

    await render();
  }

  function abrirAnexoModal() {
    // se sua página já tem função global abrirAnexo() (do anexoModal.js), usa ela
    if (typeof window.abrirAnexo === 'function') {
      window.abrirAnexo();
    } else {
      alert('Função de anexo não disponível nesta página.');
    }
  }

  // ---------- binds ----------
  await render();

  // histórico: adicionar nota
  const btnNota = document.getElementById('btn-adicionar-nota');
  if (btnNota) btnNota.addEventListener('click', async () => {
    const desc = prompt('Digite a observação/anotação:');
    if (!desc) return;
    await supa.from('historico_acao').insert([{
      tipo_acao: 'Anotação',
      descricao_acao: desc,
      id_usuario: user?.id || null,
      id_chamado: id
    }]);
    await render();
  });

  // técnicos (na caixa e na barra)
  const btnAddTecBox = document.getElementById('btn-adicionar-tecnico');
  if (btnAddTecBox) btnAddTecBox.addEventListener('click', adicionarTecnico);

  const btnAddTecBar = document.getElementById('btn-add-tecnico');
  if (btnAddTecBar) btnAddTecBar.addEventListener('click', adicionarTecnico);

  // barra de ações
  const btnAtender   = document.getElementById('btn-atender');
  const btnFinalizar = document.getElementById('btn-finalizar');
  const btnPendencia = document.getElementById('btn-pendencia');
  const btnAnexo     = document.getElementById('btn-anexo');

  if (btnAtender)   btnAtender.addEventListener('click', iniciarAtendimento);
  if (btnFinalizar) btnFinalizar.addEventListener('click', finalizarChamado);
  if (btnPendencia) btnPendencia.addEventListener('click', criarPendencia);
  if (btnAnexo)     btnAnexo.addEventListener('click', abrirAnexoModal);

  // util
  function getUser() {
    try { return JSON.parse(localStorage.getItem('mcv_user') || 'null'); }
    catch { return null; }
  }
});
