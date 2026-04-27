function obterTemasAgendaClinica() {
  return {
    show: {
      nome: "Show",
      descricao: "Tema atual com branco, laranja pôr do sol e vermelho-violeta.",
      classe: "tema-show",
      cores: {
        "--cor-fundo": "#FFF7F4",
        "--cor-card": "#FFFFFF",
        "--cor-principal": "#FF5841",
        "--cor-secundaria": "#C53678",
        "--cor-texto": "#2B2B2B",
        "--cor-texto-suave": "#777777",
        "--cor-clara": "#FFE7E0",
        "--cor-borda": "#F0D8D2",
        "--cor-sombra": "rgba(197, 54, 120, 0.12)"
      }
    },

    ceu: {
      nome: "Céu",
      descricao: "Tema claro com azul suave, azul brilhante e branco.",
      classe: "tema-ceu",
      cores: {
        "--cor-fundo": "#E9F1FA",
        "--cor-card": "#FFFFFF",
        "--cor-principal": "#00ABE4",
        "--cor-secundaria": "#0079A8",
        "--cor-texto": "#1F3342",
        "--cor-texto-suave": "#607080",
        "--cor-clara": "#D7ECFA",
        "--cor-borda": "#C9DCEB",
        "--cor-sombra": "rgba(0, 171, 228, 0.15)"
      }
    },

    noite: {
      nome: "Noite",
      descricao: "Tema escuro com azul clássico, turquesa e dourado.",
      classe: "tema-noite",
      cores: {
        "--cor-fundo": "#0A1828",
        "--cor-card": "#102238",
        "--cor-principal": "#178582",
        "--cor-secundaria": "#BFA181",
        "--cor-texto": "#FFFFFF",
        "--cor-texto-suave": "#D7DEE8",
        "--cor-clara": "#18324F",
        "--cor-borda": "#27435F",
        "--cor-sombra": "rgba(0, 0, 0, 0.32)"
      }
    },

    casual: {
      nome: "Casual",
      descricao: "Tema sóbrio com azul escuro, dourado e branco.",
      classe: "tema-casual",
      cores: {
        "--cor-fundo": "#F7F3EA",
        "--cor-card": "#FFFFFF",
        "--cor-principal": "#002349",
        "--cor-secundaria": "#957C3D",
        "--cor-texto": "#1B2430",
        "--cor-texto-suave": "#69707A",
        "--cor-clara": "#EAE1CF",
        "--cor-borda": "#D8CCB7",
        "--cor-sombra": "rgba(0, 35, 73, 0.14)"
      }
    }
  };
}

function aplicarTemaAgendaClinica(chaveTema) {
  const temas = obterTemasAgendaClinica();
  const tema = temas[chaveTema] || temas.show;

  Object.entries(tema.cores).forEach(([variavel, valor]) => {
    document.documentElement.style.setProperty(variavel, valor);
  });

  document.body.classList.remove(
    "tema-show",
    "tema-ceu",
    "tema-noite",
    "tema-casual"
  );

  document.body.classList.add(tema.classe);

  return tema;
}

document.addEventListener("DOMContentLoaded", () => {
  const temaSalvo = localStorage.getItem("temaAgendaClinica") || "show";
  aplicarTemaAgendaClinica(temaSalvo);
});