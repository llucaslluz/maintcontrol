document.addEventListener('DOMContentLoaded', async () => {
  const supa = window.supabase;
  const user = getUser();
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) return alert('ID do chamado não informado.');

  // ===== permissões simples por categoria
  const papel = (user?.categoria_nome || '').toLowerCase();
  const podeAtender = ['técnico','tecnico','supervisor','administrador'].includes(papel);
  const podeFechar  = ['técnico','tecnico','supervisor','administrador'].includes(papel);

  // ===== helpers gerais
  const fmt  = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—';
  const safe = (s) => (s ?? '').toString();
  const pad2 = (n)=> n.toString().padStart(2,'0');
  const toLocalDatetimeInputValue = (date) => {
    const d = new Date(date || Date.now());
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };
  const fromInputToISO = (dtLocalStr) => new Date(dtLocalStr).toISOString();
  const pickUserPK = (u) => u?.id ?? u?.id_usuario ?? u?.usuario_id ?? u?.uuid ?? u?.user_id ?? null;

  // ===== loads
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
  const { data: atds, error: e1 } = await supa
    .from('atendimento_chamado')
    .select(`
      id_atendimento,
      id_tecnico,
      hora_inicio_atendimento,
      data_hora_inicio_atendimento,
      hora_fim_atendimento,
      data_hora_fim_atendimento
    `)
    .eq('id_chamado', id);
  if (e1) { console.error('carregarTecnicos(atd):', e1); return []; }
  if (!atds?.length) return [];

  const ids = [...new Set(atds.map(a => a.id_tecnico).filter(Boolean))].map(String);
  if (!ids.length) return atds.map(a => ({ ...a, usuario: null }));

  let users = [];
  try {
    const r1 = await supa.from('usuario').select('*').in('id', ids);
    if (r1.error) throw r1.error;
    users = r1.data || [];
  } catch (e) {
    try {
      const r2 = await supa.from('usuario').select('*').in('id_usuario', ids);
      if (r2.error) throw r2.error;
      users = r2.data || [];
    } catch (e2) {
      console.error('carregarTecnicos(usuario):', e, e2);
      users = [];
    }
  }

  const getPK = (u)=> (pickUserPK(u) ?? '').toString();
  const mapa = new Map(users.map(u => [getPK(u), u]));
  return atds.map(a => ({ ...a, usuario: mapa.get(String(a.id_tecnico)) || null }));
}

  async function carregarPendencias() {
    const { data, error } = await supa
      .from('pendencia')
      .select('id_pendencia, descricao_pendencia, status_pendencia, data_criacao, usuario:usuario (nome)')
      .eq('id_chamado', id);
      // .order('data_criacao', { ascending: false }) // reative quando confirmar o nome
    if (error) { console.error(error); return []; }
    return data || [];
  }

  async function carregarAnexos() {
    const { data, error } = await supa
      .from('anexo')
      .select('id_anexo, nome_arquivo, url_arquivo, data_upload')
      .eq('id_chamado', id);
      // .order('data_upload', { ascending: false }) // reative quando confirmar o nome
    if (error) { console.error(error); return []; }
    return data || [];
  }

  function getInicio(t){
  return t.hora_inicio_atendimento
      || t.data_hora_inicio_atendimento
      || t.inicio_atendimento
      || null;
}
function getFim(t){
  return t.hora_fim_atendimento
      || t.data_hora_fim_atendimento
      || t.fim_atendimento
      || null;
}


  // ===== render
  async function render() {
    const chamado = await carregarChamado();
    if (!chamado) return;

    // header/topbar
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

    // onde monta as linhas dos técnicos
tbody.innerHTML = tecnicos.length
  ? tecnicos.map(t => `
      <tr data-tecid="${safe(t.id_tecnico)}" data-atdid="${safe(t.id_atendimento||'')}">
        <td>${safe(t.usuario?.nome || '—')}</td>
        <td>${safe(t.usuario?.cargo || t.usuario?.categoria_nome || '—')}</td>
        <td>${fmt(getInicio(t))}</td>
        <td>${getFim(t) ? fmt(getFim(t)) : '—'}</td>
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

    // estado botões
    const btnAtender  = document.getElementById('btn-atender');
    const btnFinalizar= document.getElementById('btn-finalizar');
    if (btnAtender)   btnAtender.disabled   = !(podeAtender && chamado.status_chamado === 'Aberto');
    if (btnFinalizar) btnFinalizar.disabled = !(podeFechar  && chamado.status_chamado !== 'Concluído');

    // ações por linha (encerrar)
    posRenderEncerrarBind();
  }

  // ===== ações principais
  async function iniciarAtendimento() {
    if (!podeAtender) return alert('Sem permissão.');

    // evita atendimento duplicado
    const { data: abertos, error: eCheck } = await supa
      .from('atendimento_chamado')
      .select('id_atendimento')
      .eq('id_chamado', id)
      .is('hora_fim_atendimento', null)
      .limit(1);
    if (eCheck) { console.error(eCheck); return alert('Erro ao validar atendimento aberto.'); }

    const descricao = prompt('Descrição do início do atendimento (opcional):') || 'Atendimento iniciado';

    if (!abertos?.length) {
      const { error: eIns } = await supa.from('atendimento_chamado').insert([{
        id_chamado: id,
        id_tecnico: user?.id || null,
        hora_inicio_atendimento: new Date().toISOString(),
        descricao_andamento: descricao
      }]);
      if (eIns) { console.error(eIns); return alert('Erro ao criar atendimento.'); }
    }

    const { error: eUp } = await supa
      .from('chamado')
      .update({ status_chamado: 'Em Andamento' })
      .eq('id_chamado', id);
    if (eUp) { console.error(eUp); return alert('Erro ao atualizar status do chamado.'); }

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

    const { error: eClose } = await supa
      .from('atendimento_chamado')
      .update({ hora_fim_atendimento: agora })
      .eq('id_chamado', id)
      .is('hora_fim_atendimento', null);
    if (eClose) { console.error(eClose); return alert('Erro ao encerrar atendimento em aberto.'); }

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

    await supa.from('historico_acao').insert([{
      tipo_acao: 'Fechamento',
      descricao_acao: `${user?.nome || 'Usuário'} finalizou o chamado. ${solucao}`,
      id_usuario: user?.id || null,
      id_chamado: id
    }]);

    await render();
    alert('Chamado finalizado.');
  }

  // ===== seleção de técnico (modal)
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

  // busca de técnico (nome/chapa), sem assumir nome do PK
  let buscaTimer = null;
  inpBusca?.addEventListener('input', () => {
    clearTimeout(buscaTimer);
    const q = inpBusca.value.trim();
    if (!q){ listRes.innerHTML = ''; btnConfAdd.disabled = true; tecnicoSelecionado = null; return; }
    buscaTimer = setTimeout(async () => {
      try {
        const { data, error } = await supa
          .from('usuario')
          .select('*')
          .or(`nome.ilike.%${q}%,chapa.ilike.%${q}%`)
          .limit(20);
        if (error) throw error;

        if (!data?.length){
          listRes.innerHTML = `<li><span class="mc-result-name">Nenhum resultado</span></li>`;
          tecnicoSelecionado = null;
          btnConfAdd.disabled = true;
          return;
        }

        listRes.innerHTML = data.map(u => {
          const pk = pickUserPK(u);
          return `
            <li data-userid="${pk}" data-nome="${u.nome||'-'}" data-cat="${u.categoria_nome||''}">
              <span class="mc-result-name">${u.nome||'-'}</span>
              <span class="mc-result-meta">Chapa: ${u.chapa || '—'} • ${u.categoria_nome||'—'}</span>
            </li>
          `;
        }).join('');

        listRes.querySelectorAll('li[data-userid]').forEach(li => {
          li.addEventListener('click', () => {
            listRes.querySelectorAll('li').forEach(x => x.style.background='');
            li.style.background = '#eef2ff';
            tecnicoSelecionado = {
              id:   li.getAttribute('data-userid'),
              nome: li.getAttribute('data-nome'),
              cat:  li.getAttribute('data-cat') || ''
            };
            btnConfAdd.disabled = !tecnicoSelecionado.id;
          });
        });
      } catch (e) {
        console.error('Erro na busca de técnico:', e);
        alert('Erro ao buscar técnico: ' + (e?.message || e));
      }
    }, 300);
  });

  // confirmar inclusão do técnico selecionado
  btnConfAdd?.addEventListener('click', async () => {
    if (!tecnicoSelecionado) return alert('Selecione um técnico.');
    const dtIniLocal = inpIni.value || toLocalDatetimeInputValue();
    const dtIniISO   = fromInputToISO(dtIniLocal);
    const obs        = inpObsIni.value?.trim() || 'Início por inclusão manual';

    try {
      const { error: eIns } = await supa.from('atendimento_chamado').insert([{
        id_chamado: id,
        id_tecnico: tecnicoSelecionado.id,
        hora_inicio_atendimento: dtIniISO,
        descricao_andamento: obs
      }]);
      if (eIns) throw eIns;

      await supa.from('historico_acao').insert([{
        tipo_acao: 'Atendimento iniciado',
        descricao_acao: `Técnico ${tecnicoSelecionado.nome} iniciou atendimento. ${obs ? '('+obs+')' : ''}`,
        id_usuario: user?.id || null,
        id_chamado: id
      }]);

      closeModal('modal-add-tecnico');
      await render();
    } catch (e) {
      console.error('Erro ao adicionar técnico:', e);
      alert('Não foi possível adicionar o técnico: ' + (e?.message || e));
    }
  });

  // ===== encerrar técnico por linha
  const endInfo    = document.getElementById('end-tec-info');
  const inpHoraFim = document.getElementById('inp-hora-fim');
  const btnConfEnd = document.getElementById('btn-confirmar-end-tecnico');
  let endContext = { idAtd:null, nome:'', horaInicio:null };

  function posRenderEncerrarBind() {
    document.querySelectorAll('table.tabela-tecnicos tbody tr').forEach(tr => {
      const cols = tr.querySelectorAll('td');
      const tecId = tr.getAttribute('data-tecid');
      const atdId = tr.getAttribute('data-atdid');

      if (cols.length === 4 && cols[3].textContent.trim() === '—') {
        const btn = document.createElement('button');
        btn.textContent = 'Encerrar';
        btn.style.marginLeft = '8px';

        btn.addEventListener('click', async () => {
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

  // tenta com "hora_fim_atendimento"; se a coluna não existir, tenta "data_hora_fim_atendimento"
  let ok = false, err1 = null, err2 = null;

  try {
    const { error } = await supa
      .from('atendimento_chamado')
      .update({ hora_fim_atendimento: dtFimISO })
      .eq('id_atendimento', endContext.idAtd);
    if (error) throw error;
    ok = true;
  } catch (e) {
    err1 = e;
    try {
      const { error } = await supa
        .from('atendimento_chamado')
        .update({ data_hora_fim_atendimento: dtFimISO })
        .eq('id_atendimento', endContext.idAtd);
      if (error) throw error;
      ok = true;
    } catch (e2) {
      err2 = e2;
    }
  }

  if (!ok) {
    console.error('Erro ao encerrar atendimento:', err1, err2);
    return alert('Erro ao encerrar atendimento (ver console).');
  }

  await supa.from('historico_acao').insert([{
    tipo_acao: 'Atendimento encerrado',
    descricao_acao: `Técnico ${endContext.nome} encerrou o atendimento.`,
    id_usuario: user?.id || null,
    id_chamado: id
  }]);

  closeModal('modal-end-tecnico');
  await render();
});


  // ===== histórico: adicionar nota
  document.getElementById('btn-adicionar-nota')?.addEventListener('click', async () => {
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

  // ===== barra de ações
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
