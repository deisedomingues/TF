let usuarioPacotes = null;
let pacotesCarregados = [];
let filtroPacotes = "ativos";
let buscaPacientePacote = "";

document.addEventListener("DOMContentLoaded", async () => {
  usuarioPacotes = await exigirLogin();

  if (!usuarioPacotes) return;

  configurarBotaoSair();

  document.getElementById("dataPagamento").value = formatarDataISO(new Date());

  configurarFormularioPacote();
  configurarBuscaPacote();

  await carregarPacientes();
  await carregarPacotes();
});

function configurarFormularioPacote() {
  const btnAlternar = document.getElementById("btnAlternarFormularioPacote");
  const areaFormulario = document.getElementById("areaFormularioPacote");
  const formPacote = document.getElementById("formPacote");

  btnAlternar.addEventListener("click", () => {
    const aberto = areaFormulario.style.display !== "none";

    areaFormulario.style.display = aberto ? "none" : "block";
    btnAlternar.textContent = aberto ? "Abrir formulário" : "Recolher formulário";
  });

  formPacote.addEventListener("submit", salvarPacote);

  document.getElementById("valorPago").addEventListener("input", calcularQuantidadePorValor);
  document.getElementById("valorPorSessao").addEventListener("input", calcularQuantidadePorValor);
}

function configurarBuscaPacote() {
  const campoBusca = document.getElementById("buscaPacientePacote");

  campoBusca.addEventListener("input", () => {
    buscaPacientePacote = campoBusca.value.trim().toLowerCase();
    mostrarPacotes();
  });
}

function calcularQuantidadePorValor() {
  const valorPago = Number(document.getElementById("valorPago").value || 0);
  const valorPorSessao = Number(document.getElementById("valorPorSessao").value || 0);
  const campoQuantidade = document.getElementById("quantidadeSessoes");

  if (valorPago > 0 && valorPorSessao > 0) {
    const quantidade = Math.floor(valorPago / valorPorSessao);

    if (quantidade > 0) {
      campoQuantidade.value = quantidade;
    }
  }
}

