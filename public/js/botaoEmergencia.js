function abrirModalEmergencia() {
  document.getElementById('modal-emergencia').classList.remove('hidden');
}

function fecharModalEmergencia() {
  document.getElementById('modal-emergencia').classList.add('hidden');
}

function enviarEmergencia() {
  const localSelecionado = document.getElementById('local-emergencia').value;

  // 🔄 Simulação de envio de chamado de emergência
  alert(`Chamado de emergência enviado com sucesso!\nLocal: ${localSelecionado}`);

  // Aqui futuramente entra o POST para Supabase
  fecharModalEmergencia();
}

function exportarTabela() {
  alert('FAZER DEPOIS: função de exportar para Excel ou PDF!');
}

const linha = document.createElement("tr");
if (chamado.fl_chamado_emergencia) {
  linha.classList.add("chamado-emergencia");
}
