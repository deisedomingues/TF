let usuarioSessao = null;
let atendimentosHoje = [];

document.addEventListener("DOMContentLoaded", async () => {
  usuarioSessao = await exigirLogin();

  if (!usuarioSessao) return;

  configurarBotaoSair();

  document.getElementById("data").value = formatarDataISO(new Date());

  await carregarPacientes();
  await carregarAtendimentosHoje();

  const pacienteIdUrl = pegarParametroUrl("paciente_id");
  const agendamentoIdUrl = pegarParametroUrl("agendamento_id");

  if (pacienteIdUrl) {
    document.getElementById("paciente").value = pacienteIdUrl;
  }

  if (agendamentoIdUrl) {
    await carregarAgendamentoPorId(agendamentoIdUrl);
  }

  document.getElementById("btnLimparAgendamento").addEventListener("click", limparSelecaoAgendamento);
  document.getElementById("formSessao").addEventListener("submit", salvarSessao);
});

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

async function carregarAtendimentosHoje() {
  const lista = document.getElementById("listaAtendimentosHoje");
  const tag = document.getElementById("tagAtendimentosHoje");
  const hoje = formatarDataISO(new Date());

  const { data, error } = await supabaseClient
    .from("agendamentos")
    .select("*, pacientes(nome)")
    .eq("usuario_id", usuarioSessao.id)
    .eq("data_sessao", hoje)
    .eq("status", "Agendada")
    .order("hora_inicio", { ascending: true });

  if (error) {
    console.error(error);
    lista.innerHTML = `
      <article class="item-lista">
        <div>
          <h3>Erro ao carregar atendimentos</h3>
          <p>Não foi possível buscar os agendamentos de hoje.</p>
        </div>
      </article>
    `;
    return;
  }

  atendimentosHoje = data || [];

  tag.textContent = `${atendimentosHoje.length} ${atendimentosHoje.length === 1 ? "atendimento" : "atendimentos"}`;

  if (atendimentosHoje.length === 0) {
    lista.innerHTML = `
      <article class="item-lista">
        <div>
          <h3>Nenhum atendimento pendente hoje</h3>
          <p>Todos os atendimentos agendados para hoje já foram registrados ou não há agenda cadastrada.</p>
        </div>
      </article>
    `;
    return;
  }

  lista.innerHTML = atendimentosHoje.map(criarCardAtendimentoHoje).join("");
}

function criarCardAtendimentoHoje(item) {
  return `
    <article class="item-lista">
      <div>
        <h3>${escaparHTML(item.pacientes?.nome || "Paciente")}</h3>
        <p>
          <strong>${escaparHTML(item.hora_inicio?.slice(0, 5) || "--")}</strong>
          às
          <strong>${escaparHTML(item.hora_fim?.slice(0, 5) || "--")}</strong>
          — ${escaparHTML(item.modalidade || "--")}
        </p>

        <div class="tags">
          <span class="tag">Pendente de registro</span>
          ${item.recorrencia !== "nao" ? `<span class="tag">Recorrente</span>` : ""}
          ${item.valor_sessao ? `<span class="tag">${formatarMoeda(item.valor_sessao)}</span>` : ""}
        </div>
      </div>

      <div>
        <button type="button" class="btn btn-secundario" onclick="selecionarAtendimentoHoje(${item.id})">
          Registrar sessão
        </button>
      </div>
    </article>
  `;
}

function selecionarAtendimentoHoje(id) {
  const atendimento = atendimentosHoje.find((item) => Number(item.id) === Number(id));

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
    return;
  }

  if (!data) return;

  if (data.status !== "Agendada") {
    alert("Esse atendimento já foi registrado anteriormente.");
    return;
  }

  preencherFormularioComAgendamento(data);
}

function preencherFormularioComAgendamento(agendamento) {
  document.getElementById("agendamentoId").value = agendamento.id;
  document.getElementById("paciente").value = agendamento.paciente_id;
  document.getElementById("data").value = agendamento.data_sessao;
  document.getElementById("inicio").value = agendamento.hora_inicio?.slice(0, 5) || "";
  document.getElementById("fim").value = agendamento.hora_fim?.slice(0, 5) || "";
  document.getElementById("modalidade").value = agendamento.modalidade || "Presencial";

  document.getElementById("status").value = "Realizada";

  document.getElementById("textoModoFormulario").textContent =
    `Você está registrando um atendimento da agenda. Os dados principais ficaram bloqueados, mas o status pode ser alterado.`;

  document.getElementById("btnLimparAgendamento").style.display = "inline-flex";

  bloquearCamposDoAgendamento(true);

  document.getElementById("anotacoes").focus();
}

function bloquearCamposDoAgendamento(bloquear) {
  document.getElementById("paciente").disabled = bloquear;
  document.getElementById("data").readOnly = bloquear;
  document.getElementById("inicio").readOnly = bloquear;
  document.getElementById("fim").readOnly = bloquear;
  document.getElementById("modalidade").disabled = bloquear;

  // O status continua editável de propósito.
  document.getElementById("status").disabled = false;
}

function limparSelecaoAgendamento() {
  document.getElementById("agendamentoId").value = "";
  document.getElementById("formSessao").reset();
  document.getElementById("data").value = formatarDataISO(new Date());

  document.getElementById("textoModoFormulario").textContent =
    "Preencha manualmente ou selecione um atendimento de hoje acima.";

  document.getElementById("btnLimparAgendamento").style.display = "none";

  bloquearCamposDoAgendamento(false);
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

  mensagem.textContent = "";

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

  btnSalvar.disabled = true;
  btnSalvar.textContent = "Salvando...";

  if (agendamentoId) {
    const { data: agendamentoExistente, error: erroBusca } = await supabaseClient
      .from("agendamentos")
      .select("status")
      .eq("usuario_id", usuarioSessao.id)
      .eq("id", agendamentoId)
      .maybeSingle();

    if (erroBusca) {
      console.error(erroBusca);
      btnSalvar.disabled = false;
      btnSalvar.textContent = "Salvar sessão";
      mensagem.textContent = "Erro ao conferir o agendamento.";
      return;
    }

    if (!agendamentoExistente || agendamentoExistente.status !== "Agendada") {
      btnSalvar.disabled = false;
      btnSalvar.textContent = "Salvar sessão";
      mensagem.textContent = "Esse atendimento já foi registrado anteriormente.";
      await carregarAtendimentosHoje();
      return;
    }
  }

  const { error } = await supabaseClient
    .from("sessoes")
    .insert({
      usuario_id: usuarioSessao.id,
      paciente_id: Number(pacienteId),
      data_sessao: dataSessao,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      modalidade: modalidade,
      status: status,
      anotacoes: anotacoes || null,
      hashtags: hashtags
    });

  if (error) {
    console.error(error);
    btnSalvar.disabled = false;
    btnSalvar.textContent = "Salvar sessão";
    mensagem.textContent = "Erro ao salvar sessão.";
    return;
  }

  if (agendamentoId) {
    await atualizarStatusDoAgendamento(agendamentoId, status);
  }

  btnSalvar.disabled = false;
  btnSalvar.textContent = "Salvar sessão";

  mensagem.textContent = "Sessão salva com sucesso!";

  setTimeout(async () => {
    limparSelecaoAgendamento();
    mensagem.textContent = "";
    await carregarAtendimentosHoje();
  }, 1200);
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