document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Dashboard Supervisor iniciado");

  // ---------- Helpers (UMA VEZ SÓ) ----------
  const getUserSessao = () => {
    try { return JSON.parse(localStorage.getItem('mcv_user')) || null; }
    catch { return null; }
  };
  const safe     = (s) => (s ?? '').toString();
  const idCurto  = (id) => (id ? String(id).substring(0, 6) : "??????");
  const resumir  = (txt, n = 90) => {
    const s = (txt ?? "").toString().trim();
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
  };
  const fmtDate  = (d) => new Date(d).toLocaleString("pt-BR");
  const isEmergencia = (ch) =>
    ch?.emergencia === true ||
    (typeof ch?.descricao_problema === 'string' && ch.descricao_problema.includes('🚨'));

  // ---------- KPIs ----------
  async function contarChamadosPorStatus() {
    const { data, error } = await supabase
      .from("chamado")
      .select("status_chamado, emergencia");

    if (error) { console.error("Erro ao contar chamados:", error.message); return null; }

    const cont = { "Aberto": 0, "Em Andamento": 0, "Concluído": 0, "Com Pendência": 0, _emergencias: 0 };
    for (const ch of data) {
      if (cont[ch.status_chamado] !== undefined) cont[ch.status_chamado]++;
      if (ch.emergencia === true) cont._emergencias++;
    }
    return cont;
  }

  async function atualizarCards() {
    const cont = await contarChamadosPorStatus();
    if (!cont) return;
    document.getElementById("card-abertos").textContent    = cont["Aberto"] || 0;
    document.getElementById("card-andamento").textContent  = cont["Em Andamento"] || 0;
    document.getElementById("card-concluidos").textContent = cont["Concluído"] || 0;
    document.getElementById("card-pendentes").textContent  = cont["Com Pendência"] || 0;
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
      .limit(20);

    if (errCham) {
      console.error("Erro ao listar chamados:", errCham.message);
      return;
    }

    // 2) Buscar quem está atendendo (atendimentos abertos)
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

    // 3) Mapear último atendimento em aberto por chamado
    const atendimentoMap = {};
    for (const a of atendimentosAbertos) {
      if (!atendimentoMap[a.id_chamado]) atendimentoMap[a.id_chamado] = a;
    }

    // 4) Render
    const tbody = document.getElementById("tabela-chamados");
    if (!tbody) return;

    tbody.innerHTML = (chamados || []).map(ch => {
      const ehEmerg = isEmergencia(ch);
      const badgeEmg = ehEmerg ? '<span class="tag-emergencia">🚨 Emergência</span>' : "";

      const nomeSolic  = ch.solicitante?.nome || ch.nome_solicitante_externo || "—";
      const chapaSolic = ch.solicitante?.chapa || ch.chapa_solicitante_externo || "—";
      const solicitanteFmt = `${nomeSolic}${chapaSolic && chapaSolic !== "—" ? " ("+chapaSolic+")" : ""}`;

      const atd = atendimentoMap[ch.id_chamado];
      const tecnicoAtualFmt = atd?.tecnico?.nome
        ? `${atd.tecnico.nome}${atd.tecnico.chapa ? " ("+atd.tecnico.chapa+")" : ""}`
        : "—";

      const me = getUserSessao();
      const euAtendendo = me && atd?.tecnico?.chapa && String(me.chapa) === String(atd.tecnico.chapa);

      let botoes = `<button class="btn-detalhe" data-action="detalhe" data-id="${ch.id_chamado}">Ver Detalhe</button>`;
      if (ch.status_chamado === "Aberto") {
        botoes += `<button class="btn-atender" data-action="atender" data-id="${ch.id_chamado}">Atender</button>`;
      } else if (ch.status_chamado === "Em Andamento" && euAtendendo) {
        botoes += `<span class="pill-you">Em atendimento (você)</span>`;
      }

      return `
        <tr class="${ehEmerg ? 'chamado-emergencia' : ''}">
          <td><a href="/DetalheChamados.html?id=${encodeURIComponent(ch.id_chamado)}" class="link-id">#${idCurto(ch.id_chamado)}</a></td>
          <td>${safe(ch.local?.nome_local) || '—'}</td>
          <td>${safe(ch.maquina?.nome_maquina) || '—'}</td>
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

  // ---------- Exports p/ botão de emergência ----------
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
