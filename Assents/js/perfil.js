// 🔹 MOCK de dados do usuário logado (simulação)
const usuarioLogado = {
  nome: "Carlos A.",
  chapa: "1234567",
  cargo: "Operador de Máquina",
  email: "carlos@empresa.com",
  telefone: "(11) 98765-4321",
  foto: "../Images/avatar-default.png"
};

// 🔹 Executa ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
  preencherDadosPerfil();
  configurarEventos();
});

// 🔹 Preenche os campos com os dados simulados do usuário
function preencherDadosPerfil() {
  document.getElementById("nome").value = usuarioLogado.nome;
  document.getElementById("chapa").value = usuarioLogado.chapa;
  document.getElementById("cargo").value = usuarioLogado.cargo;
  document.getElementById("email").value = usuarioLogado.email;
  document.getElementById("telefone").value = usuarioLogado.telefone;
  document.getElementById("fotoPerfil").src = usuarioLogado.foto;
}

// 🔹 Configura os botões e formulários
function configurarEventos() {
  // Botão: Alterar foto
  document.getElementById("btnAlterarFoto").addEventListener("click", () => {
    document.getElementById("inputFoto").click();
  });

  // Preview da nova foto
  document.getElementById("inputFoto").addEventListener("change", function () {
    const file = this.files[0];
    if (file) {
      const urlPreview = URL.createObjectURL(file);
      document.getElementById("fotoPerfil").src = urlPreview;
    }
  });

  // Botão: Remover foto (reseta para padrão)
  document.getElementById("btnRemoverFoto").addEventListener("click", () => {
    document.getElementById("fotoPerfil").src = "../Images/avatar-default.png";
    document.getElementById("inputFoto").value = "";
  });

  // Salvar alterações básicas
  document.getElementById("formPerfil").addEventListener("submit", (e) => {
    e.preventDefault();
    const novoEmail = document.getElementById("email").value;
    const novoTelefone = document.getElementById("telefone").value;

    // Aqui você faria o update no Supabase
    console.log("📤 Salvando dados...");
    console.log("Novo e-mail:", novoEmail);
    console.log("Novo telefone:", novoTelefone);

    alert("Dados atualizados com sucesso!");
  });

  // Alterar senha
  document.getElementById("btnAlterarSenha").addEventListener("click", () => {
    const novaSenha = document.getElementById("novaSenha").value;
    const confirmarSenha = document.getElementById("confirmarSenha").value;

    if (novaSenha.length < 6) {
      alert("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      alert("As senhas não coincidem!");
      return;
    }

    // Aqui você faria o update da senha no Supabase
    console.log("🔐 Alterando senha...");
    console.log("Nova senha:", novaSenha);

    alert("Senha alterada com sucesso!");
    document.getElementById("novaSenha").value = "";
    document.getElementById("confirmarSenha").value = "";
  });
}
