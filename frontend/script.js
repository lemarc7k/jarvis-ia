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

// 1. INTEGRACION TIME&DATE: Reloj en tiempo real (fecha arriba, hora abajo)
function updateDateTime() {
  const now = new Date();

  // Formato de fecha
  const dateOptions = {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  const dateStr = now.toLocaleDateString("es-ES", dateOptions);

  // Formato de hora
  const timeOptions = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };
  const timeStr = now.toLocaleTimeString("es-ES", timeOptions);

  // Inyectamos en el DOM
  document.getElementById("date").textContent = dateStr;
  document.getElementById("time").textContent = timeStr;
}

// Arranca y refresca cada segundo
updateDateTime();
setInterval(updateDateTime, 1000);

// 2. INTEGRACION CLIMA: Clima en tiempo real
async function updateWeather() {
  const apiKey = "20062016f40ad7c40d649d5c4e25222b"; // reemplaza con tu clave OWM
  const city = "Perth,AU"; // o la ciudad que quieras
  const url =
    `https://api.openweathermap.org/data/2.5/weather` +
    `?q=${encodeURIComponent(city)}` +
    `&units=metric&lang=es&appid=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok) {
      // extrae icono, temperatura y descripción
      const iconCode = data.weather[0].icon;
      const temp = Math.round(data.main.temp);
      const desc = data.weather[0].description;

      // inyecta en el DOM
      document.getElementById(
        "weatherIcon"
      ).innerHTML = `<img src="https://openweathermap.org/img/wn/${iconCode}@2x.png" alt="Icono clima">`;
      document.getElementById("weatherTemp").textContent = `${temp}°C`;
      document.getElementById("weatherDesc").textContent = desc;
    } else {
      console.error("OWM error:", data.message);
      document.getElementById("weatherDesc").textContent =
        "Error al cargar clima";
    }
  } catch (err) {
    console.error("Fetch clima falló:", err);
    document.getElementById("weatherDesc").textContent = "No disponible";
  }
}

// Arranca la función y actualiza cada 10 minutos (600 000 ms)
updateWeather();
setInterval(updateWeather, 600000);

// === Noticias en tiempo real (mejorada) ===
async function updateNews() {
  const apiKey = "f25463cde1414ed982debe2fee5a2da1"; // ← tu clave real de NewsAPI
  const url =
    `https://newsapi.org/v2/top-headlines?` +
    `country=es&category=general&pageSize=5&apiKey=${apiKey}`;

  const listEl = document.getElementById("newsList");
  // 1. Mensaje de carga
  listEl.innerHTML = "<li>Cargando noticias…</li>";

  try {
    const res = await fetch(url);
    const data = await res.json();

    console.log("▶️ NewsAPI response:", data);

    if (!res.ok) {
      // error de la API
      throw new Error(data.message || "Error en NewsAPI");
    }

    // 2. Si no vienen artículos, mostramos fallback
    if (!data.articles || data.articles.length === 0) {
      listEl.innerHTML = "<li>No hay noticias disponibles.</li>";
      return;
    }

    // 3. Pintamos la lista
    listEl.innerHTML = "";
    data.articles.forEach((art) => {
      const li = document.createElement("li");
      li.innerHTML = `<a href="${art.url}" target="_blank">${art.title}</a>`;
      listEl.appendChild(li);
    });
  } catch (err) {
    console.error("❌ Error cargando noticias:", err);
    listEl.innerHTML = "<li>No se pudieron cargar las noticias.</li>";
  }
}

// Al inicio y cada 10 minutos
updateNews();
setInterval(updateNews, 600000);
