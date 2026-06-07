let usuarioSessao = null;
let atendimentosHoje = [];
let atendimentosAnteriores = [];
let pacotesPacienteAtual = [];

document.addEventListener("DOMContentLoaded", async () => {
  usuarioSessao = await exigirLogin();

  if (!usuarioSessao) return;

  configurarBotaoSair();

  document.getElementById("data").value = formatarDataISO(new Date());

  configurarFinanceiro();

  await carregarPacientes();
  await carregarPendenciasDeRegistro();

  const agendamentoIdUrl = pegarParametroUrl("agendamento_id");

  if (agendamentoIdUrl) {
    await carregarAgendamentoPorId(agendamentoIdUrl);
  }

  document.getElementById("btnLimparAgendamento").addEventListener("click", limparSelecaoAgendamento);
  document.getElementById("formSessao").addEventListener("submit", salvarSessao);
});

function configurarFinanceiro() {
  const tipoCobranca = document.getElementById("tipoCobranca");
  const pago = document.getElementById("pago");
  const paciente = document.getElementById("paciente");

  tipoCobranca.addEventListener("change", async () => {
    atualizarExibicaoFinanceiro();

    const pacienteId = paciente.value;
    if (tipoCobranca.value === "pacote" && pacienteId) {
      await carregarPacotesDoPaciente(pacienteId);
    }
  });

  pago.addEventListener("change", atualizarExibicaoFinanceiro);

  paciente.addEventListener("change", async () => {
    if (tipoCobranca.value === "pacote" && paciente.value) {
      await carregarPacotesDoPaciente(paciente.value);
    }
  });
}

function atualizarExibicaoFinanceiro() {
  const tipoCobranca = document.getElementById("tipoCobranca").value;
  const pago = document.getElementById("pago").value;

  const grupoPacote = document.getElementById("grupoPacote");
  const boxPagamento = document.getElementById("boxPagamento");
  const valorSessao = document.getElementById("valorSessao");
  const pacoteId = document.getElementById("pacoteId");
  const formaPagamento = document.getElementById("formaPagamento");
  const dataPagamento = document.getElementById("dataPagamento");

  grupoPacote.style.display = tipoCobranca === "pacote" ? "block" : "none";
  boxPagamento.style.display = pago === "sim" ? "block" : "none";

  if (tipoCobranca === "sem_cobranca") {
    valorSessao.value = "";
    valorSessao.disabled = true;
    document.getElementById("pago").value = "nao";
    boxPagamento.style.display = "none";
    formaPagamento.value = "";
    dataPagamento.value = "";
  } else {
    valorSessao.disabled = false;
  }

  if (tipoCobranca !== "pacote") {
    pacoteId.value = "";
  }

  if (pago !== "sim") {
    formaPagamento.value = "";
    dataPagamento.value = "";
  } else if (!dataPagamento.value) {
    dataPagamento.value = formatarDataISO(new Date());
  }
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
    .eq("usuario_id", usuarioSessao.id)
    .order("nome", { ascending: true });

  if (error) {
    console.error(error);
    selectPaciente.innerHTML = `<option value="">Erro ao carregar pacientes</option>`;
    return;
  }

  const pacientes = data || [];

  if (pacientes.length === 0) {
    selectPaciente.innerHTML = `<option value="">Nenhum paciente cadastrado</option>`;
    return;
  }

  selectPaciente.innerHTML = `
    <option value="">Selecione um paciente</option>
    ${pacientes.map((paciente) => `
      <option value="${paciente.id}">
        ${escaparHTML(paciente.nome)}
      </option>
    `).join("")}
  `;
}

