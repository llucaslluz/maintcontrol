document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const btn = form.querySelector('button[type="submit"]');

  // Rotas por categoria (ajuste se quiser)
  const ROUTES = {
    'Supervisor': '/DashboardSupervisorAdm.html',
    'Técnico': '/DashboardTecnico.html',
    'Operador': '/DashboardOperacao.html',
    'Administrador': '/DashboardSupervisorAdm.html',
    'Operação': '/DashboardOperacao.html',
    'Manutenção': '/DashboardTecnico.html',
    'DEFAULT': '/DashboardSupervisorAdm.html'
  };

  // Cache de categorias (id -> nome)
  const categoryMap = {};

  // Carrega categorias uma vez (para sabermos para onde redirecionar)
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

  // Normaliza strings (remove acentos e caixa)
  const normalize = (s) =>
    (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  // Extrai o primeiro nome a partir do nome completo
  const firstToken = (s) => (s || '').trim().split(/\s+/)[0];

  async function loginHandler(event) {
    event.preventDefault();

    const campoLoginPrimeiroNome = document.getElementById('registro').value.trim();
    const campoSenhaChapa = document.getElementById('senha').value.trim();

    if (!campoLoginPrimeiroNome || !campoSenhaChapa) {
      alert('❌ Preencha o primeiro nome e o número de registro.');
      return;
    }

    btn.disabled = true;

    try {
      // 1) Busca candidatos pelo nome começando com o primeiro nome digitado (case-insensitive)
// 1) Busca direto pela CHAPA (senha digitada)
const { data: candidatos, error } = await window.supabase
  .from('usuario')
  .select('id_usuario, nome, chapa, ativo, id_categoria')
  .eq('chapa', campoSenhaChapa);  // <- usa a chapa (senha) como filtro único

if (error) {
  console.error(error);
  alert('❌ Erro ao validar login. Tente novamente.');
  return;
}

if (!candidatos || candidatos.length === 0) {
  alert('❌ Usuário não encontrado.');
  return;
}

// 2) Confirma o primeiro nome bate (ignorando acentos e caixa)
const alvo = candidatos.find(u =>
  normalize(firstToken(u.nome)) === normalize(campoLoginPrimeiroNome)
);

if (!alvo) {
  alert('❌ Nome ou número de registro inválidos.');
  return;
}

      // 3) Descobrir nome da categoria (se existir)
      const categoriaNome = alvo.id_categoria ? (categoryMap[alvo.id_categoria] || null) : null;

      // 4) Guarda sessão mínima
      localStorage.setItem('mcv_user', JSON.stringify({
        id: alvo.id_usuario,
        nome: alvo.nome,
        chapa: alvo.chapa,
        id_categoria: alvo.id_categoria || null,
        categoria_nome: categoriaNome
      }));

      alert('✅ Login realizado com sucesso!');

      // 5) Redireciona por categoria (Supervisor/Técnico já configurados)
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
