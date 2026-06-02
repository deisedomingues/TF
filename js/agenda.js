let usuarioAgenda = null;
let agendamentosCarregados = [];
let filtroAtual = "todos";

document.addEventListener("DOMContentLoaded", async () => {
  usuarioAgenda = await exigirLogin();

  if (!usuarioAgenda) {
    return;
  }

  configurarBotaoSair();

  document.getElementById("dataPrimeiraSessao").value = formatarDataISO(new Date());
  document.getElementById("dataHojeTexto").textContent = formatarDataCompleta(new Date());

  await carregarPacientes();
  await carregarConfiguracoesPadrao();

  const pacienteIdUrl = pegarParametroUrl("paciente_id");

  if (pacienteIdUrl) {
    document.getElementById("paciente").value = pacienteIdUrl;
  }

  configurarFormularioAgenda();

  if (pacienteIdUrl) {
    abrirFormularioAgenda();
  }

  await carregarAgendamentos();
});

function configurarFormularioAgenda() {
  const formAgenda = document.getElementById("formAgenda");
  const recorrencia = document.getElementById("recorrencia");
  const boxRecorrencia = document.getElementById("boxRecorrencia");
  const btnAlternarFormulario = document.getElementById("btnAlternarFormularioAgenda");
  const areaFormulario = document.getElementById("areaFormularioAgenda");

  if (btnAlternarFormulario && areaFormulario) {
    btnAlternarFormulario.addEventListener("click", () => {
      const estaAberto = areaFormulario.style.display !== "none";

      areaFormulario.style.display = estaAberto ? "none" : "block";
      btnAlternarFormulario.textContent = estaAberto ? "Abrir formulário" : "Recolher formulário";
    });
  }

  recorrencia.addEventListener("change", () => {
    if (recorrencia.value === "nao") {
      boxRecorrencia.style.display = "none";
    } else {
      boxRecorrencia.style.display = "block";
    }
  });

  formAgenda.addEventListener("submit", salvarAgendamento);
}

function abrirFormularioAgenda() {
  const btnAlternarFormulario = document.getElementById("btnAlternarFormularioAgenda");
  const areaFormulario = document.getElementById("areaFormularioAgenda");

  if (!btnAlternarFormulario || !areaFormulario) {
    return;
  }

  areaFormulario.style.display = "block";
  btnAlternarFormulario.textContent = "Recolher formulário";
}

function fecharFormularioAgendaAposSalvar() {
  const btnAlternarFormulario = document.getElementById("btnAlternarFormularioAgenda");
  const areaFormulario = document.getElementById("areaFormularioAgenda");

  if (!btnAlternarFormulario || !areaFormulario) {
    return;
  }

  areaFormulario.style.display = "none";
  btnAlternarFormulario.textContent = "Abrir formulário";
}

function pegarParametroUrl(nome) {
  const params = new URLSearchParams(window.location.search);
  return params.get(nome);
}

async function carregarPacientes() {
  const selectPaciente = document.getElementById("paciente");

  const { data, error } = await supabaseClient
    .from("pacientes")
    .select("id, nome, status")
    .eq("usuario_id", usuarioAgenda.id)
    .eq("status", "Ativo")
    .order("nome", { ascending: true });

  if (error) {
    console.error(error);
    selectPaciente.innerHTML = `<option value="">Erro ao carregar pacientes</option>`;
    return;
  }

  const pacientes = data || [];

  if (pacientes.length === 0) {
    selectPaciente.innerHTML = `<option value="">Nenhum paciente ativo cadastrado</option>`;
    return;
  }

  selectPaciente.innerHTML = `
    <option value="">Selecione um paciente</option>
    ${pacientes.map((paciente) => `
      <option value="${paciente.id}">${escaparHTML(paciente.nome)}</option>
    `).join("")}
  `;
}

