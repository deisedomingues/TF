let usuarioFinanceiro = null;
let sessoesFinanceiro = [];
let buscaPacienteFinanceiro = "";

document.addEventListener("DOMContentLoaded", async () => {
  usuarioFinanceiro = await exigirLogin();

  if (!usuarioFinanceiro) return;

  if (typeof configurarBotaoSair === "function") {
    configurarBotaoSair();
  }

  configurarFiltrosFinanceiro();
  definirPeriodoMesAtual();

  await carregarFinanceiro();
});

function configurarFiltrosFinanceiro() {
  document.getElementById("btnAplicarFiltros").addEventListener("click", carregarFinanceiro);

  document.getElementById("filtroStatusPagamento").addEventListener("change", mostrarFinanceiro);

  document.getElementById("buscaPacienteFinanceiro").addEventListener("input", () => {
    buscaPacienteFinanceiro = document
      .getElementById("buscaPacienteFinanceiro")
      .value
      .trim()
      .toLowerCase();

    mostrarFinanceiro();
  });
}

function definirPeriodoMesAtual() {
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  document.getElementById("dataInicio").value = formatarDataISO(primeiroDia);
  document.getElementById("dataFim").value = formatarDataISO(ultimoDia);
}

async function carregarFinanceiro() {
  const dataInicio = document.getElementById("dataInicio").value;
  const dataFim = document.getElementById("dataFim").value;
  const lista = document.getElementById("listaFinanceiro");

  lista.innerHTML = `
    <article class="item-lista">
      <div>
        <h3>Carregando...</h3>
        <p>Buscando registros financeiros.</p>
      </div>
    </article>
  `;

  let query = supabaseClient
    .from("sessoes")
    .select("*, pacientes(nome)")
    .eq("usuario_id", usuarioFinanceiro.id)
    .order("data_sessao", { ascending: false });

  if (dataInicio) {
    query = query.gte("data_sessao", dataInicio);
  }

  if (dataFim) {
    query = query.lte("data_sessao", dataFim);
  }

  const { data, error } = await query;

  if (error) {
    console.error(error);

    lista.innerHTML = `
      <article class="item-lista">
        <div>
          <h3>Erro ao carregar financeiro</h3>
          <p>Não foi possível buscar as sessões registradas.</p>
        </div>
      </article>
    `;

    return;
  }

  sessoesFinanceiro = data || [];

  atualizarIndicadoresFinanceiros();
  mostrarFinanceiro();
}

function atualizarIndicadoresFinanceiros() {
  const sessoesPagas = sessoesFinanceiro.filter((sessao) => {
    return sessao.pago === true && Number(sessao.valor_sessao || 0) > 0;
  });

  const sessoesPendentes = sessoesFinanceiro.filter((sessao) => {
    return sessao.pago !== true && Number(sessao.valor_sessao || 0) > 0;
  });

  const totalRecebido = somarValores(sessoesPagas);
  const totalPendente = somarValores(sessoesPendentes);
  const totalPrevisto = totalRecebido + totalPendente;

  document.getElementById("totalRecebidoMes").textContent = formatarMoeda(totalRecebido);
  document.getElementById("totalPendente").textContent = formatarMoeda(totalPendente);
  document.getElementById("totalPrevisto").textContent = formatarMoeda(totalPrevisto);
  document.getElementById("totalSessoesPagas").textContent = sessoesPagas.length;
  document.getElementById("totalSessoesPendentes").textContent = sessoesPendentes.length;
}

function mostrarFinanceiro() {
  const lista = document.getElementById("listaFinanceiro");
  const filtroStatus = document.getElementById("filtroStatusPagamento").value;

  let sessoes = [...sessoesFinanceiro];

  if (filtroStatus === "pagos") {
    sessoes = sessoes.filter((sessao) => sessao.pago === true);
  }

  if (filtroStatus === "pendentes") {
    sessoes = sessoes.filter((sessao) => {
      return sessao.pago !== true && Number(sessao.valor_sessao || 0) > 0;
    });
  }

  if (buscaPacienteFinanceiro) {
    sessoes = sessoes.filter((sessao) => {
      const nomePaciente = String(sessao.pacientes?.nome || "").toLowerCase();
      return nomePaciente.includes(buscaPacienteFinanceiro);
    });
  }

  if (sessoes.length === 0) {
    lista.innerHTML = `
      <article class="item-lista">
        <div>
          <h3>Nenhum registro encontrado</h3>
          <p>Altere os filtros ou registre sessões com dados financeiros.</p>
        </div>
      </article>
    `;

    return;
  }

  lista.innerHTML = sessoes.map(criarCardFinanceiro).join("");
}

