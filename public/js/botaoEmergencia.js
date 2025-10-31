// =======================
//  Botão de EMERGÊNCIA
// =======================

const TABLE_LOCAL   = 'local';
const TABLE_MAQUINA = 'maquina_dispositivo';

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
    if (Date.now() - start > maxMs) throw new Error('Supabase não carregou.');
    await new Promise(r => setTimeout(r, 50));
  }
  return window.supabase;
}
function getUser() {
  try { return JSON.parse(localStorage.getItem('mcv_user') || 'null'); }
  catch { return null; }
}

// ---- Carrega Locais (igual à outra tela) ----
async function carregarLocaisEmergencia() {
  try {
    await waitForSupabase();

    const selLocal   = document.getElementById('local-emergencia');
    const selMaquina = document.getElementById('maquina-emergencia');
    if (!selLocal) return;

    selLocal.innerHTML = '<option value="">Selecione</option>';
    if (selMaquina) {
      selMaquina.innerHTML = '<option value="">Selecione</option>';
      selMaquina.disabled = true;
    }

    const { data, error } = await supabase
      .from(TABLE_LOCAL)
      .select('id_local, nome_local')
      .order('nome_local', { ascending: true });

    if (error) {
      console.error('Erro ao carregar locais (emergência):', error.message);
      return;
    }

    (data || []).forEach(local => {
      const op = document.createElement('option');
      op.value = local.id_local;
      op.textContent = local.nome_local;
      selLocal.appendChild(op);
    });

    // Carrega as máquinas (todas) logo ao abrir
    await carregarMaquinasEmergencia();
    if (selMaquina) selMaquina.disabled = false;

    // Se quiser, ao trocar local só mantemos a seleção (sem filtrar):
    selLocal.addEventListener('change', () => {
      // nada a fazer, as máquinas já estão listadas (sem filtro)
      // se futuramente quiser filtrar por local, troque para:
      // carregarMaquinasEmergencia(selLocal.value);
    });

  } catch (e) {
    console.error('Supabase não disponível:', e.message);
  }
}

// ---- Carrega Máquinas (mesmo caminho da tela do Usuário) ----
// OBS: sem filtro por local, exatamente como seu "carregarMaquinas()" que funciona
async function carregarMaquinasEmergencia(/* idLocalOpcional */) {
  const select = document.getElementById('maquina-emergencia');
  if (!select) return;

  select.disabled = true;
  select.innerHTML = '<option value="">Carregando...</option>';

  const { data, error } = await supabase
    .from(TABLE_MAQUINA)
    .select('id_maquina, nome_maquina')
    .order('nome_maquina', { ascending: true });

  if (error) {
    console.error('Erro ao carregar máquinas (emergência):', error.message);
    select.innerHTML = '<option value="">Não foi possível carregar</option>';
    return;
  }

  select.innerHTML = '<option value="">Selecione</option>';
  (data || []).forEach(row => {
    const opt = document.createElement('option');
    opt.value = row.id_maquina;
    opt.textContent = row.nome_maquina;
    select.appendChild(opt);
  });

  // Opcional: manter a opção "Sem máquina específica"
  select.insertBefore(new Option('— Sem máquina específica —', ''), select.firstChild);

  select.disabled = false;
}

// ---- Envia Chamado de Emergência ----
async function enviarEmergencia() {
  try {
    await waitForSupabase();

    const idLocal   = document.getElementById('local-emergencia')?.value || '';
    const idMaquina = document.getElementById('maquina-emergencia')?.value || '';

    if (!idLocal) {
      alert('⚠️ Selecione um local para abrir o chamado de emergência.');
      return;
    }

    const user = getUser();
    const payload = {
      id_solicitante: user?.id || null,
      id_local: idLocal,
      id_maquina: idMaquina || null, // permite "sem máquina específica"
      id_tipo_manutencao: null,
      descricao_problema: '🚨 Chamado de Emergência',
      prioridade: 'Alta',
      status_maquina: 'Parada',
      status_chamado: 'Aberto',
      data_hora_abertura: new Date().toISOString(),
      emergencia: true
    };

    const { error } = await supabase.from('chamado').insert([payload]); // sem .select()

    if (error) {
      console.error('Erro ao abrir emergência:', error.message);
      alert('❌ Erro ao abrir chamado de emergência. Veja o console.');
      return;
    }

    alert('🚨 Chamado de emergência enviado com sucesso!');
    fecharModalEmergencia();

    if (typeof window.atualizarCards === 'function') window.atualizarCards();
    if (typeof window.atualizarChamados === 'function') window.atualizarChamados();

    document.dispatchEvent(new CustomEvent('chamado-emergencia-aberto'));
  } catch (e) {
    console.error('Falha ao enviar emergência:', e.message);
    alert('❌ Falha ao enviar emergência. Tente novamente.');
  }
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', carregarLocaisEmergencia);
