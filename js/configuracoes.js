document.addEventListener("DOMContentLoaded", () => {
  const formConfiguracoes = document.getElementById("formConfiguracoes");
  const mensagemConfig = document.getElementById("mensagemConfig");

  const nomeProfissional = document.getElementById("nomeProfissional");
  const valorPadrao = document.getElementById("valorPadrao");
  const duracaoPadrao = document.getElementById("duracaoPadrao");
  const modalidadePadrao = document.getElementById("modalidadePadrao");

  const previewNome = document.getElementById("previewNome");
  const previewValor = document.getElementById("previewValor");
  const previewDuracao = document.getElementById("previewDuracao");
  const previewModalidade = document.getElementById("previewModalidade");

  const previewTemaNome = document.getElementById("previewTemaNome");
  const previewTemaDescricao = document.getElementById("previewTemaDescricao");
  const previewTemaResumo = document.getElementById("previewTemaResumo");

  const btnRestaurar = document.getElementById("btnRestaurar");
  const botoesTema = document.querySelectorAll(".opcao-tema");

  function formatarValor(valor) {
    if (!valor) {
      return "Não definido";
    }

    return Number(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function atualizarPreviewProfissional() {
    previewNome.textContent = nomeProfissional.value || "Não definido";
    previewValor.textContent = formatarValor(valorPadrao.value);
    previewDuracao.textContent = `${duracaoPadrao.value} minutos`;
    previewModalidade.textContent = modalidadePadrao.value;
  }

  function atualizarBotoesTema(chaveTema) {
    botoesTema.forEach((botao) => {
      if (botao.dataset.tema === chaveTema) {
        botao.classList.add("ativo");
      } else {
        botao.classList.remove("ativo");
      }
    });
  }

  function selecionarTema(chaveTema) {
    const tema = aplicarTemaAgendaClinica(chaveTema);

    localStorage.setItem("temaAgendaClinica", chaveTema);

    atualizarBotoesTema(chaveTema);

    previewTemaNome.textContent = `Tema ${tema.nome}`;
    previewTemaDescricao.textContent = tema.descricao;
    previewTemaResumo.textContent = tema.nome;
  }

  nomeProfissional.addEventListener("input", atualizarPreviewProfissional);
  valorPadrao.addEventListener("input", atualizarPreviewProfissional);
  duracaoPadrao.addEventListener("change", atualizarPreviewProfissional);
  modalidadePadrao.addEventListener("change", atualizarPreviewProfissional);

  botoesTema.forEach((botao) => {
    botao.addEventListener("click", () => {
      selecionarTema(botao.dataset.tema);
    });
  });

  formConfiguracoes.addEventListener("submit", (event) => {
    event.preventDefault();

    mensagemConfig.textContent = "Configurações salvas com sucesso!";
    mensagemConfig.style.display = "block";

    setTimeout(() => {
      mensagemConfig.style.display = "none";
    }, 3000);
  });

  btnRestaurar.addEventListener("click", () => {
    nomeProfissional.value = "Deise Domingues";
    valorPadrao.value = "";
    duracaoPadrao.value = "50";
    modalidadePadrao.value = "Online";

    selecionarTema("show");
    atualizarPreviewProfissional();

    mensagemConfig.textContent = "Exemplo restaurado com sucesso!";
    mensagemConfig.style.display = "block";

    setTimeout(() => {
      mensagemConfig.textContent = "Configurações salvas com sucesso!";
      mensagemConfig.style.display = "none";
    }, 3000);
  });

  const temaSalvo = localStorage.getItem("temaAgendaClinica") || "show";

  selecionarTema(temaSalvo);
  atualizarPreviewProfissional();
});