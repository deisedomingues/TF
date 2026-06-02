document.addEventListener("DOMContentLoaded", async () => {
  await carregarSitePublico();
});

async function carregarSitePublico() {
  const { data, error } = await supabaseClient
    .from("site_publico_config")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Erro ao carregar site público:", error);
    return;
  }

  if (!data) {
    return;
  }

  preencherTexto("siteNomeProfissional", data.nome_profissional);
  preencherTexto("siteNomeHero", data.nome_profissional);
  preencherTexto("siteSubtitulo", data.subtitulo);
  preencherTexto("siteChamadaPrincipal", data.chamada_principal);

  preencherTexto("siteSobre1", data.texto_sobre_1);
  preencherTexto("siteSobre2", data.texto_sobre_2);
  preencherTexto("siteSobre3", data.texto_sobre_3);
  preencherTexto("siteTextoConfiar", data.texto_confiar);

  preencherImagem("siteFotoPerfil", data.foto_perfil_url);
  preencherImagem("siteFotoSobre", data.foto_perfil_url);
  preencherImagem("siteFotoLivro", data.foto_livro_url);
  preencherImagem("siteFotoFamilia", data.foto_familia_url);

  preencherImagem("siteCapaPsicologia", data.capa_psicologia_url);
  preencherImagem("siteCapaChecklist", data.capa_checklist_url);
  preencherImagem("siteCapaDesmame", data.capa_desmame_url);

  preencherLink("siteLinkLivroPerinatal", data.link_livro_perinatal);
  preencherLink("siteLinkChecklist", data.link_checklist);
  preencherLink("siteLinkDesmame", data.link_desmame);

  preencherLink("siteInstagram", data.instagram);

  const mensagemWhatsapp = encodeURIComponent(
    "Olá, vim pelo site e gostaria de receber informações sobre os atendimentos."
  );

  const telefone = limparTelefone(data.whatsapp || "5511961869338");

  preencherLink(
    "siteWhatsapp",
    `https://wa.me/${telefone}?text=${mensagemWhatsapp}`
  );

  preencherTexto("siteRodapeNome", `© 2026 • ${data.nome_profissional || "Tatiely Flávio"} Psicologia`);
  preencherTexto("siteRodapeSite", data.site ? data.site.replace("https://", "").replace("http://", "") : "www.tatielypsi.com");
}

function preencherTexto(id, valor) {
  const elemento = document.getElementById(id);

  if (!elemento || !valor) {
    return;
  }

  elemento.textContent = valor;
}

function preencherImagem(id, url) {
  const imagem = document.getElementById(id);

  if (!imagem || !url) {
    return;
  }

  imagem.src = url;
}

function preencherLink(id, url) {
  const link = document.getElementById(id);

  if (!link || !url) {
    return;
  }

  link.href = url;
}

function limparTelefone(valor) {
  return String(valor || "").replace(/\D/g, "");
}