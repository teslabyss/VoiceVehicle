const ordenPrefijo = "INGRID";

document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBtn");
  const outputText = document.getElementById("outputText");
  const msgText = document.getElementById("msgText");

  outputText.innerHTML = `Di ${ordenPrefijo} para comandar`;

  let recognition;
  let stoppedManually = false;

  const direccionAClave = {
    "ADELANTE": "ADELANTE",
    "ATRÁS": "ATRÁS",
    "DETENER": "DETENER",
    "VUELTA DELANTE DERECHA": "V_ADE_DER",
    "VUELTA DELANTE IZQUIERDA": "V_ADE_IZQ",
    "VUELTA ATRÁS DERECHA": "V_ATR_DER",
    "VUELTA ATRÁS IZQUIERDA": "V_ATR_IZQ",
    "GIRO 90° DERECHA": "G_90_DER",
    "GIRO 90° IZQUIERDA": "G_90_IZQ",
    "GIRO 360° DERECHA": "G_360_DER",
    "GIRO 360° IZQUIERDA": "G_360_IZQ"
  };

  if ("webkitSpeechRecognition" in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.lang = "es-ES";
  } else {
    alert("Tu navegador no soporta reconocimiento de voz.");
    return;
  }

  startBtn.addEventListener("click", () => {
    const username = document.getElementById("username").value.trim();
    if (!username) {
      alert("Por favor ingresa tu nombre antes de comenzar.");
      return;
    }

    stoppedManually = false;
    recognition.start();
    startBtn.disabled = true;
    outputText.textContent = `Escuchando... Di ${ordenPrefijo} para que ordenes.`;
    msgText.innerHTML = "";
  });

  recognition.onresult = (event) => {
    let transcript = event.results[event.results.length - 1][0].transcript
      .trim()
      .toUpperCase();

    console.log("Texto reconocido:", transcript);

    if (transcript.includes(ordenPrefijo + " DETENTE")) {
      stoppedManually = true;
      recognition.stop();
      startBtn.disabled = false;
      outputText.textContent = "Detenido. Presiona el botón para comenzar nuevamente.";
      msgText.innerHTML = "";
    } else if (transcript.includes(ordenPrefijo)) {
      let command = transcript.replace(ordenPrefijo, "").trim();
      outputText.innerHTML = `Mensaje detectado: "<strong><em>${transcript}</em></strong>"`;
      sendToAPI(command);
    }
  };

  function sendToAPI(message) {
    fetch("http://34.205.191.74/A-exm-u3-api/endpoints/chat.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: message })
    })
    .then(response => response.json())
    .then(data => {
      if (data.status === 200) {
        const respuestaIA = data.data.reply.trim().toUpperCase();
        msgText.innerHTML = `Dirección detectada: "<strong>${respuestaIA}</strong>"`;

        const clave = direccionAClave[respuestaIA];

        if (clave) {
          saveStatusToDB(clave);
        } else {
          console.warn("No se encontró clave para la respuesta:", respuestaIA);
        }
      } else {
        msgText.innerHTML = `Error en API: ${data.message}`;
      }
    })
    .catch(error => {
      console.error("Error en la solicitud:", error);
      msgText.innerHTML = "Error al conectar con el servidor.";
    });
  }

  function saveStatusToDB(status) {
    const username = document.getElementById("username").value || "Anónimo";

    fetch("http://34.205.191.74/A-exm-iot-api/controllers/AddIotDevice.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: username,
        status: status
      })
    })
    .then(response => response.json())
    .then(data => {
      console.log("Guardado en BD:", data);
      updateLastStatus(status);
      updateLastFive(status);
    })
    .catch(error => {
      console.error("Error al guardar en la base de datos:", error);
    });
  }

  function updateLastStatus(status) {
    document.getElementById("lastStatus").textContent = status;
  }

  const lastFive = [];

  function updateLastFive(newStatus) {
    if (lastFive.length >= 5) lastFive.shift();
    lastFive.push(newStatus);

    const list = document.getElementById("lastFiveList");
    list.innerHTML = "";

    lastFive.slice().reverse().forEach(status => {
      const li = document.createElement("li");
      li.className = "list-group-item";
      li.textContent = status;
      list.appendChild(li);
    });
  }

  recognition.onerror = (event) => {
    console.error("Error en el reconocimiento:", event.error);
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      alert("El micrófono no tiene permisos o fue bloqueado.");
    } else if (event.error === "network") {
      alert("Problema de conexión con el servicio de voz.");
    }
    recognition.stop();
    startBtn.disabled = false;
  };

  recognition.onend = () => {
    if (!stoppedManually) {
      msgText.innerHTML = "El reconocimiento de voz se detuvo inesperadamente<br>Habla nuevamente para continuar...";
      recognition.start();
    }
  };
});
