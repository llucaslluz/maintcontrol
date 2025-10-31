// =======================
//  Botão de EMERGÊNCIA
// =======================

// Ajuste estes nomes para o seu schema:
const TABLE_MAQUINA = 'maquina_dispositivo'; // tabela de máquinas
const LINK_KEY      = 'id_local';            // coluna NA TABELA DE MÁQUINAS que referencia o local
const ID_KEY        = 'id_maquina';          // coluna do ID da máquina
const NAME_KEY      = 'nome_maquina';        // coluna do nome da máquina

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

// ---- Carrega Locais ----
async function carregarLocaisEmergencia() {
  try {
    await waitForSupabase();
    const selLocal   = document.getElementById('local-emergencia');
    const selMaquina = document.getElementById('maquina-emergencia');
    if (!selLocal) return;

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

    selLocal.addEventListener('change', async () => {
      const idLocal = selLocal.value;
      await carregarMaquinasPorLocal(idLocal);
    });
  } catch (e) {
    console.error('Supabase não disponível:', e.message);
  }
}

// ---- Carrega Máquinas do Local (use as constantes acima) ----
async function carregarMaquinasPorLocal(idLocalRaw) {
  const selMaquina = document.getElementById('maquina-emergencia');
  if (!selMaquina) return;

  selMaquina.disabled = true;
  selMaquina.innerHTML = '<option value="">Carregando...</option>';

  if (!idLocalRaw) {
    selMaquina.innerHTML = '<option value="">Selecione um local primeiro</option>';
    return;
  }

  // tenta manter o tipo (número vs string)
  const n = Number(idLocalRaw);
  const idLocal = Number.isNaN(n) ? idLocalRaw : n;

  // consulta filtrando pela coluna de vínculo configurada
  const { data, error } = await supabase
    .from(TABLE_MAQUINA)
    .select('*')
    .eq(LINK_KEY, idLocal)
    .order(NAME_KEY, { ascending: true });

  if (error) {
    console.error('Erro ao carregar máquinas:', error.message);
    selMaquina.innerHTML = '<option value="">Não foi possível carregar</option>';
    return;
  }

  selMaquina.disabled = false;
  selMaquina.innerHTML = '';
  selMaquina.appendChild(new Option('— Sem máquina específica —', ''));

  if (!data || data.length === 0) {
    console.warn('[Emergência] Nenhuma máquina para o local', { LINK_KEY, idLocal, exemplo: data?.[0] });
    selMaquina.appendChild(new Option('Nenhuma máquina encontrada', ''));
    return;
  }

  // mapeia usando campos configurados; com fallback para nomes comuns
  data.forEach(r => {
    const id = r[ID_KEY] ?? r.id ?? r.id_dispositivo ?? r.uuid ?? r.id_maquina_dispositivo;
    const nome = r[NAME_KEY] ?? r.nome ?? r.descricao ?? r.tag ?? r.codigo ?? 'Sem nome';
    if (id != null) selMaquina.appendChild(new Option(nome, id));
  });

  // log útil para checar as chaves disponíveis
  console.log('[Emergência] exemplo de linha de máquina:', Object.keys(data[0] || {}), data[0]);
}

// ---- Envia Chamado ----
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
