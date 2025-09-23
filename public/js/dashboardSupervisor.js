document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Dashboard Supervisor iniciado");

  async function contarChamadosPorStatus() {
    const { data, error } = await supabase.from("chamado").select("status_chamado");
    if (error) {
      console.error("Erro ao contar chamados:", error.message);
      return {};
    }
    const contagem = { Aberto: 0, "Em Andamento": 0, Concluído: 0, "Com Pendência": 0 };
    data.forEach(ch => {
      if (contagem[ch.status_chamado] !== undefined) {
        contagem[ch.status_chamado]++;
      }
    });
    return contagem;
  }

  async function listarChamadosRecentes() {
    const { data, error } = await supabase
      .from("chamado")
      .select(`
        id_chamado,
        descricao_problema,
        prioridade,
        status_chamado,
        data_hora_abertura,
        local:local(nome_local),
        maquina:maquina_dispositivo(nome_maquina),
        nome_solicitante_externo,
        chapa_solicitante_externo
      `)
      .order("data_hora_abertura", { ascending: false })
      .limit(10);
    if (error) {
      console.error("Erro ao listar chamados:", error.message);
      return [];
    }
    return data;
  }

  async function listarHistoricoRecentes() {
    const { data, error } = await supabase
      .from("historico_acao")
      .select(`
        id_historico,
        tipo_acao,
        descricao_acao,
        data_hora_acao,
        chamado:chamado(id_chamado)
      `)
      .order("data_hora_acao", { ascending: false })
      .limit(10);
    if (error) {
      console.error("Erro ao listar histórico:", error.message);
      return [];
    }
    return data;
  }

  async function atualizarCards() {
    const contagem = await contarChamadosPorStatus();
    document.getElementById("card-abertos").textContent = contagem["Aberto"] || 0;
    document.getElementById("card-andamento").textContent = contagem["Em Andamento"] || 0;
    document.getElementById("card-concluidos").textContent = contagem["Concluído"] || 0;
    document.getElementById("card-pendentes").textContent = contagem["Com Pendência"] || 0;
  }

  async function atualizarChamados() {
    const chamados = await listarChamadosRecentes();
    const tabela = document.getElementById("tabela-chamados");
    if (!tabela) return;
    tabela.innerHTML = "";
    chamados.forEach(ch => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>#${ch.id_chamado}</td>
        <td>${ch.maquina?.nome_maquina || "-"}</td>
        <td>${ch.status_chamado}</td>
        <td>${ch.prioridade}</td>
        <td>${ch.nome_solicitante_externo || "Usuário"} (${ch.chapa_solicitante_externo || "-"})</td>
        <td>—</td>
        <td><button>Ver Detalhe</button></td>
      `;
      tabela.appendChild(row);
    });
  }

  async function atualizarHistorico() {
    const historicos = await listarHistoricoRecentes();
    const lista = document.getElementById("lista-historico");
    if (!lista) return;
    lista.innerHTML = "";
    historicos.forEach(h => {
      const li = document.createElement("li");
      li.textContent = `${new Date(h.data_hora_acao).toLocaleString("pt-BR")} - [Chamado ${h.chamado?.id_chamado}] ${h.tipo_acao}: ${h.descricao_acao}`;
      lista.appendChild(li);
    });
  }

  // Executa tudo
  await atualizarCards();
  await atualizarChamados();
  await atualizarHistorico();

  console.log("✅ Dashboard Supervisor atualizado com dados do banco");
});
