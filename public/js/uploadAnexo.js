async function uploadAnexos(idChamado, idUsuario) {
  const input = document.getElementById('arquivo');
  if (!input || input.files.length === 0) return;

  const arquivos = Array.from(input.files);

  for (const arquivo of arquivos) {
    const extensao = arquivo.name.split('.').pop();
    const nomeFinal = `${crypto.randomUUID()}.${extensao}`;  // evita nome duplicado
    const caminho = `${idChamado}/${nomeFinal}`;  // pasta por chamado

    // Upload no Storage
    const { data, error: erroUpload } = await supabase.storage
      .from('anexos')
      .upload(caminho, arquivo);

    if (erroUpload) {
      console.error("❌ Erro ao enviar:", arquivo.name, erroUpload.message);
      continue;
    }

    // Inserir dados do anexo na tabela
    const tipoArquivo = arquivo.type;
    const dataUpload = new Date().toISOString();

    const { error: erroInsert } = await supabase
      .from('anexo')
      .insert([{
        id_usuario_upload: idUsuario,
        id_chamado: idChamado,
        nome_arquivo: arquivo.name,
        tipo_arquivo: tipoArquivo,
        caminho_armazenamento: caminho,
        data_hora_upload: dataUpload
      }]);

    if (erroInsert) {
      console.error("❌ Erro ao salvar metadados:", arquivo.name, erroInsert.message);
    } else {
      console.log("✅ Anexo salvo:", arquivo.name);
    }
  }
}
