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
  const pad2 = (n)=> n.toString().padStart(2,'0');
  const toLocalDatetimeInputValue = (date) => {
    const d = new Date(date || Date.now());
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };
  const fromInputToISO = (dtLocalStr) => new Date(dtLocalStr).toISOString();

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
  // 1) Busca os atendimentos do chamado (sem join)
  const { data: atds, error: e1 } = await supa
    .from('atendimento_chamado')
    .select('id_atendimento, id_tecnico, hora_inicio_atendimento, hora_fim_atendimento') // confirme os nomes
    .eq('id_chamado', id)
    .order('hora_inicio_atendimento', { ascending: false }); // se o nome divergir, tire o order temporariamente

  if (e1) { console.error('carregarTecnicos(atendimento_chamado):', e1); return []; }
  if (!atds?.length) return [];

  // 2) Busca os usuários pelos IDs coletados
  const ids = [...new Set(atds.map(a => a.id_tecnico).filter(Boolean))];
  if (!ids.length) return atds.map(a => ({ ...a, usuario: null }));

  const { data: users, error: e2 } = await supa
    .from('usuario')
    .select('id, nome, categoria_nome');
    // NÃO filtre por categoria aqui; mostramos o que vier

  if (e2) { console.error('carregarTecnicos(usuario):', e2); return atds.map(a => ({ ...a, usuario: null })); }

  const mapa = new Map(users.map(u => [String(u.id), u]));
  return atds.map(a => ({ ...a, usuario: mapa.get(String(a.id_tecnico)) || null }));
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

    // técnicos (grave o id do técnico no <tr>)
    const tecnicos = await carregarTecnicos();
    const tbody = document.getElementById('tabela-tecnicos-body');
    tbody.innerHTML = tecnicos.length
      ? tecnicos.map(t => `
          <tr data-tecid="${safe(t.usuario?.id || t.id_tecnico) }" data-atdid="${safe(t.id_atendimento||'')}">
            <td>${safe(t.usuario?.nome)}</td>
            <td>${safe(t.usuario?.categoria_nome)}</td>
            <td>${fmt(t.hora_inicio_atendimento)}</td>
            <td>${t.hora_fim_atendimento ? fmt(t.hora_fim_atendimento) : '—'}</td>
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
    if (btnAtender)   btnAtender.disabled   = !(podeAtender && chamado.status_chamado === 'Aberto');
    if (btnFinalizar) btnFinalizar.disabled = !(podeFechar  && chamado.status_chamado !== 'Concluído');

    // após montar a tabela, injeta botão "Encerrar" nas linhas abertas
    posRenderEncerrarBind();
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

  // ---------- seleção de técnico (modal) ----------
  // elementos da modal
  const modalAdd  = document.getElementById('modal-add-tecnico');
  const inpBusca  = document.getElementById('inp-busca-tecnico');
  const listRes   = document.getElementById('lista-resultados-tecnico');
  const inpIni    = document.getElementById('inp-hora-inicio');
  const inpObsIni = document.getElementById('inp-obs-inicio');
  const btnConfAdd= document.getElementById('btn-confirmar-add-tecnico');
  let tecnicoSelecionado = null;

  function openModal(id){ document.getElementById(id).hidden = false; }
  function closeModal(id){ document.getElementById(id).hidden = true; }
  document.querySelectorAll('[data-close-modal]').forEach(btn=>{
    btn.addEventListener('click', e => closeModal(e.currentTarget.getAttribute('data-close-modal')));
  });

  // abre modal nos dois botões existentes
  [document.getElementById('btn-adicionar-tecnico'), document.getElementById('btn-add-tecnico')]
    .filter(Boolean)
    .forEach(b => b.addEventListener('click', () => {
      tecnicoSelecionado = null;
      listRes.innerHTML = '';
      inpBusca.value = '';
      inpObsIni.value = '';
      inpIni.value = toLocalDatetimeInputValue();
      btnConfAdd.disabled = true;
      openModal('modal-add-tecnico');
      setTimeout(()=>inpBusca?.focus(), 50);
    }));

  // busca com debounce
// busca (debounce simples)
let buscaTimer = null;
inpBusca.addEventListener('input', () => {
  clearTimeout(buscaTimer);
  const q = inpBusca.value.trim();
  if (!q){ listRes.innerHTML = ''; btnConfAdd.disabled = true; tecnicoSelecionado = null; return; }

  buscaTimer = setTimeout(async () => {
    try {
      const { data, error } = await supa
        .from('usuario')
        .select('id, nome, chapa, categoria_nome')
        .or(`nome.ilike.%${q}%,chapa.ilike.%${q}%`)
        .limit(20);
      if (error) throw error;

      if (!data?.length){
        listRes.innerHTML = `<li><span class="mc-result-name">Nenhum resultado</span></li>`;
        tecnicoSelecionado = null;
        btnConfAdd.disabled = true;
        return;
      }

      listRes.innerHTML = data.map(u => `
        <li data-userid="${u.id}" data-nome="${u.nome}" data-cat="${u.categoria_nome||''}">
          <span class="mc-result-name">${u.nome}</span>
          <span class="mc-result-meta">Chapa: ${u.chapa || '—'} • ${u.categoria_nome||'—'}</span>
        </li>
      `).join('');

      listRes.querySelectorAll('li[data-userid]').forEach(li => {
        li.addEventListener('click', () => {
          listRes.querySelectorAll('li').forEach(x => x.style.background='');
          li.style.background = '#eef2ff';
          tecnicoSelecionado = {
            id:   li.getAttribute('data-userid'),
            nome: li.getAttribute('data-nome'),
            cat:  li.getAttribute('data-cat') || ''
          };
          btnConfAdd.disabled = false;
        });
      });
    } catch (e) {
      console.error('Erro na busca de técnico:', e);
      alert('Erro ao buscar técnico: ' + (e?.message || e));
    }
  }, 300);
});


  // confirmar inclusão
  btnConfAdd?.addEventListener('click', async () => {
    if (!tecnicoSelecionado) return;
    const dtIniLocal = inpIni.value || toLocalDatetimeInputValue();
    const dtIniISO   = fromInputToISO(dtIniLocal);
    const obs        = inpObsIni.value?.trim() || 'Início por inclusão manual';

    const { error: eIns } = await supa.from('atendimento_chamado').insert([{
      id_chamado: id,
      id_tecnico: tecnicoSelecionado.id,
      hora_inicio_atendimento: dtIniISO,
      descricao_andamento: obs
    }]);
    if (eIns){ console.error(eIns); return alert('Erro ao iniciar atendimento para o técnico.'); }

    await supa.from('historico_acao').insert([{
      tipo_acao: 'Atendimento iniciado',
      descricao_acao: `Técnico ${tecnicoSelecionado.nome} iniciou atendimento. ${obs ? '('+obs+')' : ''}`,
      id_usuario: user?.id || null,
      id_chamado: id
    }]);

    closeModal('modal-add-tecnico');
    await render();
  });

  // ---------- encerrar técnico por linha ----------
  const modalEnd   = document.getElementById('modal-end-tecnico');
  const endInfo    = document.getElementById('end-tec-info');
  const inpHoraFim = document.getElementById('inp-hora-fim');
  const btnConfEnd = document.getElementById('btn-confirmar-end-tecnico');
  let endContext = { idAtd:null, nome:'', horaInicio:null };

  function posRenderEncerrarBind() {
    document.querySelectorAll('table.tabela-tecnicos tbody tr').forEach(tr => {
      const cols = tr.querySelectorAll('td');
      const tecId = tr.getAttribute('data-tecid');
      const atdId = tr.getAttribute('data-atdid'); // se já veio do select

      // só cria botão se a coluna "Fim" é — (aberto)
      if (cols.length === 4 && cols[3].textContent.trim() === '—') {
        const btn = document.createElement('button');
        btn.textContent = 'Encerrar';
        btn.style.marginLeft = '8px';

        btn.addEventListener('click', async () => {
          // busca o atendimento ABERTO desse técnico específico
          let atd;
          if (atdId) {
            const { data } = await supa
              .from('atendimento_chamado')
              .select('id_atendimento, hora_inicio_atendimento')
              .eq('id_atendimento', atdId)
              .maybeSingle();
            atd = data;
          } else {
            const { data } = await supa
              .from('atendimento_chamado')
              .select('id_atendimento, hora_inicio_atendimento')
              .eq('id_chamado', id)
              .eq('id_tecnico', tecId)
              .is('hora_fim_atendimento', null)
              .maybeSingle();
            atd = data;
          }

          if (!atd) return alert('Atendimento aberto não encontrado para este técnico.');

          endContext = {
            idAtd: atd.id_atendimento,
            nome: cols[0].textContent.trim(),
            horaInicio: atd.hora_inicio_atendimento
          };
          endInfo.textContent = `Técnico: ${endContext.nome} • Início: ${cols[2].textContent.trim()}`;
          inpHoraFim.value = toLocalDatetimeInputValue();
          openModal('modal-end-tecnico');
        });

        cols[3].innerHTML = '— ';
        cols[3].appendChild(btn);
      }
    });
  }

  btnConfEnd?.addEventListener('click', async () => {
    const dtFimLocal = inpHoraFim.value || toLocalDatetimeInputValue();
    const dtFimISO   = fromInputToISO(dtFimLocal);

    if (endContext.horaInicio) {
      const tIni = new Date(endContext.horaInicio).getTime();
      const tFim = new Date(dtFimISO).getTime();
      if (tFim <= tIni) return alert('A hora de término deve ser maior que a de início.');
    }

    const { error: eEnd } = await supa
      .from('atendimento_chamado')
      .update({ hora_fim_atendimento: dtFimISO })
      .eq('id_atendimento', endContext.idAtd);
    if (eEnd) { console.error(eEnd); return alert('Erro ao encerrar atendimento.'); }

    await supa.from('historico_acao').insert([{
      tipo_acao: 'Atendimento encerrado',
      descricao_acao: `Técnico ${endContext.nome} encerrou o atendimento.`,
      id_usuario: user?.id || null,
      id_chamado: id
    }]);

    closeModal('modal-end-tecnico');
    await render();
  });

  // histórico: adicionar nota
  const btnNota = document.getElementById('btn-adicionar-nota');
  btnNota?.addEventListener('click', async () => {
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

  // barra de ações
  document.getElementById('btn-atender')?.addEventListener('click', iniciarAtendimento);
  document.getElementById('btn-finalizar')?.addEventListener('click', finalizarChamado);
  document.getElementById('btn-pendencia')?.addEventListener('click', criarPendencia);
  document.getElementById('btn-anexo')?.addEventListener('click', abrirAnexoModal);

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
    if (typeof window.abrirAnexo === 'function') window.abrirAnexo();
    else alert('Função de anexo não disponível nesta página.');
  }

  function getUser() {
    try { return JSON.parse(localStorage.getItem('mcv_user') || 'null'); }
    catch { return null; }
  }

  // init
  await render();
});
