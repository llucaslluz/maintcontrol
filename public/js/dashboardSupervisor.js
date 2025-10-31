document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Dashboard Supervisor iniciado");

  // ---------- Estado / Helpers (únicas definições) ----------
  let filtroAtual = null;           // { tipo: 'status'|'pendencia', valor?: string }
  let pendentesSet = new Set();     // ids de chamados com pendência aberta

  const safe     = (s) => (s ?? '').toString();
  const idCurto  = (uuid) => String(uuid).slice(0, 6);
  const resumir  = (txt, n=90) => (txt ? (txt.length>n ? txt.slice(0,n-1)+'…' : txt) : '—');
  const fmtDate  = (d) => new Date(d).toLocaleString("pt-BR");
  const getUserSessao = () => { try { return JSON.parse(localStorage.getItem('mcv_user')) || null; } catch { return null; } };
  const isEmergencia = (ch) =>
    ch?.emergencia === true ||
    (typeof ch?.descricao_problema === 'string' && ch.descricao_problema.includes('🚨'));

  // 👉 formatador bonitinho para a coluna Abertura
  function formatarDataHora(iso) {
    if (!iso) return '—';
    try {
      const dt = new Date(iso);
      const data = new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        timeZone: 'America/Sao_Paulo'
      }).format(dt);
      const hora = new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit', minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
      }).format(dt);
      return `${data} ${hora}`;
    } catch { return '—'; }
  }

  // ---------- KPIs (Status + Pendências abertas) ----------
  async function contarKPIs() {
    // 1) Status
    const { data: chs, error: errCh } = await supabase
      .from("chamado")
      .select("id_chamado, status_chamado, emergencia");

    if (errCh) { console.error("Erro ao contar chamados:", errCh.message); return null; }

    const cont = {
      "Aberto": 0,
      "Em Andamento": 0,
      "Concluído": 0,
      "Com Pendência": 0,
      _emergencias: 0,
      _pendentes: 0
    };

    for (const ch of chs) {
      if (cont[ch.status_chamado] !== undefined) cont[ch.status_chamado]++;
      if (ch.emergencia === true) cont._emergencias++;
    }

    // 2) Pendências abertas
    const { data: pends, error: errP } = await supabase
      .from("pendencia")
      .select("id_chamado, status_pendencia");

    if (errP) { console.error("Erro ao contar pendências:", errP.message); return cont; }

    const abertas = new Set();
    for (const p of pends) {
      const st = (p.status_pendencia || "Aberta").toLowerCase();
      if (st !== "resolvida" && st !== "fechada" && st !== "concluída" && st !== "concluida") {
        abertas.add(p.id_chamado);
      }
    }
    cont._pendentes = abertas.size;
    pendentesSet = abertas;

    return cont;
  }

  async function atualizarCards() {
    const cont = await contarKPIs();
    if (!cont) return;
    document.getElementById("card-abertos").textContent    = cont["Aberto"] || 0;
    document.getElementById("card-andamento").textContent  = cont["Em Andamento"] || 0;
    document.getElementById("card-concluidos").textContent = cont["Concluído"] || 0;
    document.getElementById("card-pendentes").textContent  = cont._pendentes || 0;
  }

  // ---------- Filtro por cards ----------
  function passaNoFiltro(ch) {
    if (!filtroAtual) return true;

    if (filtroAtual.tipo === 'status') {
      return ch.status_chamado === filtroAtual.valor;
    }
    if (filtroAtual.tipo === 'pendencia') {
      return pendentesSet.has(ch.id_chamado);
    }
    return true;
  }

  function marcarCardAtivo(id) {
    document.querySelectorAll('.card-status').forEach(el => el.classList.remove('active'));
    if (id) document.getElementById(id)?.classList.add('active');
  }

  function setFiltro(novo) {
    const igual = filtroAtual && filtroAtual.tipo === novo?.tipo && filtroAtual.valor === novo?.valor;
    filtroAtual = igual ? null : novo;

    marcarCardAtivo(
      igual ? null :
      novo?.tipo === 'status'   && novo?.valor === 'Aberto'        ? 'kpi-abertos'   :
      novo?.tipo === 'status'   && novo?.valor === 'Em Andamento'  ? 'kpi-andamento' :
      novo?.tipo === 'status'   && novo?.valor === 'Concluído'     ? 'kpi-concluidos':
      novo?.tipo === 'pendencia'                                   ? 'kpi-pendentes' :
      null
    );

    atualizarChamados();
  }

  // ---------- Tabela ----------
  async function atualizarChamados() {
    // 1) Buscar chamados
    const { data: chamados, error: errCham } = await supabase
      .from("chamado")
      .select(`
        id_chamado,
        descricao_problema,
        prioridade,
        status_chamado,
        status_maquina,
        emergencia,
        data_hora_abertura,

        local:local (nome_local),
        maquina:maquina_dispositivo (nome_maquina),
        tipo:tipo_manutencao (nome_tipo),

        solicitante:usuario!chamado_id_solicitante_fkey (nome, chapa),

        nome_solicitante_externo,
        chapa_solicitante_externo
      `)
      .order("data_hora_abertura", { ascending: false })
      .limit(50);

    if (errCham) {
      console.error("Erro ao listar chamados:", errCham.message);
      return;
    }

    // 2) Quem está atendendo (abertos)
    const ids = (chamados || []).map(c => c.id_chamado);
    let atendimentosAbertos = [];
    if (ids.length) {
      const { data: atds, error: errAtd } = await supabase
        .from("atendimento_chamado")
        .select(`
          id_atendimento,
          id_chamado,
          hora_inicio_atendimento,
          hora_fim_atendimento,
          tecnico:usuario!atendimento_chamado_id_tecnico_fkey (id_usuario, nome, chapa)
        `)
        .in("id_chamado", ids)
        .is("hora_fim_atendimento", null)
        .order("hora_inicio_atendimento", { ascending: false });

      if (!errAtd) atendimentosAbertos = atds || [];
      else console.error("Erro ao buscar atendimentos:", errAtd.message);
    }

    // 3) Mapear último atendimento aberto por chamado
    const atendimentoMap = {};
    for (const a of atendimentosAbertos) {
      if (!atendimentoMap[a.id_chamado]) atendimentoMap[a.id_chamado] = a;
    }

    // 4) Render
    const tbody = document.getElementById("tabela-chamados");
    if (!tbody) return;

    const me = getUserSessao();
    const visiveis = (chamados || []).filter(passaNoFiltro);

    tbody.innerHTML = visiveis.map(ch => {
      const ehEmerg = isEmergencia(ch);
      const badgeEmg = ehEmerg ? '<span class="tag-emergencia">🚨 Emergência</span>' : "";

      const nomeSolic  = ch.solicitante?.nome || ch.nome_solicitante_externo || "—";
      const chapaSolic = ch.solicitante?.chapa || ch.chapa_solicitante_externo || "—";
      const solicitanteFmt = `${nomeSolic}${chapaSolic && chapaSolic !== "—" ? " ("+chapaSolic+")" : ""}`;

      const atd = atendimentoMap[ch.id_chamado];
      const tecnicoAtualFmt = atd?.tecnico?.nome
        ? `${atd.tecnico.nome}${atd.tecnico.chapa ? " ("+atd.tecnico.chapa+")" : ""}`
        : "—";

      const euAtendendo = me && atd?.tecnico?.chapa && String(me.chapa) === String(atd.tecnico.chapa);

      let botoes = `<button class="btn-detalhe" data-action="detalhe" data-id="${ch.id_chamado}">Ver Detalhe</button>`;
      if (ch.status_chamado === "Aberto") {
        botoes += `<button class="btn-atender" data-action="atender" data-id="${ch.id_chamado}">Atender</button>`;
      } else if (ch.status_chamado === "Em Andamento" && euAtendendo) {
        botoes += `<span class="pill-you">Em atendimento (você)</span>`;
      }

      // 💡 Nova coluna "Abertura" — usa formatarDataHora(ch.data_hora_abertura)
      const tdAbertura =
        `<td class="col-abertura" title="${safe(ch.data_hora_abertura)}">${formatarDataHora(ch.data_hora_abertura)}</td>`;

      return `
        <tr class="${ehEmerg ? 'chamado-emergencia' : ''}">
          <td><a href="/DetalheChamados.html?id=${encodeURIComponent(ch.id_chamado)}" class="link-id">#${idCurto(ch.id_chamado)}</a></td>
          <td>${safe(ch.local?.nome_local) || '—'}</td>
          <td>${safe(ch.maquina?.nome_maquina) || '—'}</td>
          ${tdAbertura}
          <td title="${safe(ch.descricao_problema) || ''}">${resumir(ch.descricao_problema, 90)}</td>
          <td>${safe(solicitanteFmt)}</td>
          <td>${safe(tecnicoAtualFmt)}</td>
          <td>${safe(ch.status_chamado)} ${badgeEmg}</td>
          <td class="acoes">${botoes}</td>
        </tr>
      `;
    }).join("");

    // 5) Delegar cliques (detalhe / atender)
    tbody.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('button[data-action]');
      if (!btn) return;

      const acao = btn.getAttribute('data-action');
      const id   = btn.getAttribute('data-id');

      if (acao === 'detalhe') {
        location.href = `/DetalheChamados.html?id=${encodeURIComponent(id)}`;
        return;
      }

      if (acao === 'atender') {
        const me = getUserSessao();
        if (!me) { alert("⚠️ Sessão não encontrada."); return; }

        // cria atendimento
        const { error: insErr } = await supabase.from("atendimento_chamado").insert([{
          id_chamado: id,
          id_tecnico: me.id,
          hora_inicio_atendimento: new Date().toISOString(),
          descricao_andamento: "Atendimento iniciado"
        }]);
        if (insErr) { console.error(insErr); alert("❌ Não foi possível assumir o atendimento."); return; }

        // atualiza status
        const { error: upErr } = await supabase.from("chamado")
          .update({ status_chamado: "Em Andamento" })
          .eq("id_chamado", id);
        if (upErr) { console.error(upErr); alert("❌ Erro ao atualizar status do chamado."); return; }

        // histórico
        await supabase.from("historico_acao").insert([{
          id_chamado: id,
          id_usuario: me.id || null,
          tipo_acao: "Status",
          descricao_acao: `Chamado atendido por ${me.nome}${me.chapa ? " ("+me.chapa+")" : ""}`,
          data_hora_acao: new Date().toISOString()
        }]);

        await atualizarCards();
        await atualizarChamados();
      }
    }, { once: true });
  }

  // ---------- Histórico ----------
  async function listarHistoricoRecentes() {
    const { data, error } = await supabase
      .from("historico_acao")
      .select(`
        id_historico,
        tipo_acao,
        descricao_acao,
        data_hora_acao,
        chamado:chamado (id_chamado)
      `)
      .order("data_hora_acao", { ascending: false })
      .limit(10);

    if (error) { console.error("Erro ao listar histórico:", error.message); return []; }
    return data || [];
  }

  async function atualizarHistorico() {
    const hist = await listarHistoricoRecentes();
    const ul = document.getElementById("lista-historico");
    if (!ul) return;
    ul.innerHTML = hist.map(h =>
      `<li>${fmtDate(h.data_hora_acao)} - [Chamado ${h.chamado?.id_chamado || '—'}] ${safe(h.tipo_acao)}: ${safe(h.descricao_acao)}</li>`
    ).join("");
  }

  // ---------- Listeners dos cards (filtros) ----------
  document.getElementById('kpi-abertos')   ?.addEventListener('click', () => setFiltro({ tipo:'status',   valor:'Aberto' }));
  document.getElementById('kpi-andamento') ?.addEventListener('click', () => setFiltro({ tipo:'status',   valor:'Em Andamento' }));
  document.getElementById('kpi-concluidos')?.addEventListener('click', () => setFiltro({ tipo:'status',   valor:'Concluído' }));
  document.getElementById('kpi-pendentes') ?.addEventListener('click', () => setFiltro({ tipo:'pendencia' }));

  // ---------- Expostos p/ botão de emergência ----------
  window.atualizarCards = atualizarCards;
  window.atualizarChamados = atualizarChamados;
  document.addEventListener("chamado-emergencia-aberto", async () => {
    await atualizarCards();
    await atualizarChamados();
  });

  // ---------- Primeira carga ----------
  await atualizarCards();
  await atualizarChamados();
  await atualizarHistorico();

  console.log("✅ Dashboard Supervisor atualizado com dados do banco");
});
