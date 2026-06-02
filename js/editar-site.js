let usuarioSite = null;
let configSite = null;

document.addEventListener("DOMContentLoaded", async () => {
  usuarioSite = await exigirLogin();

  if (!usuarioSite) {
    return;
  }

  configurarBotaoSair();

  await carregarConfiguracaoSite();

  document.getElementById("formEditarSite").addEventListener("submit", salvarConfiguracaoSite);
});

async function carregarConfiguracaoSite() {
  const { data, error } = await supabaseClient
    .from("site_publico_config")
    .select("*")
    .eq("usuario_id", usuarioSite.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    alert("Erro ao carregar configurações do site.");
    return;
  }

  if (!data) {
    await criarConfiguracaoInicial();
    return;
  }

  configSite = data;
  preencherFormulario(data);
}

async function criarConfiguracaoInicial() {
  const { data, error } = await supabaseClient
    .from("site_publico_config")
    .insert({
      usuario_id: usuarioSite.id,

      nome_profissional: "Tatiely Flávio",
      subtitulo: "Psicologia Perinatal, Parental e Bebês",
      chamada_principal: "Apoio psicológico para gestantes, mães, bebês e famílias, do desejo de engravidar aos desafios reais da maternidade e da parentalidade.",

      texto_sobre_1: "Mamãe do Lorenzo e do Josep, casada com o Juliano. Estamos juntos há 21 anos, sendo 10 anos de namoro. Uma história construída com amor, parceria e muitos aprendizados.",
      texto_sobre_2: "Além da família que me enche de amor e propósito, sou psicóloga especialista em Psicologia Perinatal e Parental, apaixonada por auxiliar famílias desde o desejo de engravidar até os desafios reais da maternidade e da paternidade.",
      texto_sobre_3: "Com anos de experiência clínica, curso na França e atuação como membro da Associação La Cause des Bébés, trago uma abordagem científica, sensível e acolhedora para ajudar você a viver uma maternidade mais leve, consciente e feliz.",
      texto_confiar: "Psicóloga há 13 anos, especialista em Psicologia Perinatal e Parental. A partir da minha experiência e estudos, decidi ajudar outras mulheres a terem uma maternidade mais leve e acolhedora.",

      whatsapp: "5511961869338",
      instagram: "https://www.instagram.com/tatielypsi/",
      site: "https://www.tatielypsi.com",

      foto_perfil_url: "css/images/tatiely-perfil.jpg",
      foto_livro_url: "css/images/tatiely-livro.jpg",
      foto_familia_url: "css/images/tatiely-familia.jpg",

      capa_psicologia_url: "css/images/capa-psicologiaperinatal.PNG",
      capa_checklist_url: "css/images/capa-checklistmaternidade.PNG",
      capa_desmame_url: "css/images/capa-desmamegentil.PNG",

      link_livro_perinatal: "https://hotmart.com/pt-br/marketplace/produtos/e-book-psicologia-perinatal-caminhos-do-planejar-conceber-gestar-e-cuidar/I88670761M",
      link_checklist: "https://hotmart.com/pt-br/marketplace/produtos/hagsxd-checklist-da-maternidade-y0sts/T98928526G",
      link_desmame: "https://hotmart.com/pt-br/marketplace/produtos/desmamegentil/C98927443V"
    })
    .select()
    .single();

  if (error) {
    console.error(error);
    alert("Erro ao criar configuração inicial.");
    return;
  }

  configSite = data;
  preencherFormulario(data);
}

function preencherFormulario(data) {
  document.getElementById("nomeProfissional").value = data.nome_profissional || "";
  document.getElementById("subtitulo").value = data.subtitulo || "";
  document.getElementById("chamadaPrincipal").value = data.chamada_principal || "";

  document.getElementById("textoSobre1").value = data.texto_sobre_1 || "";
  document.getElementById("textoSobre2").value = data.texto_sobre_2 || "";
  document.getElementById("textoSobre3").value = data.texto_sobre_3 || "";
  document.getElementById("textoConfiar").value = data.texto_confiar || "";

  document.getElementById("whatsapp").value = data.whatsapp || "";
  document.getElementById("instagram").value = data.instagram || "";
  document.getElementById("site").value = data.site || "";

  document.getElementById("linkLivroPerinatal").value = data.link_livro_perinatal || "";
  document.getElementById("linkChecklist").value = data.link_checklist || "";
  document.getElementById("linkDesmame").value = data.link_desmame || "";

  mostrarPreview("previewFotoPerfil", data.foto_perfil_url);
  mostrarPreview("previewFotoLivro", data.foto_livro_url);
  mostrarPreview("previewFotoFamilia", data.foto_familia_url);
  mostrarPreview("previewCapaPsicologia", data.capa_psicologia_url);
  mostrarPreview("previewCapaChecklist", data.capa_checklist_url);
  mostrarPreview("previewCapaDesmame", data.capa_desmame_url);
}

