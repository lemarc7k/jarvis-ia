const jarvisCore = document.getElementById("jarvisCore");
const wave = document.getElementById("voice-wave");
const recordBtn = document.getElementById("recordBtn");
const status = document.getElementById("status");
const transcriptionBox = document.getElementById("transcription");
const responseBox = document.getElementById("response");
const manualInput = document.getElementById("manualText");
const sendBtn = document.getElementById("sendBtn");

let mediaRecorder;
let audioChunks = [];

let vozSeleccionada = null; // Guarda la voz seleccionada globalmente

// Funciones para glow y animación
function glowOn() {
  wave.style.display = "flex";
  jarvisCore.classList.add("glow");
  jarvisCore.style.animation = "none"; // pausa flotación
}

function glowOff() {
  wave.style.display = "none";
  jarvisCore.classList.remove("glow");
  jarvisCore.style.animation = "float 4s ease-in-out infinite"; // reactiva flotación
  status.textContent = "En espera de su consulta...";
}

// Seleccionar la voz una sola vez
function seleccionarVoz() {
  const synth = window.speechSynthesis;
  const voices = synth.getVoices();

  // Intenta elegir una voz masculina española
  let voz = voices.find(
    (v) =>
      v.lang.startsWith("es") &&
      (v.name.toLowerCase().includes("male") ||
        v.name.toLowerCase().includes("hombre") ||
        v.name.toLowerCase().includes("miguel") ||
        v.name.toLowerCase().includes("pablo") ||
        v.name.toLowerCase().includes("david"))
  );

  if (!voz) {
    voz = voices.find((v) => v.lang.startsWith("es")) || voices[0];
  }

  return voz;
}

// Función para reproducir voz usando la voz ya seleccionada
function reproducirVoz(texto) {
  if (!texto) return;

  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(texto);

  utterance.voice = vozSeleccionada;
  utterance.lang = "es-ES";
  utterance.rate = 1;
  utterance.pitch = 0;

  glowOn();

  utterance.onend = () => {
    glowOff();
  };

  synth.speak(utterance);
}

// Grabar audio y enviar
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", blob, "voice.webm");

      status.textContent = "Procesando consulta...";
      glowOn();

      try {
        const res = await fetch("/api/voice", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error("Error en el servidor");

        const data = await res.json();
        transcriptionBox.textContent =
          data.transcription || "(Sin transcripción)";
        responseBox.textContent = data.response || "(Sin respuesta)";

        await reproducirVoz(data.response);
      } catch (err) {
        console.error("❌ Error al procesar:", err);
        responseBox.textContent = "❌ Error procesando la voz.";
      }
      status.textContent = "✅ Pulsa para hablar de nuevo";
    };

    mediaRecorder.start();
    status.textContent = "🎙️ Grabando... pulsa de nuevo para detener";

    // Detener grabación tras 5 segundos
    setTimeout(() => {
      if (mediaRecorder.state === "recording") mediaRecorder.stop();
    }, 5000);
  } catch (err) {
    console.error("🎤 Error accediendo al micrófono:", err);
    status.textContent = "❌ Error accediendo al micrófono.";
  }
}

// Enviar texto manualmente
async function enviarTextoManual() {
  const prompt = manualInput.value.trim();
  if (!prompt) return;

  glowOn();
  status.textContent = "Consultando...";

  try {
    const res = await fetch("/api/ia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) throw new Error("Error en la IA");

    const data = await res.json();

    responseBox.textContent = data.respuesta || "Sin respuesta";
    transcriptionBox.textContent = prompt;

    await reproducirVoz(data.respuesta);
  } catch (error) {
    console.error("❌ Error enviando texto manual:", error);
    responseBox.textContent = "❌ Error procesando el texto.";
  }
}

// Eventos
recordBtn.addEventListener("click", () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    status.textContent = "⏹️ Procesando...";
    recordBtn.disabled = true;
    return;
  }
  new Audio("assets/bootup.wav").play();
  startRecording();
  recordBtn.disabled = false;
});

sendBtn.addEventListener("click", enviarTextoManual);

// Inicializar voz cuando estén cargadas
window.speechSynthesis.onvoiceschanged = () => {
  if (!vozSeleccionada) {
    vozSeleccionada = seleccionarVoz();
  }
};
// Por si ya estaban cargadas las voces al cargar la página
if (window.speechSynthesis.getVoices().length > 0 && !vozSeleccionada) {
  vozSeleccionada = seleccionarVoz();
}
