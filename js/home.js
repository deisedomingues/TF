document.addEventListener("DOMContentLoaded", async () => {
  const usuario = await exigirLogin();

  if (!usuario) {
    return;
  }

  configurarBotaoSair();

  await garantirConfiguracaoInicial(usuario);
  await carregarConfiguracoesHome(usuario.id);
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