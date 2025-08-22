document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formFiltros");
  const areaResultado = document.getElementById("areaResultado");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const tipoRelatorio = document.getElementById("tipoRelatorio").value;
    const status = document.getElementById("filtroStatus").value;
    const local = document.getElementById("filtroLocal").value;
    const maquina = document.getElementById("filtroMaquina").value;
    const tecnico = document.getElementById("filtroTecnico").value;
    const inicio = document.getElementById("filtroInicio").value;
    const fim = document.getElementById("filtroFim").value;

    // Simula resultado (você vai integrar com Supabase futuramente)
    areaResultado.innerHTML = `
      <h3>Relatório: ${tipoRelatorio}</h3>
      <ul>
        <li>Status: ${status || "Todos"}</li>
        <li>Local: ${local || "Todos"}</li>
        <li>Máquina: ${maquina || "Todas"}</li>
        <li>Técnico: ${tecnico || "Todos"}</li>
        <li>Período: ${inicio || "..." } até ${fim || "..."}</li>
      </ul>
      <p>📊 Aqui virá a tabela ou gráfico de acordo com o tipo de relatório escolhido.</p>
    `;
  });

  // Exportar Excel
  document.getElementById("btnExportarExcel").addEventListener("click", () => {
    alert("🔄 Função de exportação Excel em desenvolvimento...");
  });

  // Exportar PDF
  document.getElementById("btnExportarPDF").addEventListener("click", () => {
    alert("🔄 Função de exportação PDF em desenvolvimento...");
  });
});
