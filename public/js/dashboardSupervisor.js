document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Dashboard Supervisor iniciado");

  // ---------- Helpers ----------
  const fmtDate = (d) => new Date(d).toLocaleString("pt-BR");
  const safe = (s) => (s ?? '').toString();

  // ---------- KPIs ----------
  async function contarChamadosPorStatus() {
    const { data, error } = await supabase
      .from("chamado")
      .select("status_chamado, emergencia");

    if (error) { console.error("Erro ao contar chamados:", error.message); return null; }

    const cont = {
      "Aberto": 0,
      "Em Andamento": 0,
      "Concluído": 0,
      "Com Pendência": 0,
      _emergencias: 0
    };

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

  // ---------- Tabela: últimos chamados ----------
  async function listarChamadosRecentes() {
    const { data, error } = await supabase
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

        -- solicitante interno (FK explícita)
        solicitante:usuario!chamado_id_solicitante_fkey (nome, chapa),

        -- fallback visitante
        nome_solicitante_externo,
        chapa_solicitante_externo
      `)
      .order("data_hora_abertura", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Erro ao listar chamados:", error.message);
      return [];
    }
    return data || [];
  }

  function renderLinhaChamado(ch) {
    const ehEmerg = ch.emergencia === true;
    const badgeEmg = ehEmerg ? '<span class="tag-emergencia">🚨 Emergência</span>' : "";

    const nomeSolic  = ch.solicitante?.nome || ch.nome_solicitante_externo || "—";
    const chapaSolic = ch.solicitante?.chapa || ch.chapa_solicitante_externo || "—";

    return `
      <tr class="${ehEmerg ? 'chamado-emergencia' : ''}">
        <td>#${ch.id_chamado}</td>
        <td>${safe(ch.maquina?.nome_maquina) || '-'}</td>
        <td>${safe(ch.status_chamado)} ${badgeEmg}</td>
        <td>${safe(ch.prioridade)}</td>
        <td>${safe(nomeSolic)} (${safe(chapaSolic)})</td>
        <td>${safe(ch.tipo?.nome_tipo) || '-'}</td>
        <td><button data-id="${ch.id_chamado}" class="btn-detalhe">Ver Detalhe</button></td>
      </tr>
    `;
  }

  async function atualizarChamados() {
    const rows = await listarChamadosRecentes();
    const tbody = document.getElementById("tabela-chamados");
    if (!tbody) return;
    tbody.innerHTML = rows.map(renderLinhaChamado).join("");

    // clique "Ver Detalhe"
    tbody.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.btn-detalhe');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      // TODO: quando existir página de detalhe:
      // location.href = `/ChamadoDetalhe.html?id=${id}`;
      console.log('abrir detalhe', id);
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

    if (error) {
      console.error("Erro ao listar histórico:", error.message);
      return [];
    }
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

  // expor para o botão de emergência
  window.atualizarCards = atualizarCards;
  window.atualizarChamados = atualizarChamados;

  document.addEventListener("chamado-emergencia-aberto", async () => {
    await atualizarCards();
    await atualizarChamados();
  });

  // primeira carga
  await atualizarCards();
  await atualizarChamados();
  await atualizarHistorico();

  console.log("✅ Dashboard Supervisor atualizado com dados do banco");
});
