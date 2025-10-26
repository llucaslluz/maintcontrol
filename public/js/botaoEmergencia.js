// =======================
//  Botão de EMERGÊNCIA
// =======================

// ---- Modal ----
function abrirModalEmergencia() {
  document.getElementById('modal-emergencia')?.classList.remove('hidden');
}
function fecharModalEmergencia() {
  document.getElementById('modal-emergencia')?.classList.add('hidden');
}

// ---- Utils ----
async function waitForSupabase(maxMs = 5000) {
  const start = Date.now();
  while (!window.supabase) {
    if (Date.now() - start > maxMs) throw new Error("Supabase não carregou.");
    await new Promise(r => setTimeout(r, 50));
  }
  return window.supabase;
}
function getUser() {
  try { return JSON.parse(localStorage.getItem('mcv_user') || 'null'); }
  catch { return null; }
}

// ---- Carrega locais no select do modal ----
async function carregarLocaisEmergencia() {
  try {
    await waitForSupabase();
    const select = document.getElementById("local-emergencia");
    if (!select) return;

    select.innerHTML = '<option value="">Selecione</option>';

    const { data, error } = await supabase
      .from("local")
      .select("id_local, nome_local")
      .order("nome_local", { ascending: true });

    if (error) {
      console.error("Erro ao carregar locais (emergência):", error.message);
      return;
    }

    (data || []).forEach(loc => {
      const op = document.createElement("option");
      op.value = loc.id_local;
      op.textContent = loc.nome_local;
      select.appendChild(op);
    });
  } catch (e) {
    console.error("Supabase não disponível:", e.message);
  }
}

// ---- Envia chamado de emergência ----
async function enviarEmergencia() {
  try {
    await waitForSupabase();

    const idLocal = document.getElementById('local-emergencia')?.value || "";
    if (!idLocal) {
      alert("⚠️ Selecione um local para abrir o chamado de emergência.");
      return;
    }

    const user = getUser(); // se estiver logado, registra como solicitante
    const payload = {
      id_solicitante: user?.id || null,
      id_local: idLocal,
      id_maquina: null,
      id_tipo_manutencao: null,
      descricao_problema: "🚨 Chamado de Emergência",
      prioridade: "Alta",
      status_maquina: "Parada",
      status_chamado: "Aberto",
      data_hora_abertura: new Date().toISOString(),
      emergencia: true
    };

    const { error } = await supabase.from("chamado").insert([payload]); // sem .select()

    if (error) {
      console.error("Erro ao abrir emergência:", error.message);
      alert("❌ Erro ao abrir chamado de emergência. Veja o console.");
      return;
    }

    alert("🚨 Chamado de emergência enviado com sucesso!");
    fecharModalEmergencia();

    // pede atualização para o dashboard (se existir)
    if (typeof window.atualizarCards === "function") window.atualizarCards();
    if (typeof window.atualizarChamados === "function") window.atualizarChamados();

    // evento para quem quiser escutar
    document.dispatchEvent(new CustomEvent("chamado-emergencia-aberto"));
  } catch (e) {
    console.error("Falha ao enviar emergência:", e.message);
    alert("❌ Falha ao enviar emergência. Tente novamente.");
  }
}

// ---- Init ----
document.addEventListener("DOMContentLoaded", carregarLocaisEmergencia);
