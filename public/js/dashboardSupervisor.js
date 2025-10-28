document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Dashboard Supervisor iniciado");

  // ---------- Helpers ----------
  const fmtDate = (d) => new Date(d).toLocaleString("pt-BR");
  const safe = (s) => (s ?? '').toString();

  const isEmergencia = (ch) =>
  ch?.emergencia === true ||
  (typeof ch?.descricao_problema === 'string' && ch.descricao_problema.includes('🚨'));

  const resumir = (txt, n = 80) => {
  const s = (txt ?? "").toString().trim();
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
};
const idCurto = (id) => (id ? String(id).substring(0, 6) : "??????");


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

      solicitante:usuario!chamado_id_solicitante_fkey (nome, chapa),

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
  const ehEmerg = isEmergencia(ch);
  const badgeEmg = ehEmerg ? '<span class="tag-emergencia">🚨 Emergência</span>' : "";

  // Solicitante: interno > externo > —
  const nomeSolic  = ch.solicitante?.nome || ch.nome_solicitante_externo || "—";
  const chapaSolic = ch.solicitante?.chapa || ch.chapa_solicitante_externo || "—";
  const solicitanteFmt = `${nomeSolic} (${chapaSolic})`.replace(" (—)", "");

  // Técnico: por enquanto não temos “responsável atual” na tabela.
  // Vamos deixar em branco/“—”. Depois dá pra inferir via histórico.
  const tecnicoFmt = "—";

  return `
    <tr class="${ehEmerg ? 'chamado-emergencia' : ''}">
      <td><strong>#${idCurto(ch.id_chamado)}</strong></td>
      <td>${safe(ch.local?.nome_local) || '—'}</td>
      <td>${safe(ch.maquina?.nome_maquina) || '—'}</td>
      <td title="${safe(ch.descricao_problema) || ''}">${resumir(ch.descricao_problema, 90)}</td>
      <td>${safe(solicitanteFmt)}</td>
      <td>${tecnicoFmt}</td>
      <td>${safe(ch.status_chamado)} ${badgeEmg}</td>
      <td class="acoes">
        <button class="btn-detalhe" data-action="detalhe"  data-id="${ch.id_chamado}">Ver Detalhe</button>
        <button class="btn-atender" data-action="atender"  data-id="${ch.id_chamado}">Atender</button>
        <button class="btn-concluir" data-action="concluir" data-id="${ch.id_chamado}">Concluir</button>
      </td>
    </tr>
  `;
}

async function atualizarChamados() {
  const rows = await listarChamadosRecentes();
  const tbody = document.getElementById("tabela-chamados");
  if (!tbody) return;

  tbody.innerHTML = rows.map(renderLinhaChamado).join("");

  // Delegação de eventos para os botões da tabela
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
      await atualizarStatusChamado(id, "Em Andamento", "Chamado atendido");
      await atualizarCards(); 
      await atualizarChamados();
      return;
    }

    if (acao === 'concluir') {
      await atualizarStatusChamado(id, "Concluído", "Chamado concluído");
      await atualizarCards();
      await atualizarChamados();
      return;
    }
  }, { once: true });
}

async function atualizarStatusChamado(id, novoStatus, descricaoHistorico) {
  try {
    // 1) Atualiza status
    const { error: upErr } = await supabase
      .from("chamado")
      .update({ status_chamado: novoStatus })
      .eq("id_chamado", id);

    if (upErr) {
      console.error("Erro ao atualizar chamado:", upErr.message);
      alert("❌ Não foi possível atualizar o status.");
      return false;
    }

    // 2) Insere histórico (opcional mas recomendado)
    await supabase.from("historico_acao").insert([{
      id_chamado: id,
      tipo_acao: "Status",
      descricao_acao: descricaoHistorico,
      data_hora_acao: new Date().toISOString()
    }]);

    return true;
  } catch (e) {
    console.error(e);
    alert("❌ Falha ao atualizar chamado.");
    return false;
  }
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
