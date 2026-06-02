const SUPABASE_URL = "https://xfhmymsaioyelccfjahv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_8lG2W10VjNYB_d7yb5q7jg_qACcGnLp";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function buscarUsuarioLogado() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error || !data || !data.user) {
    return null;
  }

  return data.user;
}

async function exigirLogin() {
  const usuario = await buscarUsuarioLogado();

  if (!usuario) {
    window.location.href = "login.html";
    return null;
  }

  return usuario;
}

async function sair() {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
}

function configurarBotaoSair() {
  const linksSair = document.querySelectorAll('a[href="login.html"]');

  linksSair.forEach((link) => {
    if (link.textContent.trim().toLowerCase() === "sair") {
      link.addEventListener("click", async (event) => {
        event.preventDefault();
        await sair();
      });
    }
  });
}