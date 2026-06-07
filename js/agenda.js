let usuarioAgenda = null;
let agendamentosCarregados = [];
let filtroAtual = "todos";
let agendaExpandida = false;
let buscaPacienteAtual = "";

document.addEventListener("DOMContentLoaded", async () => {
  usuarioAgenda = await exigirLogin();

  if (!usuarioAgenda) return;

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
  configurarBuscaPaciente();
  configurarBotaoExpandir();
  impedirSubmitComEnter("formAgenda");

  if (pacienteIdUrl) {
    abrirFormularioAgenda();
  }

  await carregarAgendamentos();
});

function impedirSubmitComEnter(formId) {
  const form = document.getElementById(formId);

  if (!form) return;

  form.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;

    const elemento = event.target;
    const tag = elemento.tagName.toLowerCase();

    if (tag === "textarea") return;

    event.preventDefault();
  });
}

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
    boxRecorrencia.style.display = recorrencia.value === "nao" ? "none" : "block";
  });

  formAgenda.addEventListener("submit", salvarAgendamento);
}

function configurarBuscaPaciente() {
  const campoBusca = document.getElementById("buscaPacienteAgenda");

  if (!campoBusca) return;

  campoBusca.addEventListener("input", () => {
    buscaPacienteAtual = campoBusca.value.trim().toLowerCase();
    agendaExpandida = false;
    mostrarProximosAgendamentos();
  });
}

function configurarBotaoExpandir() {
  const btnExpandir = document.getElementById("btnExpandirAgendamentos");

  if (!btnExpandir) return;

  btnExpandir.addEventListener("click", () => {
    agendaExpandida = !agendaExpandida;
    mostrarProximosAgendamentos();
  });
}

function abrirFormularioAgenda() {
  const btnAlternarFormulario = document.getElementById("btnAlternarFormularioAgenda");
  const areaFormulario = document.getElementById("areaFormularioAgenda");

  if (!btnAlternarFormulario || !areaFormulario) return;

  areaFormulario.style.display = "block";
  btnAlternarFormulario.textContent = "Recolher formulário";
}

function fecharFormularioAgendaAposSalvar() {
  const btnAlternarFormulario = document.getElementById("btnAlternarFormularioAgenda");
  const areaFormulario = document.getElementById("areaFormularioAgenda");

  if (!btnAlternarFormulario || !areaFormulario) return;

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
    .select("duracao_padrao, modalidade_padrao")
    .eq("usuario_id", usuarioAgenda.id)
    .maybeSingle();

  if (error) console.error(error);

  if (data && data.modalidade_padrao) {
    document.getElementById("modalidade").value = data.modalidade_padrao;
  }

  const duracao = Number(data?.duracao_padrao || 50);
  const horaInicio = document.getElementById("horaInicio");

  horaInicio.addEventListener("change", () => {
    preencherHoraFimPelaDuracao(duracao);
  });
}