async function carregarConfiguracoesPadrao() {
  const { data, error } = await supabaseClient
    .from("configuracoes_site")
    .select("valor_padrao, duracao_padrao, modalidade_padrao")
    .eq("usuario_id", usuarioAgenda.id)
    .maybeSingle();

  if (error || !data) {
    return;
  }

  if (data.valor_padrao !== null && data.valor_padrao !== undefined) {
    document.getElementById("valorSessao").value = data.valor_padrao;
  }

  if (data.modalidade_padrao) {
    document.getElementById("modalidade").value = data.modalidade_padrao;
  }

  const duracao = Number(data.duracao_padrao || 50);

  document.getElementById("horaInicio").addEventListener("change", () => {
    preencherHoraFimPelaDuracao(duracao);
  });
}

function preencherHoraFimPelaDuracao(duracao) {
  const horaInicio = document.getElementById("horaInicio").value;
  const horaFim = document.getElementById("horaFim");

  if (!horaInicio || horaFim.value) {
    return;
  }

  const [h, m] = horaInicio.split(":").map(Number);
  const data = new Date();
  data.setHours(h);
  data.setMinutes(m + duracao);

  horaFim.value = `${String(data.getHours()).padStart(2, "0")}:${String(data.getMinutes()).padStart(2, "0")}`;
}

async function salvarAgendamento(event) {
  event.preventDefault();

  const mensagem = document.getElementById("mensagemAgenda");
  const btnSalvar = document.getElementById("btnSalvarAgendamento");

  const pacienteId = document.getElementById("paciente").value;
  const dataPrimeiraSessao = document.getElementById("dataPrimeiraSessao").value;
  const valorSessao = document.getElementById("valorSessao").value;
  const horaInicio = document.getElementById("horaInicio").value;
  const horaFim = document.getElementById("horaFim").value;
  const modalidade = document.getElementById("modalidade").value;
  const status = document.getElementById("status").value;
  const recorrencia = document.getElementById("recorrencia").value;
  const repetirAte = document.getElementById("repetirAte").value;
  const quantidadeSessoes = document.getElementById("quantidadeSessoes").value;
  const observacoes = document.getElementById("observacoes").value.trim();

  mensagem.textContent = "";

  if (!pacienteId || !dataPrimeiraSessao || !horaInicio || !horaFim) {
    mensagem.textContent = "Preencha paciente, data e horários do agendamento.";
    return;
  }

  if (recorrencia !== "nao" && !repetirAte && !quantidadeSessoes) {
    mensagem.textContent = "Para agendamento recorrente, informe uma data final ou uma quantidade de sessões.";
    return;
  }

  btnSalvar.disabled = true;
  btnSalvar.textContent = "Salvando...";

  const agendamentos = gerarAgendamentos({
    pacienteId,
    dataPrimeiraSessao,
    valorSessao,
    horaInicio,
    horaFim,
    modalidade,
    status,
    recorrencia,
    repetirAte,
    quantidadeSessoes,
    observacoes
  });

  const { error } = await supabaseClient
    .from("agendamentos")
    .insert(agendamentos);

  btnSalvar.disabled = false;
  btnSalvar.textContent = "Salvar agendamento";

  if (error) {
    console.error(error);
    mensagem.textContent = "Erro ao salvar agendamento.";
    return;
  }

  mensagem.textContent = agendamentos.length === 1
    ? "Agendamento salvo com sucesso!"
    : `${agendamentos.length} agendamentos salvos com sucesso!`;

  document.getElementById("formAgenda").reset();
  document.getElementById("dataPrimeiraSessao").value = formatarDataISO(new Date());
  document.getElementById("boxRecorrencia").style.display = "none";

  await carregarConfiguracoesPadrao();
  await carregarAgendamentos();

  fecharFormularioAgendaAposSalvar();

  setTimeout(() => {
    mensagem.textContent = "";
  }, 3000);
}

