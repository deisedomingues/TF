let usuarioResumo = null;
let pacientesResumo = [];
let sessoesResumo = [];
let agendamentosResumo = [];
let pacotesResumo = [];
let buscaPacienteAtual = "";

document.addEventListener("DOMContentLoaded", async () => {
  usuarioResumo = await exigirLogin();

  if (!usuarioResumo) return;

  configurarBotaoSair();
  definirPeriodoMesAtual();
  configurarEventos();

  await carregarResumo();
});

function configurarEventos() {
  document.getElementById("btnAplicarFiltros").addEventListener("click", carregarResumo);

  document.getElementById("buscaPaciente").addEventListener("input", () => {
    buscaPacienteAtual = document.getElementById("buscaPaciente").value.trim().toLowerCase();
    mostrarBuscaPacientes();
  });
}

function definirPeriodoMesAtual() {
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  document.getElementById("dataInicio").value = formatarDataISO(primeiroDia);
  document.getElementById("dataFim").value = formatarDataISO(ultimoDia);
}

async function carregarResumo() {
  await Promise.all([
    carregarPacientes(),
    carregarSessoes(),
    carregarAgendamentos(),
    carregarPacotes()
  ]);

  atualizarIndicadoresPacientes();
  atualizarIndicadoresSessoes();
  atualizarIndicadoresFinanceiros();
  atualizarIndicadoresAgenda();
  atualizarIndicadoresPacotes();
  atualizarModalidades();
  mostrarBuscaPacientes();
  mostrarAniversariantesMes();
  mostrarAlertas();
}

async function carregarPacientes() {
  const { data, error } = await supabaseClient
    .from("pacientes")
    .select("*")
    .eq("usuario_id", usuarioResumo.id)
    .order("nome", { ascending: true });

  if (error) {
    console.error("Erro ao carregar pacientes:", error);
    pacientesResumo = [];
    return;
  }

  pacientesResumo = data || [];
}

async function carregarSessoes() {
  const dataInicio = document.getElementById("dataInicio").value;
  const dataFim = document.getElementById("dataFim").value;

  let query = supabaseClient
    .from("sessoes")
    .select("*, pacientes(nome)")
    .eq("usuario_id", usuarioResumo.id)
    .order("data_sessao", { ascending: false });

  if (dataInicio) query = query.gte("data_sessao", dataInicio);
  if (dataFim) query = query.lte("data_sessao", dataFim);

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao carregar sessões:", error);
    sessoesResumo = [];
    return;
  }

  sessoesResumo = data || [];
}

async function carregarAgendamentos() {
  const hoje = formatarDataISO(new Date());

  const { data, error } = await supabaseClient
    .from("agendamentos")
    .select("*, pacientes(nome)")
    .eq("usuario_id", usuarioResumo.id)
    .gte("data_sessao", hoje)
    .order("data_sessao", { ascending: true });

  if (error) {
    console.error("Erro ao carregar agendamentos:", error);
    agendamentosResumo = [];
    return;
  }

  agendamentosResumo = data || [];
}

async function carregarPacotes() {
  const { data, error } = await supabaseClient
    .from("pacote_sessoes")
    .select("*, pacientes(nome)")
    .eq("usuario_id", usuarioResumo.id)
    .order("criado_em", { ascending: false });

  if (error) {
    console.error("Erro ao carregar pacotes:", error);
    pacotesResumo = [];
    return;
  }

  const pacotes = data || [];
  const idsPacotes = pacotes.map((pacote) => pacote.id);

  let sessoesPorPacote = {};

  if (idsPacotes.length > 0) {
    const { data: sessoes, error: erroSessoes } = await supabaseClient
      .from("sessoes")
      .select("pacote_id")
      .eq("usuario_id", usuarioResumo.id)
      .in("pacote_id", idsPacotes);

    if (erroSessoes) console.error("Erro ao contar sessões por pacote:", erroSessoes);

    (sessoes || []).forEach((sessao) => {
      const id = Number(sessao.pacote_id);

      if (!Number.isNaN(id)) {
        sessoesPorPacote[id] = (sessoesPorPacote[id] || 0) + 1;
      }
    });
  }

  pacotesResumo = pacotes.map((pacote) => {
    const usadas = sessoesPorPacote[Number(pacote.id)] || 0;
    const total = Number(pacote.quantidade_sessoes || 0);
    const restantes = Math.max(total - usadas, 0);

    return {
      ...pacote,
      sessoes_usadas: usadas,
      sessoes_restantes: restantes
    };
  });
}

