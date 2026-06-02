document.addEventListener("DOMContentLoaded", async () => {
  const usuario = await exigirLogin();

  if (!usuario) {
    return;
  }

  configurarBotaoSair();

  await garantirConfiguracaoInicial(usuario);
  await carregarConfiguracoesHome(usuario.id);
  await carregarIndicadoresHome(usuario.id);
});

async function garantirConfiguracaoInicial(usuario) {
  const { data, error } = await supabaseClient
    .from("configuracoes_site")
    .select("id")
    .eq("usuario_id", usuario.id)
    .maybeSingle();

  if (error) {
    console.error("Erro ao verificar configurações:", error);
    return;
  }

  if (data) {
    return;
  }

  const { error: erroInsert } = await supabaseClient
    .from("configuracoes_site")
    .insert({
      usuario_id: usuario.id,
      nome_profissional: "Tatiely Flávio",
      nome_sistema: "Tatiely Flávio",
      registro_profissional: "Psicóloga Perinatal, Parental e Bebês",
      titulo_site: "Psicologia Perinatal, Parental e Bebês",
      modalidade_padrao: "Online",
      duracao_padrao: 50,
      cor_principal: "#d98d7e",
      cor_secundaria: "#f7e7df",
      cor_destaque: "#8f8f78",
      cor_fundo: "#fffaf6"
    });

  if (erroInsert) {
    console.error("Erro ao criar configuração inicial:", erroInsert);
  }
}

async function carregarConfiguracoesHome(usuarioId) {
  const { data, error } = await supabaseClient
    .from("configuracoes_site")
    .select("*")
    .eq("usuario_id", usuarioId)
    .maybeSingle();

  if (error || !data) {
    return;
  }

  const nome = data.nome_profissional || "Tatiely Flávio";
  const subtitulo = data.registro_profissional || "Psicóloga Perinatal, Parental e Bebês";

  document.getElementById("nomeTopo").textContent = nome;
  document.getElementById("subtituloTopo").textContent = subtitulo;
  document.getElementById("tituloBoasVindas").textContent = `Olá, ${nome.split(" ")[0]}`;

  document.getElementById("marcaIcone").textContent =
    nome.trim().charAt(0).toUpperCase() || "T";
}

async function carregarIndicadoresHome(usuarioId) {
  await Promise.all([
    carregarTotalPacientes(usuarioId),
    carregarAtendimentosMes(usuarioId),
    carregarProximaSessao(usuarioId),
    carregarFinanceiroPendente(usuarioId)
  ]);
}

async function carregarTotalPacientes(usuarioId) {
  const { count, error } = await supabaseClient
    .from("pacientes")
    .select("*", { count: "exact", head: true })
    .eq("usuario_id", usuarioId)
    .eq("status", "Ativo");

  if (error) {
    console.error("Erro ao contar pacientes:", error);
    return;
  }

  document.getElementById("totalPacientesAtivos").textContent = count || 0;
}

async function carregarAtendimentosMes(usuarioId) {
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  const dataInicio = formatarDataISO(primeiroDia);
  const dataFim = formatarDataISO(ultimoDia);

  const { count, error } = await supabaseClient
    .from("agendamentos")
    .select("*", { count: "exact", head: true })
    .eq("usuario_id", usuarioId)
    .gte("data_sessao", dataInicio)
    .lte("data_sessao", dataFim)
    .in("status", ["Agendada", "Realizada", "Remarcada"]);

  if (error) {
    console.error("Erro ao contar atendimentos do mês:", error);
    return;
  }

  document.getElementById("totalSessoesMes").textContent = count || 0;
}

async function carregarProximaSessao(usuarioId) {
  const hoje = formatarDataISO(new Date());

  const { data, error } = await supabaseClient
    .from("agendamentos")
    .select("data_sessao, hora_inicio, hora_fim, modalidade, local_atendimento, pacientes(nome)")
    .eq("usuario_id", usuarioId)
    .gte("data_sessao", hoje)
    .in("status", ["Agendada", "Remarcada"])
    .order("data_sessao", { ascending: true })
    .order("hora_inicio", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar próxima sessão:", error);
    return;
  }

  if (!data) {
    document.getElementById("proximaSessao").textContent = "--";
    document.getElementById("detalheProximaSessao").textContent = "Nenhuma sessão agendada.";
    return;
  }

  const dataFormatada = formatarData(data.data_sessao);
  const horaInicio = data.hora_inicio ? data.hora_inicio.slice(0, 5) : "--";
  const horaFim = data.hora_fim ? data.hora_fim.slice(0, 5) : "";
  const paciente = data.pacientes?.nome || "Paciente";
  const modalidade = data.modalidade || "Modalidade não informada";

  document.getElementById("proximaSessao").textContent = `${dataFormatada} às ${horaInicio}`;

  let detalhe = `${paciente} • ${modalidade}`;

  if (horaFim) {
    detalhe += ` • até ${horaFim}`;
  }

  if (modalidade.toLowerCase() === "presencial" && data.local_atendimento) {
    detalhe += ` • ${data.local_atendimento}`;
  }

  document.getElementById("detalheProximaSessao").textContent = detalhe;
}

async function carregarFinanceiroPendente(usuarioId) {
  const { data, error } = await supabaseClient
    .from("financeiro")
    .select("valor")
    .eq("usuario_id", usuarioId)
    .in("status", ["Pendente", "Atrasado"]);

  if (error) {
    console.error("Erro ao carregar financeiro:", error);
    return;
  }

  const total = (data || []).reduce((soma, item) => {
    return soma + Number(item.valor || 0);
  }, 0);

  document.getElementById("financeiroPendente").textContent = formatarMoeda(total);
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function formatarDataISO(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function formatarData(dataISO) {
  if (!dataISO) {
    return "--";
  }

  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}