function preencherHoraFimPelaDuracao(duracao) {
  const horaInicio = document.getElementById("horaInicio").value;
  const horaFim = document.getElementById("horaFim");

  if (!horaInicio || horaFim.value) return;

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
  const horaInicio = document.getElementById("horaInicio").value;
  const horaFim = document.getElementById("horaFim").value;
  const modalidade = document.getElementById("modalidade").value;
  const recorrencia = document.getElementById("recorrencia").value;
  const repetirAte = document.getElementById("repetirAte").value;
  const quantidadeSessoes = document.getElementById("quantidadeSessoes").value;
  const observacoes = document.getElementById("observacoes").value.trim();

  mensagem.textContent = "";

  if (!pacienteId || !dataPrimeiraSessao || !horaInicio || !horaFim) {
    mensagem.textContent = "Preencha paciente, data e horários do agendamento.";
    return;
  }

  if (horaFim <= horaInicio) {
    mensagem.textContent = "A hora de fim precisa ser depois da hora de início.";
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
    horaInicio,
    horaFim,
    modalidade,
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
      status: "Agendada",
      valor_sessao: null,
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
  if (recorrencia === "nao") return 1;
  if (quantidadeSessoes) return Number(quantidadeSessoes);

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

  const { data: agendamentos, error } = await supabaseClient
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

  const listaAgendamentos = agendamentos || [];
  const idsAgendamentos = listaAgendamentos.map((item) => item.id);

  let sessoesPorAgendamento = {};

  if (idsAgendamentos.length > 0) {
    const { data: sessoes, error: erroSessoes } = await supabaseClient
      .from("sessoes")
      .select("id, agendamento_id, status, modalidade")
      .eq("usuario_id", usuarioAgenda.id)
      .in("agendamento_id", idsAgendamentos);

    if (erroSessoes) {
      console.error("Erro ao buscar sessões vinculadas:", erroSessoes);
    }

    (sessoes || []).forEach((sessao) => {
      sessoesPorAgendamento[Number(sessao.agendamento_id)] = sessao;
    });
  }

  agendamentosCarregados = listaAgendamentos.map((agendamento) => {
    const sessaoVinculada = sessoesPorAgendamento[Number(agendamento.id)] || null;

    return {
      ...agendamento,
      sessao_registrada_id: sessaoVinculada?.id || null,
      sessao_status: sessaoVinculada?.status || null,
      sessao_modalidade: sessaoVinculada?.modalidade || null
    };
  });

  mostrarAgendaHoje();
  mostrarProximosAgendamentos();
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
          ${criarTagStatusAtendimento(item)}
          ${criarTagSituacaoRegistro(item)}
        </div>

        <div style="margin-top: 12px; display: flex; gap: 10px; flex-wrap: wrap;">
          ${criarBotaoEditarAgendamento(item)}
          ${criarBotaoRegistroSessao(item)}
        </div>
      </div>
    </article>
  `;
}

function mostrarProximosAgendamentos() {
  const lista = document.getElementById("listaProximosAgendamentos");
  const btnExpandir = document.getElementById("btnExpandirAgendamentos");

  const agendamentosFiltrados = filtrarAgendamentosPorPeriodo();
  const agendamentosParaExibir = agendaExpandida
    ? agendamentosFiltrados
    : agendamentosFiltrados.slice(0, 5);

  if (agendamentosFiltrados.length === 0) {
    lista.innerHTML = `
      <article class="item-lista">
        <div>
          <h3>Nenhum agendamento encontrado</h3>
          <p>Cadastre um novo agendamento, altere o filtro ou revise a busca pelo nome do paciente.</p>
        </div>
      </article>
    `;

    if (btnExpandir) {
      btnExpandir.style.display = "none";
    }

    return;
  }

  lista.innerHTML = agendamentosParaExibir.map(criarCardProximoAgendamento).join("");

  if (btnExpandir) {
    if (agendamentosFiltrados.length > 5) {
      btnExpandir.style.display = "inline-block";
      btnExpandir.textContent = agendaExpandida ? "Recolher" : `Expandir (${agendamentosFiltrados.length})`;
    } else {
      btnExpandir.style.display = "none";
    }
  }
}

function criarCardProximoAgendamento(item) {
  return `
    <article class="item-lista">
      <div style="width: 100%;">
        <h3>${escaparHTML(item.pacientes?.nome || "Paciente")}</h3>

        <p>
          <strong>${escaparHTML(formatarData(item.data_sessao))}</strong> —
          ${escaparHTML(item.hora_inicio?.slice(0, 5) || "--")} às
          ${escaparHTML(item.hora_fim?.slice(0, 5) || "--")}
        </p>

        <p>${escaparHTML(item.modalidade || "--")}</p>

        <div class="tags">
          ${criarTagStatusAtendimento(item)}
          ${criarTagSituacaoRegistro(item)}
          ${item.observacoes ? `<span class="tag">Com observações</span>` : ""}
        </div>

        ${item.observacoes ? `<p class="subtitulo" style="margin-top: 8px;">${escaparHTML(item.observacoes)}</p>` : ""}

        <div style="margin-top: 12px; display: flex; gap: 10px; flex-wrap: wrap;">
          ${criarBotaoEditarAgendamento(item)}
          ${criarBotaoRegistroSessao(item)}
        </div>
      </div>
    </article>
  `;
}

function criarTagStatusAtendimento(item) {
  const statusReal = item.sessao_status || item.status || "Agendada";
  const statusNormalizado = normalizarTexto(statusReal);
  const modalidadeReal = item.sessao_modalidade || item.modalidade;

  if (statusNormalizado === "realizada") {
    return `<span class="tag">Realizada - ${escaparHTML(formatarModalidadeCurta(modalidadeReal))}</span>`;
  }

  return `<span class="tag">${escaparHTML(statusReal)}</span>`;
}

function criarTagSituacaoRegistro(item) {
  if (!item.sessao_registrada_id) return "";

  return `
    <span class="tag" style="background: #E9F9EF; color: #246B3A; border: 1px solid #BDECCB;">
      Registro preenchido
    </span>
  `;
}

function criarBotaoEditarAgendamento(item) {
  return `
    <a
      href="editar-agendamento.html?id=${item.id}"
      class="btn btn-claro"
      style="display: inline-flex; padding: 8px 14px; font-size: 0.9rem;"
    >
      Editar
    </a>
  `;
}

function criarBotaoRegistroSessao(item) {
  if (item.sessao_registrada_id) return "";

  const hoje = formatarDataISO(new Date());
  const podeRegistrar = item.data_sessao <= hoje;

  if (!podeRegistrar) {
    return `
      <button
        type="button"
        class="btn btn-claro"
        disabled
        title="O registro só poderá ser preenchido na data agendada."
        style="display: inline-flex; padding: 8px 14px; font-size: 0.9rem; opacity: 0.6; cursor: not-allowed;"
      >
        Preencher registro
      </button>
    `;
  }

  return `
    <a
      href="registrar-sessao.html?agendamento_id=${item.id}"
      class="btn btn-principal"
      style="display: inline-flex; padding: 8px 14px; font-size: 0.9rem;"
    >
      Preencher registro
    </a>
  `;
}

function filtrarAgendamentosPorPeriodo() {
  const hoje = criarDataLocal(formatarDataISO(new Date()));
  const amanha = new Date(hoje);
  amanha.setDate(hoje.getDate() + 1);

  const fim = new Date(amanha);

  let lista = agendamentosCarregados.filter((item) => {
    const dataItem = criarDataLocal(item.data_sessao);
    return dataItem >= amanha;
  });

  if (filtroAtual === "semana") {
    fim.setDate(amanha.getDate() + 7);

    lista = lista.filter((item) => {
      const dataItem = criarDataLocal(item.data_sessao);
      return dataItem >= amanha && dataItem <= fim;
    });
  } else if (filtroAtual === "mes") {
    fim.setMonth(amanha.getMonth() + 1);

    lista = lista.filter((item) => {
      const dataItem = criarDataLocal(item.data_sessao);
      return dataItem >= amanha && dataItem <= fim;
    });
  } else if (filtroAtual === "ano") {
    fim.setFullYear(amanha.getFullYear() + 1);

    lista = lista.filter((item) => {
      const dataItem = criarDataLocal(item.data_sessao);
      return dataItem >= amanha && dataItem <= fim;
    });
  }

  if (buscaPacienteAtual) {
    lista = lista.filter((item) => {
      const nomePaciente = String(item.pacientes?.nome || "").toLowerCase();
      return nomePaciente.includes(buscaPacienteAtual);
    });
  }

  return lista;
}

function alterarFiltroAgenda(filtro) {
  filtroAtual = filtro;
  agendaExpandida = false;
  mostrarProximosAgendamentos();
}

function formatarModalidadeCurta(modalidade) {
  const texto = String(modalidade || "").trim().toLowerCase();

  if (texto === "online" || texto === "on-line") return "online";
  if (texto === "presencial") return "presencial";
  if (texto === "híbrida" || texto === "hibrida") return "híbrida";

  return texto || "modalidade não informada";
}

function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
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
  if (!dataISO) return "--";

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

function escaparHTML(texto) {
  return String(texto || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}