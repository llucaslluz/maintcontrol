document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('formChamado');
  const botaoAnexo = document.getElementById('botao-anexo');
  const modalAnexo = document.getElementById('anexo');
  const inputArquivos = document.getElementById('arquivo');
  const listaArquivos = document.getElementById('lista-arquivos');

  // 🟢 Exibe a modal de anexo
  window.abrirAnexo = function () {
    if (modalAnexo) modalAnexo.classList.add('show');
    if (botaoAnexo) botaoAnexo.style.display = 'none';
  }

  // 🔴 Fecha a modal de anexo
  window.fecharAnexo = function () {
    if (modalAnexo) modalAnexo.classList.remove('show');
    if (botaoAnexo) botaoAnexo.style.display = 'inline-flex';
  }

  // 📎 Exibe nomes dos arquivos anexados
  window.mostrarNomeArquivos = function () {
    listaArquivos.innerHTML = "";

    if (inputArquivos.files.length > 0) {
      Array.from(inputArquivos.files).forEach(file => {
        const li = document.createElement('li');
        li.textContent = `📎 ${file.name}`;
        listaArquivos.appendChild(li);
      });
    }
  }

  // ✅ Validação simples de formulário
  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const local = document.getElementById('local').value;
    const maquina = document.getElementById('maquina').value;
    const tipo = document.getElementById('tipo').value;
    const status = document.getElementById('status').value;
    const prioridade = document.getElementById('prioridade').value;
    const descricao = document.getElementById('descricao').value.trim();

    if (!local || !maquina || !tipo || !status || !prioridade || !descricao) {
      alert("⚠️ Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    alert("✅ Chamado aberto com sucesso!");
    form.reset();
    listaArquivos.innerHTML = "";
    fecharAnexo(); // Garante que modal feche se estiver aberta
  });
});
