document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('formChamado');
  const botaoAnexo = document.getElementById('botao-anexo');
  const modalAnexo = document.getElementById('anexo');
  const inputArquivos = document.getElementById('arquivo');
  const listaArquivos = document.getElementById('lista-arquivos');

  window.abrirAnexo = function () {
    if (modalAnexo) modalAnexo.classList.add('show');
    if (botaoAnexo) botaoAnexo.style.display = 'none';
  }

  window.fecharAnexo = function () {
    if (modalAnexo) modalAnexo.classList.remove('show');
    if (botaoAnexo) botaoAnexo.style.display = 'inline-flex';
  }

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

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const localNome = document.getElementById('local').value;
    const maquinaNome = document.getElementById('maquina').value;
    const tipo = document.getElementById('tipo').value;
    const status = document.getElementById('status').value;
    const prioridade = document.getElementById('prioridade').value;
    const descricao = document.getElementById('descricao').value.trim();

    if (!localNome || !maquinaNome || !tipo || !status || !prioridade || !descricao) {
      alert("⚠️ Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    // 👉 Etapa 3: Buscar os UUIDs no Supabase
    try {
      const { data: locais, error: errorLocal } = await supabase
        .from('local')
        .select('id_local')
        .eq('nome_local', localNome)
        .single();

      const { data: maquinas, error: errorMaquina } = await supabase
        .from('maquina_dispositivo')
        .select('id_maquina')
        .eq('nome_maquina', maquinaNome)
        .single();

      if (errorLocal || !locais) throw new Error('Local não encontrado');
      if (errorMaquina || !maquinas) throw new Error('Máquina não encontrada');

      // ⚙️ Monta objeto de chamado
      const novoChamado = {
        id_local: locais.id_local,
        id_maquina: maquinas.id_maquina,
        tipo_manutencao: tipo,
        status_maquina: status,
        prioridade: prioridade,
        descricao_problema: descricao,
        // futuramente: id_usuario, data, etc...
      };

      // 📨 Envia para o Supabase
      const { data, error } = await supabase
        .from('chamado')
        .insert([novoChamado]);

      if (error) {
        console.error('Erro ao salvar chamado:', error);
        alert("❌ Erro ao abrir o chamado. Tente novamente.");
      } else {
        alert("✅ Chamado aberto com sucesso!");
        form.reset();
        listaArquivos.innerHTML = "";
        fecharAnexo();
      }
    } catch (err) {
      console.error(err);
      alert("❌ Erro ao processar o chamado.");
    }
  });
});
