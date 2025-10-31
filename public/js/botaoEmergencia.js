// =======================
//  Botão de EMERGÊNCIA
// =======================

const TABLE_MAQUINA = 'maquina_dispositivo'; // ajuste se necessário

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
    const selLocal   = document.getElementById("local-emergencia");
    const selMaquina = document.getElementById("maquina-emergencia");
    if (!selLocal) return;

    // reset
    selLocal.innerHTML   = '<option value="">Selecione</option>';
    if (selMaquina) {
      selMaquina.innerHTML = '<option value="">Selecione um local primeiro</option>';
      selMaquina.disabled  = true;
    }

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
      selLocal.appendChild(op);
    });

    // quando escolher o local, carrega as máquinas
    selLocal.addEventListener('change', async () => {
      const idLocal = selLocal.value;
      await carregarMaquinasPorLocal(idLocal);
    });

  } catch (e) {
    console.error("Supabase não disponível:", e.message);
  }
}

// ---- Carrega máquinas do local escolhido ----
async function carregarMaquinasPorLocal(idLocal) {
  const selMaquina = document.getElementById("maquina-emergencia");
  if (!selMaquina) return;

  if (!idLocal) {
    selMaquina.innerHTML = '<option value="">Selecione um local primeiro</option>';
    selMaquina.disabled  = true;
    return;
  }

  const { data, error } = await supabase
    .from(TABLE_MAQUINA)
    .select('id_maquina, nome_maquina')
    .eq('id_local', idLocal)
    .order('nome_maquina', { ascending: true });

  if (error) {
    console.error("Erro ao carregar máquinas:", error.message);
    selMaquina.innerHTML = '<option value="">Não foi possível carregar</option>';
    selMaquina.disabled  = true;
    return;
  }

  selMaquina.disabled = false;
  selMaquina.innerHTML = '';

  // Permitir emergência "do setor" sem máquina específica (opcional)
  const opNone = document.createElement('option');
  opNone.value = '';
  opNone.textContent = '— Sem máquina específica —';
  selMaquina.appendChild(opNone);

  (data || []).forEach(m => {
    const op = document.createElement('option');
    op.value = m.id_maquina;
    op.textContent = m.nome_maquina;
    selMaquina.appendChild(op);
  });
}

// ---- Envia chamado de emergência ----
async function enviarEmergencia() {
  try {
    await waitForSupabase();

    const idLocal   = document.getElementById('local-emergencia')?.value || '';
    const idMaquina = document.getElementById('maquina-emergencia')?.value || '';

    if (!idLocal) {
      alert("⚠️ Selecione um local para abrir o chamado de emergência.");
      return;
    }
    // Se quiser OBRIGAR escolher máquina, descomente:
    // if (!idMaquina) { alert("Selecione a máquina."); return; }

    const user = getUser(); // se estiver logado, registra como solicitante
    const payload = {
      id_solicitante: user?.id || null,
      id_local: idLocal,
      id_maquina: idMaquina || null,
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

    if (typeof window.atualizarCards === "function") window.atualizarCards();
    if (typeof window.atualizarChamados === "function") window.atualizarChamados();

    document.dispatchEvent(new CustomEvent("chamado-emergencia-aberto"));
  } catch (e) {
    console.error("Falha ao enviar emergência:", e.message);
    alert("❌ Falha ao enviar emergência. Tente novamente.");
  }
}

// ---- Init ----
document.addEventListener("DOMContentLoaded", carregarLocaisEmergencia);