function gerarAgendamentos(dados) {
  const quantidade = calcularQuantidadeAgendamentos(
    dados.dataPrimeiraSessao,
    dados.recorrencia,
    dados.repetirAte,
    dados.quantidadeSessoes
  );

  const grupoRecorrencia = dados.recorrencia === "nao" ? null : crypto.randomUUID();
  const lista = [];

  let dataAtual = criarDataLocal(dados.dataPrimeiraSessao);

  for (let i = 0; i < quantidade; i++) {
    lista.push({
      usuario_id: usuarioAgenda.id,
      paciente_id: Number(dados.pacienteId),
      data_sessao: formatarDataISO(dataAtual),
      hora_inicio: dados.horaInicio,
      hora_fim: dados.horaFim,
      modalidade: dados.modalidade,
      status: dados.status,
      valor_sessao: dados.valorSessao ? Number(dados.valorSessao) : null,
      observacoes: dados.observacoes || null,
      recorrencia: dados.recorrencia,
      recorrencia_grupo: grupoRecorrencia,
      recorrencia_ordem: i + 1
    });

    dataAtual = proximaData(dataAtual, dados.recorrencia);
  }

  return lista;
}

function calcularQuantidadeAgendamentos(dataInicial, recorrencia, repetirAte, quantidadeSessoes) {
  if (recorrencia === "nao") {
    return 1;
  }

  if (quantidadeSessoes) {
    return Number(quantidadeSessoes);
  }

  const fim = criarDataLocal(repetirAte);
  let atual = criarDataLocal(dataInicial);
  let quantidade = 0;

  while (atual <= fim && quantidade < 200) {
    quantidade++;
    atual = proximaData(atual, recorrencia);
  }

  return quantidade;
}

function proximaData(data, recorrencia) {
  const nova = new Date(data);

  if (recorrencia === "semanal") {
    nova.setDate(nova.getDate() + 7);
  } else if (recorrencia === "quinzenal") {
    nova.setDate(nova.getDate() + 15);
  } else if (recorrencia === "mensal") {
    nova.setMonth(nova.getMonth() + 1);
  }

  return nova;
}

