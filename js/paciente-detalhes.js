let usuarioDetalhes = null;
let pacienteId = null;
let sessoesCarregadas = [];

document.addEventListener("DOMContentLoaded", async () => {
  usuarioDetalhes = await exigirLogin();

  if (!usuarioDetalhes) {
    return;
  }

  configurarBotaoSair();

  pacienteId = pegarParametroUrl("id");

  if (!pacienteId) {
    alert("Paciente não informado.");
    window.location.href = "pacientes.html";
    return;
  }

  configurarLinksPaciente();

  document.getElementById("buscaHistorico").addEventListener("input", () => {
    mostrarSessoes(document.getElementById("buscaHistorico").value);
  });

  await carregarPaciente();
  await carregarResumoPaciente();
  await carregarSessoesPaciente();
  await carregarFinanceiroPaciente();
});

function pegarParametroUrl(nome) {
  const params = new URLSearchParams(window.location.search);
  return params.get(nome);
}

function configurarLinksPaciente() {
  document.getElementById("linkRegistrarSessao").href = `registrar-sessao.html?paciente_id=${pacienteId}`;
  document.getElementById("linkNovaSessao").href = `registrar-sessao.html?paciente_id=${pacienteId}`;
  document.getElementById("linkNovoAgendamento").href = `agenda.html?paciente_id=${pacienteId}`;
  document.getElementById("linkFinanceiro").href = `financeiro.html?paciente_id=${pacienteId}`;

  document.getElementById("btnEditarPaciente").addEventListener("click", () => {
    alert("A edição do paciente será o próximo ajuste.");
  });
}

async function carregarPaciente() {
  const { data, error } = await supabaseClient
    .from("pacientes")
    .select("*")
    .eq("usuario_id", usuarioDetalhes.id)
    .eq("id", pacienteId)
    .maybeSingle();

  if (error) {
    console.error(error);
    alert("Erro ao carregar paciente.");
    return;
  }

  if (!data) {
    alert("Paciente não encontrado.");
    window.location.href = "pacientes.html";
    return;
  }

  document.getElementById("nomePacienteTitulo").textContent = data.nome || "Paciente";
  document.getElementById("infoNome").textContent = data.nome || "--";
  document.getElementById("infoNascimento").textContent = formatarData(data.data_nascimento);
  document.getElementById("infoTelefone").textContent = data.telefone || "--";
  document.getElementById("infoEmail").textContent = data.email || "--";
  document.getElementById("infoStatus").textContent = data.status || "--";

  const contato = montarContatoEmergencia(data);
  document.getElementById("infoContatoEmergencia").textContent = contato;

  document.getElementById("observacoesGerais").textContent =
    data.observacoes_gerais ||
    data.observacoes_iniciais ||
    "Nenhuma observação cadastrada.";
}

function montarContatoEmergencia(paciente) {
  if (!paciente.contato_emergencia_nome && !paciente.contato_emergencia_telefone) {
    return "--";
  }

  const partes = [];

  if (paciente.contato_emergencia_nome) {
    partes.push(paciente.contato_emergencia_nome);
  }

  if (paciente.contato_emergencia_parentesco) {
    partes.push(paciente.contato_emergencia_parentesco);
  }

  if (paciente.contato_emergencia_telefone) {
    partes.push(paciente.contato_emergencia_telefone);
  }

  return partes.join(" — ");
}

async function carregarResumoPaciente() {
  await Promise.all([
    carregarTotalSessoesRealizadas(),
    carregarTotalFaltas(),
    carregarProximaSessao()
  ]);
}

async function carregarTotalSessoesRealizadas() {
  const { count, error } = await supabaseClient
    .from("sessoes")
    .select("*", { count: "exact", head: true })
    .eq("usuario_id", usuarioDetalhes.id)
    .eq("paciente_id", pacienteId)
    .eq("status", "Realizada");

  if (error) {
    console.error(error);
    return;
  }

  document.getElementById("totalSessoesRealizadas").textContent = count || 0;
}

async function carregarTotalFaltas() {
  const { count, error } = await supabaseClient
    .from("agendamentos")
    .select("*", { count: "exact", head: true })
    .eq("usuario_id", usuarioDetalhes.id)
    .eq("paciente_id", pacienteId)
    .eq("status", "Falta");

  if (error) {
    console.error(error);
    return;
  }

  document.getElementById("totalFaltas").textContent = count || 0;
}

async function carregarProximaSessao() {
  const hoje = formatarDataISO(new Date());

  const { data, error } = await supabaseClient
    .from("agendamentos")
    .select("*")
    .eq("usuario_id", usuarioDetalhes.id)
    .eq("paciente_id", pacienteId)
    .gte("data_sessao", hoje)
    .in("status", ["Agendada", "Remarcada"])
    .order("data_sessao", { ascending: true })
    .order("hora_inicio", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(error);
    return;
  }

  if (!data) {
    document.getElementById("proximaSessao").textContent = "--";
    return;
  }

  const dataFormatada = formatarDataCurta(data.data_sessao);
  const hora = data.hora_inicio ? data.hora_inicio.slice(0, 5) : "";

  document.getElementById("proximaSessao").textContent = `${dataFormatada} ${hora}`;
}

