document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const btn = form.querySelector('button[type="submit"]');

  // Rotas por categoria (ajuste conforme suas páginas)
  const ROUTES = {
    'Supervisor': '/DashboardSupervisorAdm.html',
    'Técnico': '/DashboardTecnico.html',
    'Operador': '/DashboardOperacao.html',
    'Administrador': '/DashboardSupervisorAdm.html',
    'Operação': '/DashboardOperacao.html',
    'Manutenção': '/DashboardTecnico.html',
    'DEFAULT': '/DashboardSupervisorAdm.html'
  };

  // cache id_categoria -> nome_categoria
  const categoryMap = {};

  async function preloadCategories() {
    try {
      const { data, error } = await window.supabase
        .from('categoria_usuario')
        .select('id_categoria, nome_categoria');
      if (error) throw error;
      (data || []).forEach(c => { categoryMap[c.id_categoria] = c.nome_categoria; });
    } catch (e) {
      console.warn('Não consegui carregar categorias agora. Vou seguir sem elas.', e);
    }
  }
  preloadCategories();

  // util: mantém só dígitos (para cpf)
  const onlyDigits = (s) => (s || '').replace(/\D+/g, '');

  async function loginHandler(event) {
    event.preventDefault();
    const loginChapa = document.getElementById('registro').value.trim(); // agora é a CHAPA
    const senhaCpfRaw = document.getElementById('senha').value.trim();  // CPF (com ou sem máscara)
    const senhaCpf = onlyDigits(senhaCpfRaw);

    if (!loginChapa || !senhaCpf) {
      alert('❌ Preencha a CHAPA e o CPF.');
      return;
    }

    btn.disabled = true;

    try {
      // 1) Busca usuário pela CHAPA (única)
      const { data: usuarios, error } = await window.supabase
        .from('usuario')
        .select('id_usuario, nome, chapa, ativo, id_categoria, cpf')
        .eq('chapa', loginChapa)
        .limit(1);

      if (error) {
        console.error(error);
        alert('❌ Erro ao validar login. Tente novamente.');
        return;
      }

      if (!usuarios || usuarios.length === 0) {
        alert('❌ Usuário não encontrado (CHAPA inválida).');
        return;
      }

      const u = usuarios[0];

      // 2) Compara CPF (sanitizado)
      const dbCpf = onlyDigits(u.cpf || '');
      if (!dbCpf || dbCpf !== senhaCpf) {
        alert('❌ CPF incorreto.');
        return;
      }

      if (u.ativo === false) {
        alert('⚠️ Usuário inativo. Fale com o administrador.');
        return;
      }

      // 3) nome da categoria (se carregado)
      const categoriaNome = u.id_categoria ? (categoryMap[u.id_categoria] || null) : null;

      // 4) guarda sessão local
      localStorage.setItem('mcv_user', JSON.stringify({
        id: u.id_usuario,
        nome: u.nome,
        chapa: u.chapa,
        id_categoria: u.id_categoria || null,
        categoria_nome: categoriaNome
      }));

      alert('✅ Login realizado com sucesso!');

      // 5) redireciona
      const destino = categoriaNome && ROUTES[categoriaNome] ? ROUTES[categoriaNome] : ROUTES.DEFAULT;
      window.location.href = destino;

    } catch (e) {
      console.error(e);
      alert('❌ Erro ao validar login. Tente novamente.');
    } finally {
      btn.disabled = false;
    }
  }

  form.addEventListener('submit', loginHandler);
});
