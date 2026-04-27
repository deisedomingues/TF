document.addEventListener("DOMContentLoaded", () => {
  const formLogin = document.getElementById("formLogin");

  formLogin.addEventListener("submit", (event) => {
    event.preventDefault();

    // Por enquanto é só um login falso para testar o visual.
    // Depois vamos trocar isso pelo login real do Supabase.
    window.location.href = "home.html";
  });
});