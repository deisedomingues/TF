document.addEventListener("DOMContentLoaded", async () => {
  const formConfiguracoes = document.getElementById("formConfiguracoes");
  const mensagemConfig = document.getElementById("mensagemConfig");

  const nomeProfissional = document.getElementById("nomeProfissional");
  const registroProfissional = document.getElementById("registroProfissional");
  const emailProfissional = document.getElementById("emailProfissional");
  const telefoneProfissional = document.getElementById("telefoneProfissional");
  const enderecoAtendimento = document.getElementById("enderecoAtendimento");
  const bioProfissional = document.getElementById("bioProfissional");

  const valorPadrao = document.getElementById("valorPadrao");
  const duracaoPadrao = document.getElementById("duracaoPadrao");
  const modalidadePadrao = document.getElementById("modalidadePadrao");
  const intervaloSessoes = document.getElementById("intervaloSessoes");
  const lembretePadrao = document.getElementById("lembretePadrao");
  const formaPagamentoPadrao = document.getElementById("formaPagamentoPadrao");

  const nomeSistema = document.getElementById("nomeSistema");

  const previewNome = document.getElementById("previewNome");
  const previewValor = document.getElementById("previewValor");
  const previewDuracao = document.getElementById("previewDuracao");
  const previewModalidade = document.getElementById("previewModalidade");
  const previewTemaResumo = document.getElementById("previewTemaResumo");

  const previewTemaNome = document.getElementById("previewTemaNome");
  const previewTemaDescricao = document.getElementById("previewTemaDescricao");

  const btnRestaurar = document.getElementById("btnRestaurar");
  const botoesTema = document.querySelectorAll(".opcao-tema");

  let usuarioLogado = null;
  let temaAtual = "perinatal";

  const temasAgendaClinica = {
    perinatal: {
      nome: "Perinatal",
      descricao: "Tema delicado com verde suave, bege e branco.",
      classe: "tema-perinatal"
    },
    acolhimento: {
      nome: "Acolhimento",
      descricao: "Tema calmo com tons de lavanda, areia e branco.",
      classe: "tema-acolhimento"
    },
    profissional: {
      nome: "Profissional",
      descricao: "Tema mais neutro, com verde escuro, cinza claro e branco.",
      classe: "tema-profissional"
    },
    maternidade: {
      nome: "Maternidade",
      descricao: "Tema suave com rosé, creme e verde claro.",
      classe: "tema-maternidade"
    }
  };

  function obterClienteSupabase() {
    if (window.supabaseClient) {
      return window.supabaseClient;
    }

    if (window.sb) {
      return window.sb;
    }

    if (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
      return window.supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_ANON_KEY
      );
    }

    return null;
  }

  const banco = obterClienteSupabase();

  function mostrarMensagem(texto, tipo = "sucesso") {
    mensagemConfig.textContent = texto;
    mensagemConfig.style.display = "block";

    mensagemConfig.classList.remove("mensagem-sucesso", "mensagem-erro");

    if (tipo === "erro") {
      mensagemConfig.classList.add("mensagem-erro");
    } else {
      mensagemConfig.classList.add("mensagem-sucesso");
    }

    setTimeout(() => {
      mensagemConfig.style.display = "none";
    }, 3500);
  }

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
    previewModalidade.textContent = modalidadePadrao.value || "Não definido";
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

  function aplicarTema(chaveTema) {
    const tema = temasAgendaClinica[chaveTema] || temasAgendaClinica.perinatal;

    document.body.classList.remove(
      "tema-perinatal",
      "tema-acolhimento",
      "tema-profissional",
      "tema-maternidade"
    );

    document.body.classList.add(tema.classe);

    localStorage.setItem("temaAgendaClinica", chaveTema);

    temaAtual = chaveTema;

    atualizarBotoesTema(chaveTema);

    previewTemaNome.textContent = `Tema ${tema.nome}`;
    previewTemaDescricao.textContent = tema.descricao;
    previewTemaResumo.textContent = tema.nome;

    return tema;
  }

  function obterDadosFormulario() {
    return {
      nome_profissional: nomeProfissional.value.trim(),
      registro_profissional: registroProfissional.value.trim(),
      email_profissional: emailProfissional.value.trim(),
      telefone_profissional: telefoneProfissional.value.trim(),
      endereco_atendimento: enderecoAtendimento.value.trim(),
      bio_profissional: bioProfissional.value.trim(),

      valor_padrao: valorPadrao.value ? Number(valorPadrao.value) : null,
      duracao_padrao: Number(duracaoPadrao.value),
      modalidade_padrao: modalidadePadrao.value,
      intervalo_sessoes: Number(intervaloSessoes.value),
      lembrete_padrao: lembretePadrao.value,
      forma_pagamento_padrao: formaPagamentoPadrao.value,

      nome_sistema: nomeSistema.value.trim() || "Tatiely Psicologia",
      tema_sistema: temaAtual
    };
  }

  function preencherFormulario(dados) {
    nomeProfissional.value = dados.nome_profissional || "Tatiely Psicologia";
    registroProfissional.value = dados.registro_profissional || "";
    emailProfissional.value = dados.email_profissional || "";
    telefoneProfissional.value = dados.telefone_profissional || "";
    enderecoAtendimento.value = dados.endereco_atendimento || "";
    bioProfissional.value = dados.bio_profissional || "";

    valorPadrao.value = dados.valor_padrao || "";
    duracaoPadrao.value = String(dados.duracao_padrao || 50);
    modalidadePadrao.value = dados.modalidade_padrao || "Online";
    intervaloSessoes.value = String(dados.intervalo_sessoes || 10);
    lembretePadrao.value = dados.lembrete_padrao || "24h";
    formaPagamentoPadrao.value = dados.forma_pagamento_padrao || "Pix";

    nomeSistema.value = dados.nome_sistema || "Tatiely Psicologia";

    aplicarTema(dados.tema_sistema || "perinatal");
    atualizarPreviewProfissional();
  }

  function dadosPadrao() {
    return {
      nome_profissional: "Tatiely Psicologia",
      registro_profissional: "",
      email_profissional: "",
      telefone_profissional: "",
      endereco_atendimento: "",
      bio_profissional: "Psicóloga com atuação em psicologia perinatal, maternidade, parentalidade e acolhimento emocional.",

      valor_padrao: null,
      duracao_padrao: 50,
      modalidade_padrao: "Online",
      intervalo_sessoes: 10,
      lembrete_padrao: "24h",
      forma_pagamento_padrao: "Pix",

      nome_sistema: "Tatiely Psicologia",
      tema_sistema: "perinatal"
    };
  }

  function salvarLocalmente(dados) {
    localStorage.setItem("configuracoesProfissionalTatiely", JSON.stringify(dados));
  }

  function carregarLocalmente() {
    const dadosSalvos = localStorage.getItem("configuracoesProfissionalTatiely");

    if (!dadosSalvos) {
      return null;
    }

    try {
      return JSON.parse(dadosSalvos);
    } catch (erro) {
      console.error("Erro ao ler configurações locais:", erro);
      return null;
    }
  }

  async function carregarUsuario() {
    if (!banco || !banco.auth) {
      return null;
    }

    const { data, error } = await banco.auth.getUser();

    if (error) {
      console.warn("Não foi possível obter usuário logado:", error);
      return null;
    }

    return data.user || null;
  }

  async function carregarConfiguracoes() {
    usuarioLogado = await carregarUsuario();

    if (!banco || !usuarioLogado) {
      const local = carregarLocalmente();
      preencherFormulario(local || dadosPadrao());
      return;
    }

    const { data, error } = await banco
      .from("configuracoes_profissional")
      .select("*")
      .eq("usuario_id", usuarioLogado.id)
      .maybeSingle();

    if (error) {
      console.error("Erro ao carregar configurações:", error);
      const local = carregarLocalmente();
      preencherFormulario(local || dadosPadrao());
      return;
    }

    if (data) {
      preencherFormulario(data);
    } else {
      preencherFormulario(dadosPadrao());
    }
  }

  async function salvarConfiguracoes() {
    const dados = obterDadosFormulario();

    salvarLocalmente(dados);

    if (!banco || !usuarioLogado) {
      mostrarMensagem("Configurações salvas neste navegador.");
      return;
    }

    const dadosParaSalvar = {
      ...dados,
      usuario_id: usuarioLogado.id,
      atualizado_em: new Date().toISOString()
    };

    const { error } = await banco
      .from("configuracoes_profissional")
      .upsert(dadosParaSalvar, {
        onConflict: "usuario_id"
      });

    if (error) {
      console.error("Erro ao salvar configurações:", error);
      mostrarMensagem("Não foi possível salvar no Supabase. Verifique a tabela e as permissões.", "erro");
      return;
    }

    mostrarMensagem("Configurações salvas com sucesso!");
  }

  nomeProfissional.addEventListener("input", atualizarPreviewProfissional);
  valorPadrao.addEventListener("input", atualizarPreviewProfissional);
  duracaoPadrao.addEventListener("change", atualizarPreviewProfissional);
  modalidadePadrao.addEventListener("change", atualizarPreviewProfissional);

  botoesTema.forEach((botao) => {
    botao.addEventListener("click", () => {
      aplicarTema(botao.dataset.tema);
    });
  });

  formConfiguracoes.addEventListener("submit", async (event) => {
    event.preventDefault();
    await salvarConfiguracoes();
  });

  btnRestaurar.addEventListener("click", () => {
    preencherFormulario(dadosPadrao());
    mostrarMensagem("Exemplo restaurado com sucesso!");
  });

  await carregarConfiguracoes();
});