async function carregarPacotesDoPaciente(pacienteId) {
  const selectPacote = document.getElementById("pacoteId");

  selectPacote.innerHTML = `<option value="">Carregando pacotes...</option>`;

  const { data, error } = await supabaseClient
    .from("pacote_sessoes")
    .select("*")
    .eq("usuario_id", usuarioSessao.id)
    .eq("paciente_id", pacienteId)
    .eq("status", "Ativo")
    .order("criado_em", { ascending: false });

  if (error) {
    console.error(error);
    selectPacote.innerHTML = `<option value="">Erro ao carregar pacotes</option>`;
    return;
  }

  pacotesPacienteAtual = data || [];

  if (pacotesPacienteAtual.length === 0) {
    selectPacote.innerHTML = `<option value="">Nenhum pacote ativo encontrado</option>`;
    return;
  }

  const idsPacotes = pacotesPacienteAtual.map((pacote) => pacote.id);

  let sessoesUsadasPorPacote = {};

  const { data: sessoes, error: erroSessoes } = await supabaseClient
    .from("sessoes")
    .select("pacote_id")
    .eq("usuario_id", usuarioSessao.id)
    .in("pacote_id", idsPacotes);

  if (erroSessoes) {
    console.error("Erro ao contar sessões usadas do pacote:", erroSessoes);
  }

  (sessoes || []).forEach((sessao) => {
    const id = Number(sessao.pacote_id);
    sessoesUsadasPorPacote[id] = (sessoesUsadasPorPacote[id] || 0) + 1;
  });

  selectPacote.innerHTML = `
    <option value="">Selecione um pacote</option>
    ${pacotesPacienteAtual.map((pacote) => {
      const usadas = sessoesUsadasPorPacote[Number(pacote.id)] || 0;
      const total = Number(pacote.quantidade_sessoes || 0);
      const restantes = Math.max(total - usadas, 0);

      return `
        <option value="${pacote.id}" data-valor="${Number(pacote.valor_por_sessao || 0)}">
          ${escaparHTML(pacote.descricao || "Pacote")} — ${usadas}/${total} usadas — ${restantes} restantes
        </option>
      `;
    }).join("")}
  `;

  selectPacote.addEventListener("change", preencherValorPeloPacote);
}

function preencherValorPeloPacote() {
  const selectPacote = document.getElementById("pacoteId");
  const option = selectPacote.options[selectPacote.selectedIndex];

  if (!option) return;

  const valor = option.getAttribute("data-valor");

  if (valor && Number(valor) > 0) {
    document.getElementById("valorSessao").value = Number(valor).toFixed(2);
  }
}

async function carregarPendenciasDeRegistro() {
  const hoje = formatarDataISO(new Date());

  const { data: agendamentos, error } = await supabaseClient
    .from("agendamentos")
    .select("*, pacientes(nome)")
    .eq("usuario_id", usuarioSessao.id)
    .lte("data_sessao", hoje)
    .eq("status", "Agendada")
    .order("data_sessao", { ascending: false })
    .order("hora_inicio", { ascending: true });

  if (error) {
    console.error(error);
    mostrarErroListas();
    return;
  }

  const listaAgendamentos = agendamentos || [];
  const idsAgendamentos = listaAgendamentos.map((item) => item.id);

  let idsComRegistro = new Set();

  if (idsAgendamentos.length > 0) {
    const { data: sessoes, error: erroSessoes } = await supabaseClient
      .from("sessoes")
      .select("agendamento_id")
      .eq("usuario_id", usuarioSessao.id)
      .in("agendamento_id", idsAgendamentos);

    if (erroSessoes) {
      console.error("Erro ao verificar registros existentes:", erroSessoes);
    }

    idsComRegistro = new Set(
      (sessoes || [])
        .map((sessao) => Number(sessao.agendamento_id))
        .filter((id) => !Number.isNaN(id))
    );
  }

  const pendentes = listaAgendamentos.filter((item) => !idsComRegistro.has(Number(item.id)));

  atendimentosHoje = pendentes.filter((item) => item.data_sessao === hoje);
  atendimentosAnteriores = pendentes.filter((item) => item.data_sessao < hoje);

  mostrarAtendimentosHoje();
  mostrarAtendimentosAnteriores();
}

function mostrarErroListas() {
  const listaHoje = document.getElementById("listaAtendimentosHoje");
  const listaAnteriores = document.getElementById("listaAtendimentosAnteriores");

  listaHoje.innerHTML = `
    <article class="item-lista">
      <div>
        <h3>Erro ao carregar atendimentos</h3>
        <p>Não foi possível buscar os registros pendentes.</p>
      </div>
    </article>
  `;

  listaAnteriores.innerHTML = "";
  document.getElementById("cardPendenciasAnteriores").style.display = "none";
}

