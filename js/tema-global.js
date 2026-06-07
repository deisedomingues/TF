document.addEventListener("DOMContentLoaded", () => {
  const temaSalvo = localStorage.getItem("temaAgendaClinica") || "perinatal";

  document.body.classList.remove(
    "tema-perinatal",
    "tema-acolhimento",
    "tema-profissional",
    "tema-maternidade"
  );

  document.body.classList.add(`tema-${temaSalvo}`);
});