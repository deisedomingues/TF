document.addEventListener("DOMContentLoaded", async () => {
  const formLogin = document.getElementById("formLogin");
  const mensagemLogin = document.getElementById("mensagemLogin");
  const btnEntrar = document.getElementById("btnEntrar");

  const usuarioAtual = await buscarUsuarioLogado();

  if (usuarioAtual) {
    window.location.href = "home.html";
    return;
  }

  formLogin.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value.trim();

    mensagemLogin.textContent = "";

    if (!email || !senha) {
      mensagemLogin.textContent = "Digite e-mail e senha.";
      return;
    }

    btnEntrar.disabled = true;
    btnEntrar.textContent = "Entrando...";

    const { error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: senha
    });

    if (error) {
      console.error(error);
      mensagemLogin.textContent = "Erro ao entrar. Verifique o e-mail e a senha.";
      btnEntrar.disabled = false;
      btnEntrar.textContent = "Entrar";
      return;
    }

    window.location.href = "home.html";
  });
});