function mostrarPreview(idImagem, url) {
  const img = document.getElementById(idImagem);

  if (!img || !url) {
    return;
  }

  img.src = url;
  img.style.display = "block";
}

async function salvarConfiguracaoSite(event) {
  event.preventDefault();

  const btn = document.getElementById("btnSalvarSite");
  const mensagem = document.getElementById("mensagemSite");

  mensagem.textContent = "";
  btn.disabled = true;
  btn.textContent = "Salvando...";

  let fotoPerfilUrl = configSite?.foto_perfil_url || "css/images/tatiely-perfil.jpg";
  let fotoLivroUrl = configSite?.foto_livro_url || "css/images/tatiely-livro.jpg";
  let fotoFamiliaUrl = configSite?.foto_familia_url || "css/images/tatiely-familia.jpg";

  let capaPsicologiaUrl = configSite?.capa_psicologia_url || "css/images/capa-psicologiaperinatal.PNG";
  let capaChecklistUrl = configSite?.capa_checklist_url || "css/images/capa-checklistmaternidade.PNG";
  let capaDesmameUrl = configSite?.capa_desmame_url || "css/images/capa-desmamegentil.PNG";

  const fotoPerfil = document.getElementById("fotoPerfil").files[0];
  const fotoLivro = document.getElementById("fotoLivro").files[0];
  const fotoFamilia = document.getElementById("fotoFamilia").files[0];

  const capaPsicologia = document.getElementById("capaPsicologia").files[0];
  const capaChecklist = document.getElementById("capaChecklist").files[0];
  const capaDesmame = document.getElementById("capaDesmame").files[0];

  try {
    if (fotoPerfil) {
      fotoPerfilUrl = await enviarImagemStorage(fotoPerfil, "foto-perfil");
    }

    if (fotoLivro) {
      fotoLivroUrl = await enviarImagemStorage(fotoLivro, "foto-livro");
    }

    if (fotoFamilia) {
      fotoFamiliaUrl = await enviarImagemStorage(fotoFamilia, "foto-familia");
    }

    if (capaPsicologia) {
      capaPsicologiaUrl = await enviarImagemStorage(capaPsicologia, "capa-psicologia");
    }

    if (capaChecklist) {
      capaChecklistUrl = await enviarImagemStorage(capaChecklist, "capa-checklist");
    }

    if (capaDesmame) {
      capaDesmameUrl = await enviarImagemStorage(capaDesmame, "capa-desmame");
    }

    const dadosAtualizados = {
      nome_profissional: document.getElementById("nomeProfissional").value.trim(),
      subtitulo: document.getElementById("subtitulo").value.trim(),
      chamada_principal: document.getElementById("chamadaPrincipal").value.trim(),

      texto_sobre_1: document.getElementById("textoSobre1").value.trim(),
      texto_sobre_2: document.getElementById("textoSobre2").value.trim(),
      texto_sobre_3: document.getElementById("textoSobre3").value.trim(),
      texto_confiar: document.getElementById("textoConfiar").value.trim(),

      whatsapp: limparTelefone(document.getElementById("whatsapp").value),
      instagram: document.getElementById("instagram").value.trim(),
      site: document.getElementById("site").value.trim(),

      foto_perfil_url: fotoPerfilUrl,
      foto_livro_url: fotoLivroUrl,
      foto_familia_url: fotoFamiliaUrl,

      capa_psicologia_url: capaPsicologiaUrl,
      capa_checklist_url: capaChecklistUrl,
      capa_desmame_url: capaDesmameUrl,

      link_livro_perinatal: document.getElementById("linkLivroPerinatal").value.trim(),
      link_checklist: document.getElementById("linkChecklist").value.trim(),
      link_desmame: document.getElementById("linkDesmame").value.trim(),

      atualizado_em: new Date().toISOString()
    };

    const { data, error } = await supabaseClient
      .from("site_publico_config")
      .update(dadosAtualizados)
      .eq("usuario_id", usuarioSite.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    configSite = data;
    preencherFormulario(data);

    mensagem.textContent = "Site atualizado com sucesso!";
  } catch (erro) {
    console.error(erro);
    mensagem.textContent = "Erro ao salvar alterações do site.";
  }

  btn.disabled = false;
  btn.textContent = "Salvar alterações";
}

async function enviarImagemStorage(arquivo, nomeBase) {
  const extensao = arquivo.name.split(".").pop();
  const nomeArquivo = `${usuarioSite.id}/${nomeBase}-${Date.now()}.${extensao}`;

  const { error } = await supabaseClient.storage
    .from("site-publico")
    .upload(nomeArquivo, arquivo, {
      cacheControl: "3600",
      upsert: true
    });

  if (error) {
    throw error;
  }

  const { data } = supabaseClient.storage
    .from("site-publico")
    .getPublicUrl(nomeArquivo);

  return data.publicUrl;
}

function limparTelefone(valor) {
  return String(valor || "").replace(/\D/g, "");
}