function atualizarIndicadoresPacientes() {
  const dataInicio = document.getElementById("dataInicio").value;
  const dataFim = document.getElementById("dataFim").value;

  const ativos = pacientesResumo.filter((paciente) => normalizarTexto(paciente.status) === "ativo");
  const inativos = pacientesResumo.filter((paciente) => normalizarTexto(paciente.status) !== "ativo");

  const novosNoPeriodo = pacientesResumo.filter((paciente) => {
    const dataCadastro = extrairDataISO(paciente.criado_em || paciente.created_at || paciente.data_cadastro);

    if (!dataCadastro) return false;
    if (dataInicio && dataCadastro < dataInicio) return false;
    if (dataFim && dataCadastro > dataFim) return false;

    return true;
  });

  document.getElementById("totalPacientes").textContent = pacientesResumo.length;
  document.getElementById("totalPacientesAtivos").textContent = ativos.length;
  document.getElementById("totalPacientesInativos").textContent = inativos.length;
  document.getElementById("totalNovosPacientes").textContent = novosNoPeriodo.length;
}

function atualizarIndicadoresSessoes() {
  const realizadas = sessoesResumo.filter((sessao) => normalizarTexto(sessao.status) === "realizada");
  const faltas = sessoesResumo.filter((sessao) => normalizarTexto(sessao.status) === "falta");

  const canceladasRemarcadas = sessoesResumo.filter((sessao) => {
    const status = normalizarTexto(sessao.status);
    return status.includes("cancelada") || status === "remarcada";
  });

  document.getElementById("totalSessoes").textContent = sessoesResumo.length;
  document.getElementById("totalRealizadas").textContent = realizadas.length;
  document.getElementById("totalFaltas").textContent = faltas.length;
  document.getElementById("totalCanceladasRemarcadas").textContent = canceladasRemarcadas.length;
}

function atualizarIndicadoresFinanceiros() {
  const recebidas = sessoesResumo.filter((sessao) => sessao.pago === true);

  const pendentes = sessoesResumo.filter((sessao) => {
    return sessao.pago !== true && Number(sessao.valor_sessao || 0) > 0;
  });

  const totalRecebido = somarValores(recebidas);
  const totalPendente = somarValores(pendentes);

  const sessoesComValor = sessoesResumo.filter((sessao) => Number(sessao.valor_sessao || 0) > 0);
  const ticket = sessoesComValor.length > 0
    ? somarValores(sessoesComValor) / sessoesComValor.length
    : 0;

  document.getElementById("totalRecebido").textContent = formatarMoeda(totalRecebido);
  document.getElementById("totalPendente").textContent = formatarMoeda(totalPendente);
  document.getElementById("totalPagas").textContent = recebidas.length;
  document.getElementById("ticketMedio").textContent = formatarMoeda(ticket);
}

function atualizarIndicadoresAgenda() {
  const hoje = formatarDataISO(new Date());

  const agendaHoje = agendamentosResumo.filter((agendamento) => agendamento.data_sessao === hoje);

  const pendentesRegistro = agendamentosResumo.filter((agendamento) => {
    return agendamento.data_sessao <= hoje && normalizarTexto(agendamento.status) === "agendada";
  });

  document.getElementById("totalAgendaHoje").textContent = agendaHoje.length;
  document.getElementById("totalPendentesRegistro").textContent = pendentesRegistro.length;
}

function atualizarIndicadoresPacotes() {
  const ativos = pacotesResumo.filter((pacote) => pacote.status === "Ativo");

  const paraRenovar = ativos.filter((pacote) => {
    return Number(pacote.sessoes_restantes || 0) <= 1;
  });

  document.getElementById("totalPacotesAtivos").textContent = ativos.length;
  document.getElementById("totalPacotesRenovar").textContent = paraRenovar.length;
}

function atualizarModalidades() {
  const online = sessoesResumo.filter((sessao) => normalizarTexto(sessao.modalidade) === "online");
  const presencial = sessoesResumo.filter((sessao) => normalizarTexto(sessao.modalidade) === "presencial");
  const hibrida = sessoesResumo.filter((sessao) => {
    const modalidade = normalizarTexto(sessao.modalidade);
    return modalidade === "hibrida";
  });

  document.getElementById("totalOnline").textContent = online.length;
  document.getElementById("totalPresencial").textContent = presencial.length;
  document.getElementById("totalHibrida").textContent = hibrida.length;
}

function mostrarBuscaPacientes() {
  const lista = document.getElementById("listaBuscaPacientes");

  if (!buscaPacienteAtual) {
    lista.innerHTML = `
      <article class="item-lista">
        <div>
          <h3>Busque pelo nome</h3>
          <p>Digite acima para localizar um paciente.</p>
        </div>
      </article>
    `;
    return;
  }

  const pacientesEncontrados = pacientesResumo
    .filter((paciente) => String(paciente.nome || "").toLowerCase().includes(buscaPacienteAtual))
    .slice(0, 8);

  if (pacientesEncontrados.length === 0) {
    lista.innerHTML = `
      <article class="item-lista">
        <div>
          <h3>Nenhum paciente encontrado</h3>
          <p>Confira o nome digitado.</p>
        </div>
      </article>
    `;
    return;
  }

  lista.innerHTML = pacientesEncontrados.map(criarCardPacienteBusca).join("");
}

