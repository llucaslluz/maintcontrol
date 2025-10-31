// =======================
//  Botão de EMERGÊNCIA
// =======================

// ajuste se necessário para o nome da tabela de máquinas
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

// ---- Carrega locais no select do modal ----
async function carregarLocaisEmergencia() {
  try {
    await waitForSupabase();
    const selLocal   = document.getElementById('local-emergencia');
    const selMaquina = document.getElementById('maquina-emergencia');
    if (!selLocal) return;

    // reset
    selLocal.innerHTML = '<option value="">Selecione</option>';
    if (selMaquina) {
      selMaquina.innerHTML = '<option value="">Selecione um local primeiro</option>';
      selMaquina.disabled = true;
    }

    const { data, error } = await supabase
      .from('local')
      .select('id_local, nome_local')
      .order('nome_local', { ascending: true });

    if (error) {
      console.error('Erro ao carregar locais (emergência):', error.message);
      return;
    }

    (data || []).forEach(loc => {
      const op = document.createElement('option');
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
    console.error('Supabase não disponível:', e.message);
  }
}

// ---- Carrega máquinas do local escolhido (robusta) ----
async function carregarMaquinasPorLocal(idLocalRaw) {
  const selMaquina = document.getElementById('maquina-emergencia');
  if (!selMaquina) return;

  // Reset inicial
  selMaquina.disabled = true;
  selMaquina.innerHTML = '<option value="">Carregando...</option>';

  if (!idLocalRaw) {
    selMaquina.innerHTML = '<option value="">Selecione um local primeiro</option>';
    return;
  }

  // Normaliza o id (se for número no banco, isso ajuda)
  const idLocalNum = Number(idLocalRaw);
  const idLocal = Number.isNaN(idLocalNum) ? idLocalRaw : idLocalNum;

  let data = [];
  let error = null;

  // tentativa 1: id_local = número/string
  try {
    const try1 = await supabase
      .from(TABLE_MAQUINA)
      .select('*')
      .eq('id_local', idLocal)
      .order('nome_maquina', { ascending: true });
    data = try1.data || [];
    error = try1.error;
  } catch (e) {
    error = e;
  }

  // tentativa 2: repetir com valor raw (útil se id for UUID como string)
  if (!error && data.length === 0 && typeof idLocalRaw === 'string') {
    try {
      const try2 = await supabase
        .from(TABLE_MAQUINA)
        .select('*')
        .eq('id_local', idLocalRaw)
        .order('nome_maquina', { ascending: true });
      data = try2.data || [];
      error = try2.error;
    } catch (e) {
      error = e;
    }
  }

  // fallback: busca tudo e filtra no cliente por possíveis chaves de local
  let usouFallback = false;
  if (!error && data.length === 0) {
    const all = await supabase.from(TABLE_MAQUINA).select('*');
    const allRows = all.data || [];
    error = all.error;

    const localKeys = [
      'id_local', 'local_id', 'idLocal', 'idlocal',
      'id_setor', 'setor_id', 'id_area', 'area_id'
    ];
    const guessKey = allRows.length ? localKeys.find(k => k in allRows[0]) : null;

    if (guessKey) {
      data = allRows.filter(r => {
        const v = r[guessKey];
        if (typeof v === 'number' && typeof idLocal === 'number') return v === idLocal;
        return String(v) === String(idLocalRaw);
      });
      usouFallback = true;
    } else {
      // último recurso: exibe todas as máquinas (para não travar o fluxo)
      data = allRows;
      usouFallback = true;
    }
  }

  if (error) {
    console.error('Erro ao carregar máquinas:', error.message || error);
    selMaquina.innerHTML = '<option value="">Não foi possível carregar</option>';
    selMaquina.disabled = true;
    return;
  }

  // Monta o select
  selMaquina.disabled = false;
  selMaquina.innerHTML = '';
  selMaquina.appendChild(new Option('— Sem máquina específica —', ''));

  if (!data.length) {
    selMaquina.appendChild(new Option('Nenhuma máquina encontrada', ''));
  } else {
    data.forEach(r => {
      const id =
        r.id_maquina ?? r.id ?? r.id_dispositivo ?? r.uuid ?? r.id_maquina_dispositivo;
      const nome =
        r.nome_maquina ?? r.nome ?? r.descricao ?? r.tag ?? r.codigo ?? 'Sem nome';
      if (id != null) selMaquina.appendChild(new Option(nome, id));
    });
  }

  console.log('[Emergência] idLocal:', idLocal, '(raw:', idLocalRaw, ')');
  console.log('[Emergência] máquinas carregadas', { count: data.length, usouFallback, exemplo: data[0] });
}

// ---- Envia chamado de emergência ----
async function enviarEmergencia() {
  try {
    await waitForSupabase();

    const idLocal   = document.getElementById('local-emergencia')?.value || '';
    const idMaquina = document.getElementById('maquina-emergencia')?.value || '';

    if (!idLocal) {
      alert('⚠️ Selecione um local para abrir o chamado de emergência.');
      return;
    }
    // Para obrigar máquina, descomente:
    // if (!idMaquina) { alert('Selecione a máquina.'); return; }

    const user = getUser();
    const payload = {
      id_solicitante: user?.id || null,
      id_local: idLocal,
      id_maquina: idMaquina || null,
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
