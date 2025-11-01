document.addEventListener('DOMContentLoaded', async () => {
  const supa = window.supabase;
  const user = getUser();
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) return alert('ID do chamado não informado.');

  // ===== permissões
  const papel = (user?.categoria_nome || '').toLowerCase();
  const podeAtender = ['técnico','tecnico','supervisor','administrador'].includes(papel);
  const podeFechar  = ['técnico','tecnico','supervisor','administrador'].includes(papel);

  // ===== helpers
  const fmt  = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—';
  const safe = (s) => (s ?? '').toString();
  const pad2 = (n)=> n.toString().padStart(2,'0');
  const toLocalDatetimeInputValue = (date) => {
    const d = new Date(date || Date.now());
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };
  const fromInputToISO = (dtLocalStr) => new Date(dtLocalStr).toISOString();
  const pickUserPK = (u) => u?.id ?? u?.id_usuario ?? u?.usuario_id ?? u?.uuid ?? u?.user_id ?? null;

  // campos variantes de atendimento
  const getInicio = (t)=> t.hora_inicio_atendimento || t.data_hora_inicio_atendimento || t.inicio_atendimento || null;
  const getFim    = (t)=> t.hora_fim_atendimento   || t.data_hora_fim_atendimento   || t.fim_atendimento    || null;

  // campos variantes de anexo
  const getAnexoNome = (a)=> a.nome_arquivo || a.nome || a.file_name || a.titulo || 'arquivo';
  const getAnexoURL  = (a)=> a.url_arquivo  || a.url  || a.link      || a.caminho || a.path || '#';
  const getAnexoData = (a)=> a.data_upload  || a.created_at || a.data || a.inserido_em || null;

  // buscar usuários por ids (sem assumir PK)
  async function fetchUsersByIds(idsStringArray){
    if (!idsStringArray?.length) return new Map();
    const ids = [...new Set(idsStringArray.map(String))];

    // tenta por id
    try {
      const r1 = await supa.from('usuario').select('*').in('id', ids);
      if (r1.error) throw r1.error;
      const map1 = new Map((r1.data||[]).map(u => [String(pickUserPK(u)), u]));
      if (map1.size) return map1;
    } catch {}

    // tenta por id_usuario
    try {
      const r2 = await supa.from('usuario').select('*').in('id_usuario', ids);
      if (r2.error) throw r2.error;
      return new Map((r2.data||[]).map(u => [String(pickUserPK(u)), u]));
    } catch (e) {
      console.error('fetchUsersByIds:', e);
      return new Map();
    }
  }

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
    // 1) atendimentos
    const { data: atds, error: e1 } = await supa
      .from('atendimento_chamado')
      .select('id_atendimento, id_tecnico, hora_inicio_atendimento, hora_fim_atendimento, data_hora_inicio_atendimento, data_hora_fim_atendimento')
      .eq('id_chamado', id);
    if (e1) { console.error('carregarTecnicos(atd):', e1); return []; }
    if (!atds?.length) return [];

    // 2) map de usuários
    const ids = atds.map(a => a.id_tecnico).filter(Boolean).map(String);
    const usersMap = await fetchUsersByIds(ids);

    // 3) enriquece
    return atds.map(a => {
      const u = usersMap.get(String(a.id_tecnico)) || null;
      return { ...a, usuario: u };
    });
  }

  async function carregarPendencias() {
    // sem embed (evita PGRST201). Depois enriquecemos com nome do autor.
    const { data, error } = await supa
      .from('pendencia')
      .select('id_pendencia, descricao_pendencia, status_pendencia, data_criacao, created_at, data, inserido_em, id_usuario_criador')
      .eq('id_chamado', id);
    if (error) { console.error(error); return []; }
    const ids = (data||[]).map(p => p.id_usuario_criador).filter(Boolean).map(String);
    const usersMap = await fetchUsersByIds(ids);
    return (data||[]).map(p => ({ ...p, _autor: usersMap.get(String(p.id_usuario_criador)) || null }));
  }

  async function carregarAnexos() {
    // select * e fallback de campos na render
    const { data, error } = await supa
      .from('anexo')
      .select('*')
      .eq('id_chamado', id);
    if (error) { console.error(error); return []; }
    return data || [];
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

    // técnicos (FUNÇÃO = usuario.cargo; fallback em categoria_nome)
    const tecnicos = await carregarTecnicos();
    const tbody = document.getElementById('tabela-tecnicos-body');
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

    // pendências (sem embed; usamos _autor)
    const pendencias = await carregarPendencias();
    const pendUl = document.getElementById('lista-pendencias');
    pendUl.innerHTML = pendencias.length
      ? pendencias.map(p => {
          const quando = p.data_criacao || p.created_at || p.data || p.inserido_em || null;
          const status = p.status_pendencia || p.status || '—';
          const autor  = p._autor?.nome || '—';
          const desc   = p.descricao_pendencia || p.descricao || '';
          return `<li>[${fmt(quando)}] (${safe(status)}) ${safe(desc)} — ${safe(autor)}</li>`;
        }).join('')
      : '<li>Sem pendências registradas.</li>';

    // anexos (fallback de campos)
    const anexos = await carregarAnexos();
    const anexDiv = document.getElementById('lista-anexos');
    anexDiv.innerHTML = anexos.length
      ? anexos.map(a => `<p>📄 <a href="${getAnexoURL(a)}" target="_blank" rel="noopener">${safe(getAnexoNome(a))}</a> — ${fmt(getAnexoData(a))}</p>`).join('')
      : '<p>Nenhum anexo enviado.</p>';

    // estado botões
    const btnAtender  = document.getElementById('btn-atender');
    const btnFinalizar= document.getElementById('btn-finalizar');
    if (btnAtender)   btnAtender.disabled   = !(podeAtender && chamado.status_chamado === 'Aberto');
    if (btnFinalizar) btnFinalizar.disabled = !(podeFechar  && chamado.status_chamado !== 'Concluído');

    // binds de "Encerrar" por linha
    posRenderEncerrarBind();
  }

  // ===== ações principais
  async function iniciarAtendimento() {
    if (!podeAtender) return alert('Sem permissão.');

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

    // encerra atendimentos em aberto (qualquer nome de coluna de fim)
    let eClose = null;
    try {
      const r1 = await supa.from('atendimento_chamado')
        .update({ hora_fim_atendimento: agora })
        .eq('id_chamado', id)
        .is('hora_fim_atendimento', null);
      if (r1.error) throw r1.error;
    } catch (e) {
      eClose = e;
      try {
        const r2 = await supa.from('atendimento_chamado')
          .update({ data_hora_fim_atendimento: agora })
          .eq('id_chamado', id)
          .is('data_hora_fim_atendimento', null);
        if (r2.error) throw r2.error;
      } catch (e2) {
        console.error('Erro ao encerrar atendimentos em aberto:', eClose, e2);
        return alert('Erro ao encerrar atendimento em aberto.');
      }
    }

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

  // busca nome/chapa sem assumir PK
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
            <li data-userid="${pk}" data-nome="${u.nome||'-'}" data-cat="${u.cargo || u.categoria_nome || ''}">
              <span class="mc-result-name">${u.nome||'-'}</span>
              <span class="mc-result-meta">Chapa: ${u.chapa || '—'} • ${u.cargo || u.categoria_nome || '—'}</span>
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

  // confirmar inclusão do técnico
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
              .select('id_atendimento, hora_inicio_atendimento, data_hora_inicio_atendimento')
              .eq('id_atendimento', atdId)
              .maybeSingle();
            atd = data;
          } else {
            const { data } = await supa
              .from('atendimento_chamado')
              .select('id_atendimento, hora_inicio_atendimento, data_hora_inicio_atendimento')
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
            horaInicio: atd.hora_inicio_atendimento || atd.data_hora_inicio_atendimento
          };

          // valor padrão do fim = agora **ajustado** para ser >= início
          const baseNow = Date.now();
          const minEnd  = new Date(endContext.horaInicio).getTime() + 60_000; // +1 min
          const defEnd  = new Date(Math.max(baseNow, minEnd));
          inpHoraFim.value = toLocalDatetimeInputValue(defEnd);
          endInfo.textContent = `Técnico: ${endContext.nome} • Início: ${cols[2].textContent.trim()}`;
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

    // valida fim >= início (tolerância de 5s)
    if (endContext.horaInicio) {
      const tIni = new Date(endContext.horaInicio).getTime();
      const tFim = new Date(dtFimISO).getTime();
      if (tFim + 5000 < tIni) return alert('A hora de término deve ser maior ou igual à de início.');
    }

    // tenta update com os dois nomes de coluna
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