function criarCardFinanceiro(sessao) {
  const valor = Number(sessao.valor_sessao || 0);
  const temValor = valor > 0;
  const pago = sessao.pago === true;

  return `
    <article class="item-lista">
      <div style="width: 100%;">
        <h3>${escaparHTML(sessao.pacientes?.nome || "Paciente")}</h3>

        <p>
          Sessão de <strong>${formatarData(sessao.data_sessao)}</strong>
          ${sessao.hora_inicio ? `— ${escaparHTML(sessao.hora_inicio.slice(0, 5))}` : ""}
        </p>

        <p>
          Valor: <strong>${temValor ? formatarMoeda(valor) : "Sem cobrança informada"}</strong>
        </p>

        <div class="tags">
          ${criarTagPagamento(sessao)}
          <span class="tag">${escaparHTML(sessao.status || "--")}</span>
          ${sessao.modalidade ? `<span class="tag">${escaparHTML(sessao.modalidade)}</span>` : ""}
          ${sessao.pacote_id ? `<span class="tag">Pacote</span>` : ""}
          ${sessao.forma_pagamento ? `<span class="tag">${escaparHTML(sessao.forma_pagamento)}</span>` : ""}
          ${sessao.data_pagamento ? `<span class="tag">Pago em ${formatarData(sessao.data_pagamento)}</span>` : ""}
        </div>

        ${sessao.observacao_financeira ? `
          <p class="subtitulo" style="margin-top: 8px;">
            ${escaparHTML(sessao.observacao_financeira)}
          </p>
        ` : ""}

        <div style="margin-top: 12px; display: flex; gap: 10px; flex-wrap: wrap;">
          ${!pago && temValor ? `
            <button type="button" class="btn btn-principal" onclick="marcarComoPago(${sessao.id})">
              Marcar como pago
            </button>
          ` : ""}

          ${pago ? `
            <button type="button" class="btn btn-claro" onclick="marcarComoPendente(${sessao.id})">
              Marcar como pendente
            </button>
          ` : ""}
        </div>
      </div>
    </article>
  `;
}

function criarTagPagamento(sessao) {
  const valor = Number(sessao.valor_sessao || 0);

  if (valor <= 0) {
    return `<span class="tag">Sem cobrança</span>`;
  }

  if (sessao.pago === true) {
    return `
      <span class="tag" style="background: #E9F9EF; color: #246B3A; border: 1px solid #BDECCB;">
        Pago
      </span>
    `;
  }

  return `
    <span class="tag" style="background: #FFF4E5; color: #8A5A00; border: 1px solid #F3D29A;">
      Pendente
    </span>
  `;
}

async function marcarComoPago(sessaoId) {
  const forma = prompt("Forma de pagamento: Pix, Dinheiro, Cartão, Transferência...");

  if (forma === null) return;

  const formaPagamento = forma.trim() || "Não informado";

  const { error } = await supabaseClient
    .from("sessoes")
    .update({
      pago: true,
      forma_pagamento: formaPagamento,
      data_pagamento: formatarDataISO(new Date()),
      atualizado_em: new Date().toISOString()
    })
    .eq("usuario_id", usuarioFinanceiro.id)
    .eq("id", sessaoId);

  if (error) {
    console.error(error);
    alert("Erro ao marcar como pago.");
    return;
  }

  await carregarFinanceiro();
}

async function marcarComoPendente(sessaoId) {
  const confirmar = confirm("Deseja marcar este pagamento como pendente?");

  if (!confirmar) return;

  const { error } = await supabaseClient
    .from("sessoes")
    .update({
      pago: false,
      forma_pagamento: null,
      data_pagamento: null,
      atualizado_em: new Date().toISOString()
    })
    .eq("usuario_id", usuarioFinanceiro.id)
    .eq("id", sessaoId);

  if (error) {
    console.error(error);
    alert("Erro ao marcar como pendente.");
    return;
  }

  await carregarFinanceiro();
}

function somarValores(lista) {
  return lista.reduce((total, item) => {
    return total + Number(item.valor_sessao || 0);
  }, 0);
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