async function carregarAgendamentos() {
  const hoje = formatarDataISO(new Date());

  const { data, error } = await supabaseClient
    .from("agendamentos")
    .select("*, pacientes(nome)")
    .eq("usuario_id", usuarioAgenda.id)
    .gte("data_sessao", hoje)
    .order("data_sessao", { ascending: true })
    .order("hora_inicio", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  agendamentosCarregados = data || [];

  mostrarAgendaHoje();
  mostrarProximosAgendamentos();
  atualizarIndicadores();
}

function mostrarAgendaHoje() {
  const lista = document.getElementById("listaHoje");
  const hoje = formatarDataISO(new Date());

  const agendamentosHoje = agendamentosCarregados.filter((item) => item.data_sessao === hoje);

  document.getElementById("tagTotalHoje").textContent =
    `${agendamentosHoje.length} ${agendamentosHoje.length === 1 ? "sessão" : "sessões"}`;

  if (agendamentosHoje.length === 0) {
    lista.innerHTML = `
      <article class="evento-agenda">
        <div class="conteudo-evento">
          <h3>Nenhum atendimento hoje</h3>
          <p>Não há agendamentos cadastrados para hoje.</p>
        </div>
      </article>
    `;
    return;
  }

  lista.innerHTML = agendamentosHoje.map(criarCardAgendaHoje).join("");
}

function criarCardAgendaHoje(item) {
  return `
    <article class="evento-agenda">
      <div class="hora-evento">
        <strong>${escaparHTML(item.hora_inicio?.slice(0, 5) || "--")}</strong>
        <span>${escaparHTML(item.hora_fim?.slice(0, 5) || "--")}</span>
      </div>

      <div class="conteudo-evento">
        <h3>${escaparHTML(item.pacientes?.nome || "Paciente")}</h3>
        <p>${escaparHTML(item.modalidade || "--")}</p>

        <div class="tags">
          <span class="tag">${escaparHTML(item.status || "--")}</span>
          ${item.recorrencia !== "nao" ? `<span class="tag">Recorrente</span>` : ""}
        </div>
      </div>
    </article>
  `;
}

function mostrarProximosAgendamentos() {
  const lista = document.getElementById("listaProximosAgendamentos");
  const agendamentos = filtrarAgendamentosPorPeriodo();

  if (agendamentos.length === 0) {
    lista.innerHTML = `
      <article class="item-lista">
        <div>
          <h3>Nenhum agendamento encontrado</h3>
          <p>Cadastre um novo agendamento ou altere o filtro.</p>
        </div>
      </article>
    `;
    return;
  }

  lista.innerHTML = agendamentos.map(criarCardProximoAgendamento).join("");
}

function criarCardProximoAgendamento(item) {
  return `
    <article class="item-lista">
      <div>
        <h3>${escaparHTML(item.pacientes?.nome || "Paciente")}</h3>
        <p><strong>${escaparHTML(formatarData(item.data_sessao))}</strong> — ${escaparHTML(item.hora_inicio?.slice(0, 5) || "--")} às ${escaparHTML(item.hora_fim?.slice(0, 5) || "--")}</p>
        <p>${escaparHTML(item.modalidade || "--")} ${item.recorrencia !== "nao" ? "— sessão recorrente" : "— sessão avulsa"}</p>

        <div class="tags">
          <span class="tag">${escaparHTML(item.status || "--")}</span>
          ${item.valor_sessao ? `<span class="tag">${formatarMoeda(item.valor_sessao)}</span>` : ""}
          ${item.observacoes ? `<span class="tag">Com observações</span>` : ""}
        </div>

        ${item.observacoes ? `<p class="subtitulo" style="margin-top: 8px;">${escaparHTML(item.observacoes)}</p>` : ""}
      </div>
    </article>
  `;
}

function filtrarAgendamentosPorPeriodo() {
  const hoje = criarDataLocal(formatarDataISO(new Date()));
  const fim = new Date(hoje);

  if (filtroAtual === "hoje") {
    const hojeISO = formatarDataISO(hoje);
    return agendamentosCarregados.filter((item) => item.data_sessao === hojeISO);
  }

  if (filtroAtual === "semana") {
    fim.setDate(hoje.getDate() + 7);
  } else if (filtroAtual === "mes") {
    fim.setMonth(hoje.getMonth() + 1);
  } else {
    return agendamentosCarregados;
  }

  return agendamentosCarregados.filter((item) => {
    const dataItem = criarDataLocal(item.data_sessao);
    return dataItem >= hoje && dataItem <= fim;
  });
}

function alterarFiltroAgenda(filtro) {
  filtroAtual = filtro;
  mostrarProximosAgendamentos();
}

function atualizarIndicadores() {
  const hoje = criarDataLocal(formatarDataISO(new Date()));
  const hojeISO = formatarDataISO(hoje);

  const fimSemana = new Date(hoje);
  fimSemana.setDate(hoje.getDate() + 7);

  const totalHoje = agendamentosCarregados.filter((item) => item.data_sessao === hojeISO).length;

  const totalSemana = agendamentosCarregados.filter((item) => {
    const dataItem = criarDataLocal(item.data_sessao);
    return dataItem >= hoje && dataItem <= fimSemana;
  }).length;

  const totalRecorrentes = agendamentosCarregados.filter((item) => item.recorrencia !== "nao").length;
  const totalRemarcacoes = agendamentosCarregados.filter((item) => item.status === "Remarcada").length;

  document.getElementById("totalHoje").textContent = totalHoje;
  document.getElementById("totalSemana").textContent = totalSemana;
  document.getElementById("totalRecorrentes").textContent = totalRecorrentes;
  document.getElementById("totalRemarcacoes").textContent = totalRemarcacoes;
}

function criarDataLocal(dataISO) {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
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

function formatarDataCompleta(data) {
  return data.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function escaparHTML(texto) {
  return String(texto || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}