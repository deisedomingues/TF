let usuarioPacientes = null;
let pacientesCarregados = [];

document.addEventListener("DOMContentLoaded", async () => {
  usuarioPacientes = await exigirLogin();

  if (!usuarioPacientes) {
    return;
  }

  configurarBotaoSair();

  const formPaciente = document.getElementById("formPaciente");
  const buscaPaciente = document.getElementById("buscaPaciente");

  formPaciente.addEventListener("submit", salvarPaciente);

  buscaPaciente.addEventListener("input", () => {
    mostrarPacientes(buscaPaciente.value);
  });

  await carregarPacientes();
});

async function salvarPaciente(event) {
  event.preventDefault();

  const btnSalvar = document.getElementById("btnSalvarPaciente");
  const mensagem = document.getElementById("mensagemPaciente");

  const nome = document.getElementById("nome").value.trim();
  const nascimento = document.getElementById("nascimento").value || null;
  const telefone = document.getElementById("telefone").value.trim();
  const email = document.getElementById("email").value.trim();
  const contatoEmergenciaNome = document.getElementById("contatoEmergenciaNome").value.trim();
  const contatoEmergenciaTelefone = document.getElementById("contatoEmergenciaTelefone").value.trim();
  const contatoEmergenciaParentesco = document.getElementById("contatoEmergenciaParentesco").value.trim();
  const status = document.getElementById("status").value;
  const observacoes = document.getElementById("observacoes").value.trim();

  mensagem.textContent = "";

  if (!nome) {
    mensagem.textContent = "Informe o nome do paciente.";
    return;
  }

  btnSalvar.disabled = true;
  btnSalvar.textContent = "Salvando...";

  const { error } = await supabaseClient
    .from("pacientes")
    .insert({
      usuario_id: usuarioPacientes.id,
      nome: nome,
      data_nascimento: nascimento,
      telefone: telefone || null,
      email: email || null,
      contato_emergencia_nome: contatoEmergenciaNome || null,
      contato_emergencia_telefone: contatoEmergenciaTelefone || null,
      contato_emergencia_parentesco: contatoEmergenciaParentesco || null,
      status: status,
      observacoes_iniciais: observacoes || null,
      observacoes_gerais: observacoes || null
    });

  btnSalvar.disabled = false;
  btnSalvar.textContent = "Salvar paciente";

  if (error) {
    console.error(error);
    mensagem.textContent = "Erro ao salvar paciente.";
    return;
  }

  document.getElementById("formPaciente").reset();
  document.getElementById("status").value = "Ativo";

  mensagem.textContent = "Paciente salvo com sucesso!";

  await carregarPacientes();

  setTimeout(() => {
    mensagem.textContent = "";
  }, 3000);
}

async function carregarPacientes() {
  const lista = document.getElementById("listaPacientes");

  lista.innerHTML = `
    <article class="item-lista">
      <div>
        <h3>Carregando pacientes...</h3>
        <p>Aguarde um instante.</p>
      </div>
    </article>
  `;

  const { data, error } = await supabaseClient
    .from("pacientes")
    .select("*")
    .eq("usuario_id", usuarioPacientes.id)
    .order("nome", { ascending: true });

  if (error) {
    console.error(error);

    lista.innerHTML = `
      <article class="item-lista">
        <div>
          <h3>Erro ao carregar pacientes</h3>
          <p>Tente atualizar a página.</p>
        </div>
      </article>
    `;

    return;
  }

  pacientesCarregados = data || [];
  mostrarPacientes(document.getElementById("buscaPaciente").value);
}

function mostrarPacientes(termoBusca = "") {
  const lista = document.getElementById("listaPacientes");

  const termo = termoBusca.trim().toLowerCase();

  const pacientesFiltrados = pacientesCarregados.filter((paciente) => {
    const nome = (paciente.nome || "").toLowerCase();
    const telefone = (paciente.telefone || "").toLowerCase();
    const email = (paciente.email || "").toLowerCase();

    return (
      nome.includes(termo) ||
      telefone.includes(termo) ||
      email.includes(termo)
    );
  });

  if (pacientesFiltrados.length === 0) {
    lista.innerHTML = `
      <article class="item-lista">
        <div>
          <h3>Nenhum paciente encontrado</h3>
          <p>Cadastre um novo paciente ou altere a busca.</p>
        </div>
      </article>
    `;

    return;
  }

  lista.innerHTML = pacientesFiltrados
    .map((paciente) => criarCardPaciente(paciente))
    .join("");
}

function criarCardPaciente(paciente) {
  const telefone = paciente.telefone || "Telefone não informado";
  const email = paciente.email || "E-mail não informado";
  const status = paciente.status || "Ativo";

  return `
    <article class="item-lista">
      <div>
        <h3>${escaparHTML(paciente.nome)}</h3>
        <p>Telefone: ${escaparHTML(telefone)}</p>
        <p>E-mail: ${escaparHTML(email)}</p>
        <div class="tags">
          <span class="tag">${escaparHTML(status)}</span>
        </div>
      </div>

      <a href="paciente-detalhes.html?id=${paciente.id}" class="btn btn-secundario">
        Ver histórico
      </a>
    </article>
  `;
}

function escaparHTML(texto) {
  return String(texto || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}