document.addEventListener("DOMContentLoaded", () => {
  const formAgenda = document.getElementById("formAgenda");
  const recorrencia = document.getElementById("recorrencia");
  const boxRecorrencia = document.getElementById("boxRecorrencia");

  recorrencia.addEventListener("change", () => {
    const tipoRecorrencia = recorrencia.value;

    if (tipoRecorrencia === "nao") {
      boxRecorrencia.style.display = "none";
    } else {
      boxRecorrencia.style.display = "block";
    }
  });

  formAgenda.addEventListener("submit", (event) => {
    event.preventDefault();

    const paciente = document.getElementById("paciente").value;
    const dataPrimeiraSessao = document.getElementById("dataPrimeiraSessao").value;
    const horaInicio = document.getElementById("horaInicio").value;
    const horaFim = document.getElementById("horaFim").value;
    const tipoRecorrencia = recorrencia.value;
    const repetirAte = document.getElementById("repetirAte").value;
    const quantidadeSessoes = document.getElementById("quantidadeSessoes").value;

    if (!paciente || !dataPrimeiraSessao || !horaInicio || !horaFim) {
      alert("Preencha paciente, data e horários do agendamento.");
      return;
    }

    if (tipoRecorrencia !== "nao" && !repetirAte && !quantidadeSessoes) {
      alert("Para agendamento recorrente, informe uma data final ou uma quantidade de sessões.");
      return;
    }

    alert("Agendamento salvo no protótipo! Depois vamos conectar isso ao Supabase.");

    formAgenda.reset();
    boxRecorrencia.style.display = "none";
  });
});