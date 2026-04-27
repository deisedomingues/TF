document.addEventListener("DOMContentLoaded", () => {
  const buscaGeral = document.getElementById("buscaGeral");
  const filtroPaciente = document.getElementById("filtroPaciente");
  const dataInicio = document.getElementById("dataInicio");
  const dataFim = document.getElementById("dataFim");
  const btnBuscar = document.getElementById("btnBuscar");
  const btnLimpar = document.getElementById("btnLimpar");
  const textoResultado = document.getElementById("textoResultado");
  const cards = document.querySelectorAll(".resultado-card");
  const botoesTag = document.querySelectorAll(".tag-botao");

  function filtrarResultados() {
    const termo = buscaGeral.value.toLowerCase().trim();
    const pacienteSelecionado = filtroPaciente.value;
    const inicio = dataInicio.value;
    const fim = dataFim.value;

    let totalVisivel = 0;

    cards.forEach((card) => {
      const textoCard = card.innerText.toLowerCase();
      const pacienteCard = card.dataset.paciente;
      const dataCard = card.dataset.data;

      const combinaTermo = termo === "" || textoCard.includes(termo);
      const combinaPaciente = pacienteSelecionado === "" || pacienteCard === pacienteSelecionado;
      const combinaDataInicio = inicio === "" || dataCard >= inicio;
      const combinaDataFim = fim === "" || dataCard <= fim;

      if (combinaTermo && combinaPaciente && combinaDataInicio && combinaDataFim) {
        card.style.display = "block";
        totalVisivel++;
      } else {
        card.style.display = "none";
      }
    });

    if (totalVisivel === 1) {
      textoResultado.textContent = "1 registro encontrado.";
    } else {
      textoResultado.textContent = `${totalVisivel} registros encontrados.`;
    }
  }

  btnBuscar.addEventListener("click", filtrarResultados);

  buscaGeral.addEventListener("input", filtrarResultados);
  filtroPaciente.addEventListener("change", filtrarResultados);
  dataInicio.addEventListener("change", filtrarResultados);
  dataFim.addEventListener("change", filtrarResultados);

  botoesTag.forEach((botao) => {
    botao.addEventListener("click", () => {
      buscaGeral.value = botao.dataset.tag;
      filtrarResultados();
    });
  });

  btnLimpar.addEventListener("click", () => {
    buscaGeral.value = "";
    filtroPaciente.value = "";
    dataInicio.value = "";
    dataFim.value = "";

    filtrarResultados();
  });

  filtrarResultados();
});