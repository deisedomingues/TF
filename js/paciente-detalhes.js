document.addEventListener("DOMContentLoaded", () => {
  const buscaHistorico = document.getElementById("buscaHistorico");
  const sessoes = document.querySelectorAll(".sessao-card");

  buscaHistorico.addEventListener("input", () => {
    const termo = buscaHistorico.value.toLowerCase().trim();

    sessoes.forEach((sessao) => {
      const texto = sessao.innerText.toLowerCase();

      if (texto.includes(termo)) {
        sessao.style.display = "block";
      } else {
        sessao.style.display = "none";
      }
    });
  });
});