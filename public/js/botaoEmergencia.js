// ---------- Modal ----------
function abrirModalEmergencia() {
  document.getElementById('modal-emergencia')?.classList.remove('hidden');
}
function fecharModalEmergencia() {
  document.getElementById('modal-emergencia')?.classList.add('hidden');
}

// ---------- Util: aguarda o Supabase existir ----------
async function waitForSupabase(maxMs = 5000) {
  const start = Date.now();
  while (!window.supabase) {
    if (Date.now() - start > maxMs) throw new Error("Supabase não carregou.");
    await new Promise(r => setTimeout(r, 50));
  }
  return window.supabase;
}

// ---------- Carregar Locais no <select id="local-emergencia"> ----------
async function carregarLocaisEmergencia() {
  try {
    await waitForSupabase();
    const select = document.getElementById("local-emergencia");
    if (!select) return;

    // placeholder
    select.innerHTML = '<option value="">Selecione</option>';

    const { data, error } = await supabase
      .from("local")
      .select("id_local, nome_local")
      .order("nome_local", { ascending: true });

    if (error) {
      console.error("Erro ao carregar locais (emergência):", error.message);
      return;
    }

    data?.forEach(loc => {
      const op = document.createElement("option");
      op.value = loc.id_local;
      op.textContent = loc.nome_local;
      select.appendChild(op);
    });
  } catch (e) {
    console.error("Supabase não disponível:", e.message);
  }
}

// ---------- Enviar chamado de emergência ----------
async function enviarEmergencia() {
  try {
    await waitForSupabase();

    const idLocal = document.getElementById('local-emergencia')?.value || "";
    if (!idLocal) {
      alert("⚠️ Selecione um local para abrir o chamado de emergência.");
      return;
    }

    // Insere como um chamado normal, marcado na descrição e com prioridade alta
    const { error } = await supabase
      .from("chamado")
      .insert([{
        id_solicitante: null,                 // sem login
        id_local: idLocal,
        id_maquina: null,                     // se quiser vincular máquina depois, dá pra editar
        id_tipo_manutencao: null,             // idem
        descricao_problema: "🚨 Chamado de Emergência",
        prioridade: "alta",
        status_maquina: "Parada",
        status_chamado: "Aberto",
        data_hora_abertura: new Date().toISOString()
        // se você tiver adicionado a coluna boolean 'emergencia', pode incluir:
        // , emergencia: true
      }]); // sem .select() para não exigir policy de SELECT

    if (error) {
      console.error("Erro ao abrir emergência:", error.message);
      alert("❌ Erro ao abrir chamado de emergência. Veja o console.");
      return;
    }

    alert("🚨 Chamado de emergência enviado com sucesso!");
    fecharModalEmergencia();

    // Pede para a página atualizar cards e tabela, se as funções existirem
    if (typeof window.atualizarCards === "function") window.atualizarCards();
    if (typeof window.atualizarChamados === "function") window.atualizarChamados();

    // ou dispara um evento para quem quiser escutar
    document.dispatchEvent(new CustomEvent("chamado-emergencia-aberto"));
  } catch (e) {
    console.error("Falha ao enviar emergência:", e.message);
    alert("❌ Falha ao enviar emergência. Tente novamente.");
  }
}

// ---------- Exportar (placeholder) ----------
function exportarTabela() {
  alert('FAZER DEPOIS: exportação para Excel/PDF');
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", carregarLocaisEmergencia);