async function carregarSessoesPaciente() {
  const lista = document.getElementById("listaSessoes");

  lista.innerHTML = `
    <article class="sessao-card">
      <h3>Carregando histórico...</h3>
      <p class="subtitulo">Aguarde um instante.</p>
    </article>
  `;

  const { data, error } = await supabaseClient
    .from("sessoes")
    .select("*")
    .eq("usuario_id", usuarioDetalhes.id)
    .eq("paciente_id", pacienteId)
    .order("data_sessao", { ascending: false });

  if (error) {
    console.error(error);

    lista.innerHTML = `
      <article class="sessao-card">
        <h3>Erro ao carregar histórico</h3>
        <p class="subtitulo">Tente atualizar a página.</p>
      </article>
    `;

    return;
  }

  sessoesCarregadas = data || [];

  mostrarSessoes("");
  mostrarHashtagsFrequentes();
}

function mostrarSessoes(termoBusca) {
  const lista = document.getElementById("listaSessoes");
  const termo = termoBusca.trim().toLowerCase();

  const filtradas = sessoesCarregadas.filter((sessao) => {
    const texto = [
      sessao.data_sessao,
      sessao.modalidade,
      sessao.status,
      sessao.anotacoes,
      ...(sessao.hashtags || [])
    ].join(" ").toLowerCase();

    return texto.includes(termo);
  });

  if (filtradas.length === 0) {
    lista.innerHTML = `
      <article class="sessao-card">
        <h3>Nenhuma sessão encontrada</h3>
        <p class="subtitulo">Ainda não há registros para este paciente ou a busca não encontrou resultados.</p>
      </article>
    `;
    return;
  }

  lista.innerHTML = filtradas.map((sessao) => criarCardSessao(sessao)).join("");
}

function criarCardSessao(sessao) {
  const data = formatarData(sessao.data_sessao);
  const modalidade = sessao.modalidade || "Modalidade não informada";
  const status = sessao.status || "Status não informado";
  const inicio = sessao.hora_inicio ? sessao.hora_inicio.slice(0, 5) : "--";
  const fim = sessao.hora_fim ? sessao.hora_fim.slice(0, 5) : "--";
  const anotacoes = sessao.anotacoes || "Nenhuma anotação registrada.";
  const hashtags = sessao.hashtags || [];

  return `
    <article class="sessao-card">
      <div class="sessao-topo">
        <div>
          <h3>${escaparHTML(data)} — Sessão ${escaparHTML(modalidade)}</h3>
          <p>${escaparHTML(inicio)} às ${escaparHTML(fim)}</p>
        </div>

        <span class="tag">${escaparHTML(status)}</span>
      </div>

      <p class="texto-sessao">
        ${escaparHTML(anotacoes)}
      </p>

      <div class="tags">
        ${
          hashtags.length > 0
            ? hashtags.map((tag) => `<span class="tag">${escaparHTML(tag)}</span>`).join("")
            : `<span class="tag">Sem hashtags</span>`
        }
      </div>
    </article>
  `;
}

function mostrarHashtagsFrequentes() {
  const container = document.getElementById("hashtagsFrequentes");
  const contagem = {};

  sessoesCarregadas.forEach((sessao) => {
    (sessao.hashtags || []).forEach((tag) => {
      const tagNormalizada = String(tag).trim();

      if (!tagNormalizada) {
        return;
      }

      contagem[tagNormalizada] = (contagem[tagNormalizada] || 0) + 1;
    });
  });

  const tagsOrdenadas = Object.entries(contagem)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  if (tagsOrdenadas.length === 0) {
    container.innerHTML = `<span class="tag">Nenhuma hashtag registrada</span>`;
    return;
  }

  container.innerHTML = tagsOrdenadas
    .map(([tag]) => `<span class="tag">${escaparHTML(tag)}</span>`)
    .join("");
}

async function carregarFinanceiroPaciente() {
  const { data, error } = await supabaseClient
    .from("financeiro")
    .select("*")
    .eq("usuario_id", usuarioDetalhes.id)
    .eq("paciente_id", pacienteId)
    .order("data_vencimento", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const registros = data || [];

  const pendentes = registros.filter((item) => {
    return item.status === "Pendente" || item.status === "Atrasado";
  });

  const totalPendente = pendentes.reduce((soma, item) => {
    return soma + Number(item.valor || 0);
  }, 0);

  document.getElementById("financeiroPendente").textContent = formatarMoeda(totalPendente);
  document.getElementById("totalPendenteLateral").textContent = formatarMoeda(totalPendente);

  if (totalPendente > 0) {
    document.getElementById("statusFinanceiro").textContent = "Com pendências";
  } else {
    document.getElementById("statusFinanceiro").textContent = "Sem pendências";
  }

  const ultimoPago = registros.find((item) => item.status === "Pago");

  if (ultimoPago) {
    document.getElementById("ultimoPagamento").textContent = formatarData(ultimoPago.data_pagamento || ultimoPago.data_vencimento);
  } else {
    document.getElementById("ultimoPagamento").textContent = "--";
  }
}

function formatarData(dataISO) {
  if (!dataISO) {
    return "--";
  }

  const partes = String(dataISO).split("-");

  if (partes.length !== 3) {
    return dataISO;
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarDataCurta(dataISO) {
  if (!dataISO) {
    return "--";
  }

  const partes = String(dataISO).split("-");

  if (partes.length !== 3) {
    return dataISO;
  }

  return `${partes[2]}/${partes[1]}`;
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