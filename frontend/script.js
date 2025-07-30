// Basamos siempre las llamadas en el origen actual (local o producción)
const API_BASE = window.location.origin;

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

// Animaciones
function glowOn() {
  wave.style.display = "flex";
  jarvisCore.classList.add("glow");
  jarvisCore.style.animation = "none";
}
function glowOff() {
  wave.style.display = "none";
  jarvisCore.classList.remove("glow");
  jarvisCore.style.animation = "float 4s ease-in-out infinite";
  status.textContent = "En espera de su consulta...";
}

// GRABAR + ENVIAR AUDIO
async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    if (!MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
      alert("Tu navegador no soporta grabación en audio/webm;codecs=opus");
      return;
    }

    mediaRecorder = new MediaRecorder(stream, {
      mimeType: "audio/webm;codecs=opus",
    });

    console.log("🎙️ Micrófono activo. Grabando...");

    audioChunks = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      const fd = new FormData();
      fd.append("audio", blob, "voice.webm");

      status.textContent = "Procesando consulta...";
      glowOn();

      try {
        console.log("📡 Enviando audio a:", "/api/voice");
        const res = await fetch("/api/voice", {
          method: "POST",
          body: fd,
        });

        if (!res.ok) throw new Error("Error en /api/voice");
        const data = await res.json();

        console.log("✅ Transcripción recibida:", data.transcription);
        console.log("✅ Respuesta IA:", data.response);

        transcriptionBox.textContent = data.transcription;
        responseBox.textContent = data.response;
        await reproducirVoz(data.response);
      } catch (err) {
        console.error(
          "❌ Error durante el envío de audio o respuesta IA:",
          err
        );
        responseBox.textContent = "❌ Error procesando la voz.";
      }

      status.textContent = "✅ Pulsa para hablar de nuevo";
    };

    mediaRecorder.start();
    status.textContent = "🎙️ Grabando... pulsa de nuevo para detener";

    // Automático tras 5s
    setTimeout(() => {
      if (mediaRecorder.state === "recording") {
        console.log("⏱️ Tiempo límite alcanzado. Deteniendo grabación.");
        mediaRecorder.stop();
      }
    }, 5000);
  } catch (err) {
    console.error("❌ Error accediendo al micrófono:", err);
    status.textContent = "❌ Error accediendo al micrófono.";
  }
}

// ENVIAR TEXTO MANUAL
async function enviarTextoManual() {
  const prompt = manualInput.value.trim();
  if (!prompt) return;

  glowOn();
  status.textContent = "Consultando...";

  try {
    console.log("⌨️ Enviando prompt manual:", prompt);

    const res = await fetch("/api/ia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) throw new Error("Error en /api/ia");
    const { respuesta } = await res.json();

    console.log("🤖 Respuesta IA (manual):", respuesta);

    responseBox.textContent = respuesta;
    transcriptionBox.textContent = prompt;
    await reproducirVoz(respuesta);
  } catch (err) {
    console.error("❌ Error en texto manual:", err);
    responseBox.textContent = "❌ Error procesando el texto.";
  }
}

// TTS nativo
function reproducirVoz(texto) {
  if (!texto) return;
  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = "es-ES";
  u.rate = 1;
  u.pitch = 0.8;
  glowOn();
  u.onend = glowOff;
  console.log("🔊 Reproduciendo respuesta por voz...");
  synth.speak(u);
}

// EVENTOS
recordBtn.addEventListener("click", () => {
  if (mediaRecorder?.state === "recording") {
    console.log("⏹️ Deteniendo grabación por clic");
    mediaRecorder.stop();
    recordBtn.disabled = true;
    status.textContent = "⏹️ Procesando...";
    return;
  }

  console.log("🎙️ Iniciando grabación por clic");
  startRecording();
  recordBtn.disabled = false;
  status.textContent = "🎙️ Grabando...";
});

sendBtn.addEventListener("click", enviarTextoManual);