function mostrarAtendimentosHoje() {
  const lista = document.getElementById("listaAtendimentosHoje");
  const tag = document.getElementById("tagAtendimentosHoje");

  tag.textContent = `${atendimentosHoje.length} ${atendimentosHoje.length === 1 ? "atendimento" : "atendimentos"}`;

  if (atendimentosHoje.length === 0) {
    lista.innerHTML = `
      <article class="item-lista">
        <div>
          <h3>Nenhum atendimento pendente hoje</h3>
          <p>Todos os atendimentos de hoje já foram registrados ou não há agenda cadastrada.</p>
        </div>
      </article>
    `;
    return;
  }

  lista.innerHTML = atendimentosHoje.map((item) => criarCardAtendimento(item, "hoje")).join("");
}

function mostrarAtendimentosAnteriores() {
  const card = document.getElementById("cardPendenciasAnteriores");
  const lista = document.getElementById("listaAtendimentosAnteriores");
  const tag = document.getElementById("tagAtendimentosAnteriores");

  if (atendimentosAnteriores.length === 0) {
    card.style.display = "none";
    lista.innerHTML = "";
    return;
  }

  card.style.display = "block";

  tag.textContent = `${atendimentosAnteriores.length} ${atendimentosAnteriores.length === 1 ? "pendente" : "pendentes"}`;

  lista.innerHTML = atendimentosAnteriores.map((item) => criarCardAtendimento(item, "anterior")).join("");
}

function criarCardAtendimento(item, origem) {
  const dataTexto = origem === "hoje" ? "Hoje" : formatarData(item.data_sessao);

  return `
    <article class="item-lista">
      <div>
        <h3>${escaparHTML(item.pacientes?.nome || "Paciente")}</h3>

        <p>
          <strong>${escaparHTML(dataTexto)}</strong> —
          <strong>${escaparHTML(item.hora_inicio?.slice(0, 5) || "--")}</strong>
          às
          <strong>${escaparHTML(item.hora_fim?.slice(0, 5) || "--")}</strong>
          — ${escaparHTML(item.modalidade || "--")}
        </p>

        <div class="tags">
          <span class="tag">Agendada</span>
          ${item.observacoes ? `<span class="tag">Com observações</span>` : ""}
        </div>

        ${item.observacoes ? `<p class="subtitulo" style="margin-top: 8px;">${escaparHTML(item.observacoes)}</p>` : ""}
      </div>

      <div>
        <button type="button" class="btn btn-principal" onclick="selecionarAtendimentoPendente(${item.id}, '${origem}')">
          Preencher registro
        </button>
      </div>
    </article>
  `;
}

function selecionarAtendimentoPendente(id, origem) {
  const lista = origem === "hoje" ? atendimentosHoje : atendimentosAnteriores;
  const atendimento = lista.find((item) => Number(item.id) === Number(id));

  if (!atendimento) {
    alert("Atendimento não encontrado.");
    return;
  }

  preencherFormularioComAgendamento(atendimento);
}

async function carregarAgendamentoPorId(id) {
  const { data, error } = await supabaseClient
    .from("agendamentos")
    .select("*, pacientes(nome)")
    .eq("usuario_id", usuarioSessao.id)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(error);
    alert("Erro ao carregar o agendamento.");
    return;
  }

  if (!data) {
    alert("Agendamento não encontrado.");
    return;
  }

  const jaExisteRegistro = await verificarSeAgendamentoJaTemRegistro(id);

  if (jaExisteRegistro) {
    alert("Este agendamento já possui registro preenchido.");
    await carregarPendenciasDeRegistro();
    return;
  }

  preencherFormularioComAgendamento(data);
}

async function verificarSeAgendamentoJaTemRegistro(agendamentoId) {
  const { data, error } = await supabaseClient
    .from("sessoes")
    .select("id")
    .eq("usuario_id", usuarioSessao.id)
    .eq("agendamento_id", agendamentoId)
    .limit(1);

  if (error) {
    console.error("Erro ao verificar registro existente:", error);
    return false;
  }

  return (data || []).length > 0;
}