function criarCardPacienteBusca(paciente) {
  return `
    <article class="item-lista">
      <div>
        <h3>${escaparHTML(paciente.nome || "Paciente")}</h3>
        <p>Status: ${escaparHTML(paciente.status || "--")}</p>
      </div>

      <a href="paciente-detalhes.html?id=${paciente.id}" class="btn btn-claro">
        Ver detalhes
      </a>
    </article>
  `;
}

function mostrarAniversariantesMes() {
  const lista = document.getElementById("listaAniversariantesMes");

  if (!lista) return;

  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;

  const aniversariantes = pacientesResumo
    .filter((paciente) => {
      const nascimento = pegarDataNascimentoPaciente(paciente);

      if (!nascimento) return false;

      const partes = nascimento.split("-");
      if (partes.length < 3) return false;

      const mesNascimento = Number(partes[1]);

      return mesNascimento === mesAtual;
    })
    .sort((a, b) => {
      const diaA = Number(pegarDataNascimentoPaciente(a).split("-")[2]);
      const diaB = Number(pegarDataNascimentoPaciente(b).split("-")[2]);

      return diaA - diaB;
    });

  if (aniversariantes.length === 0) {
    lista.innerHTML = `
      <article class="item-lista">
        <div>
          <h3>Nenhum aniversariante</h3>
          <p>Não há pacientes aniversariando neste mês.</p>
        </div>
      </article>
    `;
    return;
  }

  lista.innerHTML = aniversariantes.map((paciente) => {
    const nascimento = pegarDataNascimentoPaciente(paciente);
    const [ano, mes, dia] = nascimento.split("-");

    return `
      <article class="item-lista">
        <div>
          <h3>${escaparHTML(paciente.nome || "Paciente")}</h3>
          <p>Aniversário em <strong>${dia}/${mes}</strong></p>
          <div class="tags">
            <span class="tag">${escaparHTML(paciente.status || "--")}</span>
          </div>
        </div>

        <a href="paciente-detalhes.html?id=${paciente.id}" class="btn btn-claro">
          Ver detalhes
        </a>
      </article>
    `;
  }).join("");
}

function pegarDataNascimentoPaciente(paciente) {
  return (
    paciente.data_nascimento ||
    paciente.nascimento ||
    paciente.data_aniversario ||
    paciente.aniversario ||
    null
  );
}

function mostrarAlertas() {
  const lista = document.getElementById("listaAlertas");
  const alertas = [];
  const hoje = formatarDataISO(new Date());

  const pendentesRegistro = agendamentosResumo.filter((agendamento) => {
    return agendamento.data_sessao <= hoje && normalizarTexto(agendamento.status) === "agendada";
  });

  if (pendentesRegistro.length > 0) {
    alertas.push({
      titulo: "Registros pendentes",
      texto: `${pendentesRegistro.length} atendimento(s) ainda precisam de registro.`,
      link: "registrar-sessao.html",
      botao: "Registrar sessões"
    });
  }

  const pagamentosPendentes = sessoesResumo.filter((sessao) => {
    return sessao.pago !== true && Number(sessao.valor_sessao || 0) > 0;
  });

  if (pagamentosPendentes.length > 0) {
    alertas.push({
      titulo: "Pagamentos pendentes",
      texto: `${pagamentosPendentes.length} sessão(ões) com pagamento em aberto.`,
      link: "financeiro.html",
      botao: "Ver financeiro"
    });
  }

  const pacotesRenovar = pacotesResumo.filter((pacote) => {
    return pacote.status === "Ativo" && Number(pacote.sessoes_restantes || 0) <= 1;
  });

  if (pacotesRenovar.length > 0) {
    alertas.push({
      titulo: "Pacotes perto do fim",
      texto: `${pacotesRenovar.length} pacote(s) precisam de atenção para renovação.`,
      link: "pacotes.html",
      botao: "Ver pacotes"
    });
  }

  if (alertas.length === 0) {
    lista.innerHTML = `
      <article class="item-lista">
        <div>
          <h3>Nenhum alerta importante</h3>
          <p>Não há pendências relevantes no momento.</p>
        </div>
      </article>
    `;
    return;
  }

  lista.innerHTML = alertas.map((alerta) => `
    <article class="item-lista">
      <div>
        <h3>${escaparHTML(alerta.titulo)}</h3>
        <p>${escaparHTML(alerta.texto)}</p>
      </div>

      <a href="${alerta.link}" class="btn btn-claro">
        ${escaparHTML(alerta.botao)}
      </a>
    </article>
  `).join("");
}

function somarValores(lista) {
  return lista.reduce((total, item) => {
    return total + Number(item.valor_sessao || 0);
  }, 0);
}

function extrairDataISO(valor) {
  if (!valor) return null;
  return String(valor).slice(0, 10);
}

function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
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