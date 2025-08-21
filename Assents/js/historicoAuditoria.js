document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formAuditoria");
  const tabelaCorpo = document.getElementById("tabelaCorpo");

  const mockAuditoria = [
    {
      dataHora: "11/07/2025 14:10",
      usuario: "Carlos A. (Operador)",
      acao: "Abertura",
      descricao: "Chamado #1234 aberto",
    },
    {
      dataHora: "11/07/2025 15:32",
      usuario: "João S. (Técnico)",
      acao: "Atendimento",
      descricao: "Chamado #1234 em andamento",
    },
    {
      dataHora: "11/07/2025 16:01",
      usuario: "Ana B. (Técnico)",
      acao: "Finalização",
      descricao: "Chamado #1235 concluído",
    }
  ];

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const filtroUsuario = document.getElementById("filtroUsuario").value.toLowerCase();
    const filtroAcao = document.getElementById("filtroAcao").value.toLowerCase();
    const filtroChamado = document.getElementById("filtroChamado").value;

    const resultados = mockAuditoria.filter(item => {
      return (
        (filtroUsuario === "" || item.usuario.toLowerCase().includes(filtroUsuario)) &&
        (filtroAcao === "" || item.acao.toLowerCase().includes(filtroAcao)) &&
        (filtroChamado === "" || item.descricao.includes(`#${filtroChamado}`))
      );
    });

    renderizarTabela(resultados);
  });

  function renderizarTabela(dados) {
    if (dados.length === 0) {
      tabelaCorpo.innerHTML = `<tr><td colspan="4">Nenhum registro encontrado.</td></tr>`;
      return;
    }

    tabelaCorpo.innerHTML = dados.map(item => `
      <tr>
        <td>${item.dataHora}</td>
        <td>${item.usuario}</td>
        <td>${item.acao}</td>
        <td>${item.descricao}</td>
      </tr>
    `).join('');
  }

  // Exportação (mock)
  document.getElementById("btnExportarAuditoria").addEventListener("click", () => {
    alert("🔄 Exportação de auditoria será implementada em breve.");
  });
});