async function preencherFormularioComAgendamento(agendamento) {
  document.getElementById("cardFormularioSessao").style.display = "block";

  document.getElementById("agendamentoId").value = agendamento.id;
  document.getElementById("paciente").value = agendamento.paciente_id;
  document.getElementById("data").value = agendamento.data_sessao;
  document.getElementById("inicio").value = agendamento.hora_inicio?.slice(0, 5) || "";
  document.getElementById("fim").value = agendamento.hora_fim?.slice(0, 5) || "";
  document.getElementById("modalidade").value = agendamento.modalidade || "Presencial";
  document.getElementById("status").value = "Realizada";
  document.getElementById("anotacoes").value = "";
  document.getElementById("hashtags").value = "";
  document.getElementById("mensagemSessao").textContent = "";

  document.getElementById("tipoCobranca").value = "avulsa";
  document.getElementById("pacoteId").innerHTML = `<option value="">Selecione um pacote</option>`;
  document.getElementById("valorSessao").value = "";
  document.getElementById("pago").value = "nao";
  document.getElementById("formaPagamento").value = "";
  document.getElementById("dataPagamento").value = "";
  document.getElementById("observacaoFinanceira").value = "";

  atualizarExibicaoFinanceiro();

  await carregarPacotesDoPaciente(agendamento.paciente_id);

  document.getElementById("textoModoFormulario").textContent =
    "Você está preenchendo o registro de um atendimento da agenda. Os dados principais ficam bloqueados para evitar inconsistências.";

  bloquearCamposDoAgendamento(true);

  document.getElementById("cardFormularioSessao").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  setTimeout(() => {
    document.getElementById("anotacoes").focus();
  }, 400);
}

function bloquearCamposDoAgendamento(bloquear) {
  document.getElementById("paciente").disabled = bloquear;
  document.getElementById("data").readOnly = bloquear;
  document.getElementById("inicio").readOnly = bloquear;
  document.getElementById("fim").readOnly = bloquear;
  document.getElementById("modalidade").disabled = bloquear;

  document.getElementById("status").disabled = false;
}

function limparSelecaoAgendamento() {
  document.getElementById("agendamentoId").value = "";
  document.getElementById("formSessao").reset();
  document.getElementById("data").value = formatarDataISO(new Date());
  document.getElementById("mensagemSessao").textContent = "";

  document.getElementById("textoModoFormulario").textContent =
    "Preencha o registro do atendimento selecionado.";

  bloquearCamposDoAgendamento(false);
  atualizarExibicaoFinanceiro();

  document.getElementById("cardFormularioSessao").style.display = "none";
}

