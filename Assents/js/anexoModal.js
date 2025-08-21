function abrirAnexo() {
  const modal = document.getElementById('anexo');
  const botao = document.getElementById('botao-anexo');
  if (modal) modal.classList.add('show');
  if (botao) botao.style.display = 'none'; // Oculta o botão
}

function fecharAnexo() {
  const modal = document.getElementById('anexo');
  const botao = document.getElementById('botao-anexo');
  if (modal) modal.classList.remove('show');
  if (botao) botao.style.display = 'inline-flex'; // Reexibe o botão
}

function mostrarNomeArquivos() {
  const input = document.getElementById('arquivo');
  const lista = document.getElementById('lista-arquivos');
  lista.innerHTML = "";

  if (input && input.files.length > 0) {
    Array.from(input.files).forEach(file => {
      const item = document.createElement('li');
      item.textContent = `📎 ${file.name}`;
      lista.appendChild(item);
    });
  }
}