async function carregarPacientes() {
  const selectPaciente = document.getElementById("paciente");

  const { data, error } = await supabaseClient
    .from("pacientes")
    .select("id, nome, status")
    .eq("usuario_id", usuarioPacotes.id)
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

async function salvarPacote(event) {
  event.preventDefault();

  const mensagem = document.getElementById("mensagemPacote");
  const btnSalvar = document.getElementById("btnSalvarPacote");

  const pacienteId = document.getElementById("paciente").value;
  const descricao = document.getElementById("descricao").value.trim();
  const valorPago = Number(document.getElementById("valorPago").value || 0);
  const valorPorSessao = Number(document.getElementById("valorPorSessao").value || 0);
  const quantidadeSessoes = Number(document.getElementById("quantidadeSessoes").value || 0);
  const dataPagamento = document.getElementById("dataPagamento").value;
  const formaPagamento = document.getElementById("formaPagamento").value;

  mensagem.textContent = "";

  if (!pacienteId) {
    mensagem.textContent = "Selecione o paciente.";
    return;
  }

  if (valorPago <= 0) {
    mensagem.textContent = "Informe o valor pago.";
    return;
  }

  if (valorPorSessao <= 0) {
    mensagem.textContent = "Informe o valor por sessão.";
    return;
  }

  if (quantidadeSessoes <= 0) {
    mensagem.textContent = "Informe a quantidade de sessões.";
    return;
  }

  btnSalvar.disabled = true;
  btnSalvar.textContent = "Salvando...";

  const { error } = await supabaseClient
    .from("pacote_sessoes")
    .insert({
      usuario_id: usuarioPacotes.id,
      paciente_id: Number(pacienteId),
      descricao: descricao || `Pacote de ${quantidadeSessoes} sessões`,
      valor_pago: valorPago,
      valor_por_sessao: valorPorSessao,
      quantidade_sessoes: quantidadeSessoes,
      data_pagamento: dataPagamento || null,
      forma_pagamento: formaPagamento || null,
      status: "Ativo"
    });

  btnSalvar.disabled = false;
  btnSalvar.textContent = "Salvar pacote";

  if (error) {
    console.error(error);
    mensagem.textContent = "Erro ao salvar pacote.";
    return;
  }

  mensagem.textContent = "Pacote salvo com sucesso!";

  document.getElementById("formPacote").reset();
  document.getElementById("dataPagamento").value = formatarDataISO(new Date());

  await carregarPacotes();

  setTimeout(() => {
    mensagem.textContent = "";
    document.getElementById("areaFormularioPacote").style.display = "none";
    document.getElementById("btnAlternarFormularioPacote").textContent = "Abrir formulário";
  }, 1000);
}

async function carregarPacotes() {
  const { data, error } = await supabaseClient
    .from("pacote_sessoes")
    .select("*, pacientes(nome)")
    .eq("usuario_id", usuarioPacotes.id)
    .order("criado_em", { ascending: false });

  if (error) {
    console.error(error);
    document.getElementById("listaPacotes").innerHTML = `
      <article class="item-lista">
        <div>
          <h3>Erro ao carregar pacotes</h3>
          <p>Não foi possível buscar os pacotes cadastrados.</p>
        </div>
      </article>
    `;
    return;
  }

  const pacotes = data || [];
  const idsPacotes = pacotes.map((pacote) => pacote.id);

  let sessoesUsadasPorPacote = {};

  if (idsPacotes.length > 0) {
    const { data: sessoes, error: erroSessoes } = await supabaseClient
      .from("sessoes")
      .select("pacote_id")
      .eq("usuario_id", usuarioPacotes.id)
      .in("pacote_id", idsPacotes);

    if (erroSessoes) {
      console.error("Erro ao contar sessões usadas:", erroSessoes);
    }

    (sessoes || []).forEach((sessao) => {
      const pacoteId = Number(sessao.pacote_id);

      if (!Number.isNaN(pacoteId)) {
        sessoesUsadasPorPacote[pacoteId] = (sessoesUsadasPorPacote[pacoteId] || 0) + 1;
      }
    });
  }

  pacotesCarregados = pacotes.map((pacote) => {
    const usadas = sessoesUsadasPorPacote[Number(pacote.id)] || 0;
    const total = Number(pacote.quantidade_sessoes || 0);
    const restantes = Math.max(total - usadas, 0);

    return {
      ...pacote,
      sessoes_usadas: usadas,
      sessoes_restantes: restantes
    };
  });

  mostrarPacotes();
}

function mostrarPacotes() {
  const lista = document.getElementById("listaPacotes");

  let pacotes = [...pacotesCarregados];

  if (filtroPacotes === "ativos") {
    pacotes = pacotes.filter((pacote) => pacote.status === "Ativo");
  } else if (filtroPacotes === "encerrados") {
    pacotes = pacotes.filter((pacote) => pacote.status === "Encerrado");
  }

  if (buscaPacientePacote) {
    pacotes = pacotes.filter((pacote) => {
      const nomePaciente = String(pacote.pacientes?.nome || "").toLowerCase();
      return nomePaciente.includes(buscaPacientePacote);
    });
  }

  if (pacotes.length === 0) {
    lista.innerHTML = `
      <article class="item-lista">
        <div>
          <h3>Nenhum pacote encontrado</h3>
          <p>Cadastre um pacote ou altere os filtros.</p>
        </div>
      </article>
    `;
    return;
  }

  lista.innerHTML = pacotes.map(criarCardPacote).join("");
}

function criarCardPacote(pacote) {
  const usadas = Number(pacote.sessoes_usadas || 0);
  const total = Number(pacote.quantidade_sessoes || 0);
  const restantes = Number(pacote.sessoes_restantes || 0);

  const percentual = total > 0 ? Math.min((usadas / total) * 100, 100) : 0;
  const aviso = criarAvisoPacote(pacote);

  return `
    <article class="item-lista">
      <div style="width: 100%;">
        <h3>${escaparHTML(pacote.pacientes?.nome || "Paciente")}</h3>

        <p>
          <strong>${escaparHTML(pacote.descricao || "Pacote de sessões")}</strong>
        </p>

        <p>
          ${formatarMoeda(pacote.valor_pago)} pagos —
          ${formatarMoeda(pacote.valor_por_sessao)} por sessão
        </p>

        <p>
          Sessões usadas: <strong>${usadas}/${total}</strong> —
          Restantes: <strong>${restantes}</strong>
        </p>

        <div style="width: 100%; height: 10px; background: var(--fundo); border-radius: 999px; overflow: hidden; margin: 12px 0;">
          <div style="width: ${percentual}%; height: 100%; background: var(--cor-principal); border-radius: 999px;"></div>
        </div>

        <div class="tags">
          ${criarTagStatusPacote(pacote.status)}
          ${pacote.forma_pagamento ? `<span class="tag">${escaparHTML(pacote.forma_pagamento)}</span>` : ""}
          ${pacote.data_pagamento ? `<span class="tag">Pago em ${formatarData(pacote.data_pagamento)}</span>` : ""}
        </div>

        ${aviso}

        <div style="margin-top: 12px; display: flex; gap: 10px; flex-wrap: wrap;">
          ${pacote.status === "Ativo" ? `
            <button type="button" class="btn btn-claro" onclick="encerrarPacote(${pacote.id})">
              Encerrar
            </button>
          ` : ""}
        </div>
      </div>
    </article>
  `;
}

function criarAvisoPacote(pacote) {
  const restantes = Number(pacote.sessoes_restantes || 0);

  if (pacote.status !== "Ativo") {
    return "";
  }

  if (restantes <= 0) {
    return `
      <p style="margin-top: 10px; color: #8A2D2D; font-weight: bold;">
        Pacote esgotado. Renovação necessária.
      </p>
    `;
  }

  if (restantes === 1) {
    return `
      <p style="margin-top: 10px; color: #8A5A00; font-weight: bold;">
        Atenção: resta apenas 1 sessão neste pacote.
      </p>
    `;
  }

  return "";
}

function criarTagStatusPacote(status) {
  if (status === "Ativo") {
    return `
      <span class="tag" style="background: #E9F9EF; color: #246B3A; border: 1px solid #BDECCB;">
        Ativo
      </span>
    `;
  }

  if (status === "Encerrado") {
    return `
      <span class="tag" style="background: #F4F4F6; color: #555; border: 1px solid #DDD;">
        Encerrado
      </span>
    `;
  }

  return `<span class="tag">${escaparHTML(status || "--")}</span>`;
}

async function encerrarPacote(id) {
  const confirmar = confirm("Deseja encerrar este pacote?");

  if (!confirmar) return;

  const { error } = await supabaseClient
    .from("pacote_sessoes")
    .update({
      status: "Encerrado",
      atualizado_em: new Date().toISOString()
    })
    .eq("usuario_id", usuarioPacotes.id)
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("Erro ao encerrar pacote.");
    return;
  }

  await carregarPacotes();
}

function alterarFiltroPacotes(filtro) {
  filtroPacotes = filtro;
  mostrarPacotes();
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