async function salvarSessao(event) {
  event.preventDefault();

  const btnSalvar = document.getElementById("btnSalvarSessao");
  const mensagem = document.getElementById("mensagemSessao");

  const agendamentoId = document.getElementById("agendamentoId").value;
  const pacienteId = document.getElementById("paciente").value;
  const dataSessao = document.getElementById("data").value;
  const horaInicio = document.getElementById("inicio").value || null;
  const horaFim = document.getElementById("fim").value || null;
  const modalidade = document.getElementById("modalidade").value;
  const status = document.getElementById("status").value;
  const anotacoes = document.getElementById("anotacoes").value.trim();
  const hashtags = tratarHashtags(document.getElementById("hashtags").value);

  const tipoCobranca = document.getElementById("tipoCobranca").value;
  const pacoteId = document.getElementById("pacoteId").value;
  const valorSessaoCampo = document.getElementById("valorSessao").value;
  const pago = document.getElementById("pago").value === "sim";
  const formaPagamento = document.getElementById("formaPagamento").value;
  const dataPagamento = document.getElementById("dataPagamento").value;
  const observacaoFinanceira = document.getElementById("observacaoFinanceira").value.trim();

  const valorSessao = valorSessaoCampo ? Number(valorSessaoCampo) : null;

  mensagem.textContent = "";

  if (!agendamentoId) {
    mensagem.textContent = "Selecione um atendimento pendente antes de salvar.";
    return;
  }

  if (!pacienteId) {
    mensagem.textContent = "Selecione um paciente.";
    return;
  }

  if (!dataSessao) {
    mensagem.textContent = "Informe a data da sessão.";
    return;
  }

  if (!status) {
    mensagem.textContent = "Selecione o status da sessão.";
    return;
  }

  if (tipoCobranca === "pacote" && !pacoteId) {
    mensagem.textContent = "Selecione o pacote do paciente.";
    return;
  }

  if (tipoCobranca !== "sem_cobranca" && valorSessao !== null && valorSessao < 0) {
    mensagem.textContent = "O valor da sessão não pode ser negativo.";
    return;
  }

  if (pago && !formaPagamento) {
    mensagem.textContent = "Informe a forma de pagamento.";
    return;
  }

  if (pago && !dataPagamento) {
    mensagem.textContent = "Informe a data do pagamento.";
    return;
  }

  btnSalvar.disabled = true;
  btnSalvar.textContent = "Salvando...";

  const jaExisteRegistro = await verificarSeAgendamentoJaTemRegistro(agendamentoId);

  if (jaExisteRegistro) {
    btnSalvar.disabled = false;
    btnSalvar.textContent = "Salvar registro";
    mensagem.textContent = "Este agendamento já possui registro preenchido.";
    await carregarPendenciasDeRegistro();
    return;
  }

  const dadosSessao = {
    usuario_id: usuarioSessao.id,
    paciente_id: Number(pacienteId),
    agendamento_id: Number(agendamentoId),
    data_sessao: dataSessao,
    hora_inicio: horaInicio,
    hora_fim: horaFim,
    modalidade: modalidade,
    status: status,
    anotacoes: anotacoes || null,
    hashtags: hashtags,
    valor_sessao: tipoCobranca === "sem_cobranca" ? null : valorSessao,
    pago: tipoCobranca === "sem_cobranca" ? false : pago,
    forma_pagamento: pago ? formaPagamento : null,
    data_pagamento: pago ? dataPagamento : null,
    observacao_financeira: observacaoFinanceira || null,
    pacote_id: tipoCobranca === "pacote" ? Number(pacoteId) : null
  };

  const { error } = await supabaseClient
    .from("sessoes")
    .insert(dadosSessao);

  if (error) {
    console.error(error);
    btnSalvar.disabled = false;
    btnSalvar.textContent = "Salvar registro";
    mensagem.textContent = "Erro ao salvar registro.";
    return;
  }

  await atualizarStatusDoAgendamento(agendamentoId, status);

  if (tipoCobranca === "pacote" && pacoteId) {
    await verificarEncerramentoPacote(pacoteId);
  }

  btnSalvar.disabled = false;
  btnSalvar.textContent = "Salvar registro";

  mensagem.textContent = "Registro salvo com sucesso!";

  setTimeout(async () => {
    limparSelecaoAgendamento();
    await carregarPendenciasDeRegistro();
  }, 1200);
}

async function verificarEncerramentoPacote(pacoteId) {
  const { data: pacote, error: erroPacote } = await supabaseClient
    .from("pacote_sessoes")
    .select("id, quantidade_sessoes")
    .eq("usuario_id", usuarioSessao.id)
    .eq("id", pacoteId)
    .maybeSingle();

  if (erroPacote || !pacote) {
    console.error("Erro ao verificar pacote:", erroPacote);
    return;
  }

  const { data: sessoes, error: erroSessoes } = await supabaseClient
    .from("sessoes")
    .select("id")
    .eq("usuario_id", usuarioSessao.id)
    .eq("pacote_id", pacoteId);

  if (erroSessoes) {
    console.error("Erro ao contar sessões do pacote:", erroSessoes);
    return;
  }

  const usadas = (sessoes || []).length;
  const total = Number(pacote.quantidade_sessoes || 0);

  if (total > 0 && usadas >= total) {
    const { error } = await supabaseClient
      .from("pacote_sessoes")
      .update({
        status: "Encerrado",
        atualizado_em: new Date().toISOString()
      })
      .eq("usuario_id", usuarioSessao.id)
      .eq("id", pacoteId);

    if (error) {
      console.error("Erro ao encerrar pacote:", error);
    }
  }
}

async function atualizarStatusDoAgendamento(agendamentoId, status) {
  const { error } = await supabaseClient
    .from("agendamentos")
    .update({
      status: status,
      atualizado_em: new Date().toISOString()
    })
    .eq("usuario_id", usuarioSessao.id)
    .eq("id", agendamentoId);

  if (error) {
    console.error("Erro ao atualizar agendamento:", error);
  }
}

function tratarHashtags(texto) {
  if (!texto) return [];

  return texto
    .split(" ")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .map((tag) => {
      if (tag.startsWith("#")) {
        return tag.toLowerCase();
      }

      return `#${tag.toLowerCase()}`;
    });
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

function escaparHTML(texto) {
  return String(texto || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}