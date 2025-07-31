// === CONFIGURACIÓN GLOBAL ===
const API_BASE = window.location.origin;

const jarvisCore = document.getElementById("jarvisCore");
const wave = document.getElementById("voice-wave");

// === ANIMACIONES ===
function glowOn() {
  wave.style.display = "flex";
  jarvisCore.classList.add("glow");
  jarvisCore.style.animation = "none";
}
function glowOff() {
  wave.style.display = "none";
  jarvisCore.classList.remove("glow");
  jarvisCore.style.animation = "float 4s ease-in-out infinite";
  const status = document.getElementById("status");
  if (status) status.textContent = "En espera de su consulta...";
}

// === FUNCIONES DE VOZ ===
let mediaRecorder;
let audioChunks = [];

async function startRecording() {
  try {
    const status = document.getElementById("status");
    const transcriptionBox = document.getElementById("transcription");
    const responseBox = document.getElementById("response");

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (!MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
      alert("Tu navegador no soporta grabación en audio/webm;codecs=opus");
      return;
    }

    mediaRecorder = new MediaRecorder(stream, {
      mimeType: "audio/webm;codecs=opus",
    });

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
        const res = await fetch("/api/voice", {
          method: "POST",
          body: fd,
        });
        if (!res.ok) throw new Error("Error en /api/voice");
        const data = await res.json();

        transcriptionBox.textContent = data.transcription;
        responseBox.textContent = data.response;
        await reproducirVoz(data.response);
      } catch (err) {
        console.error("❌ Error voz:", err);
        responseBox.textContent = "❌ Error procesando la voz.";
      }

      status.textContent = "✅ Pulsa para hablar de nuevo";
    };

    mediaRecorder.start();
    status.textContent = "🎙️ Grabando...";
    setTimeout(() => {
      if (mediaRecorder.state === "recording") mediaRecorder.stop();
    }, 5000);
  } catch (err) {
    console.error("❌ Micrófono:", err);
    const status = document.getElementById("status");
    if (status) status.textContent = "❌ Error accediendo al micrófono.";
  }
}

async function enviarTextoManual() {
  const manualInput = document.getElementById("manualText");
  const status = document.getElementById("status");
  const transcriptionBox = document.getElementById("transcription");
  const responseBox = document.getElementById("response");

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

    if (!res.ok) throw new Error("Error en /api/ia");
    const { respuesta } = await res.json();

    responseBox.textContent = respuesta;
    transcriptionBox.textContent = prompt;
    await reproducirVoz(respuesta);
  } catch (err) {
    console.error("❌ Error manual:", err);
    responseBox.textContent = "❌ Error procesando el texto.";
  }
}

function reproducirVoz(texto) {
  if (!texto) return;
  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = "es-ES";
  u.rate = 1;
  u.pitch = 0.8;
  glowOn();
  u.onend = glowOff;
  synth.speak(u);
}

// === FUNCIONES EXTERNAS ===
function updateDateTime() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("es-ES", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  document.getElementById("date").textContent = dateStr;
  document.getElementById("time").textContent = timeStr;
}
setInterval(updateDateTime, 1000);
updateDateTime();

async function updateWeather() {
  const apiKey = "20062016f40ad7c40d649d5c4e25222b";
  const city = "Perth,AU";
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
    city
  )}&units=metric&lang=es&appid=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok) {
      const iconCode = data.weather[0].icon;
      const temp = Math.round(data.main.temp);
      const desc = data.weather[0].description;
      document.getElementById(
        "weatherIcon"
      ).innerHTML = `<img src="https://openweathermap.org/img/wn/${iconCode}@2x.png">`;
      document.getElementById("weatherTemp").textContent = `${temp}°C`;
      document.getElementById("weatherDesc").textContent = desc;
    } else {
      document.getElementById("weatherDesc").textContent =
        "Error al cargar clima";
    }
  } catch {
    document.getElementById("weatherDesc").textContent = "No disponible";
  }
}
setInterval(updateWeather, 600000);
updateWeather();

async function updateNews() {
  const apiKey = "f25463cde1414ed982debe2fee5a2da1";
  const url = `https://newsapi.org/v2/top-headlines?country=es&category=general&pageSize=5&apiKey=${apiKey}`;
  const listEl = document.getElementById("newsList");
  listEl.innerHTML = "<li>Cargando noticias…</li>";

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || !data.articles) throw new Error("Error en NewsAPI");

    listEl.innerHTML = "";
    data.articles.forEach((art) => {
      const li = document.createElement("li");
      li.innerHTML = `<a href="${art.url}" target="_blank">${art.title}</a>`;
      listEl.appendChild(li);
    });
  } catch {
    listEl.innerHTML = "<li>No se pudieron cargar las noticias.</li>";
  }
}
setInterval(updateNews, 600000);
updateNews();

// === [1] FUNCIÓN GENERAL PARA CARGAR CONTENIDO DE PESTAÑAS DINÁMICAS ===
function loadTabContent(tabName) {
  const mainContent = document.getElementById("mainContent");
  mainContent.innerHTML = "<p>Cargando...</p>"; // Mensaje de carga temporal

  fetch(`${tabName}.html`) // Carga el archivo HTML de la pestaña correspondiente
    .then((res) => res.text())
    .then((html) => {
      mainContent.innerHTML = html; // Inserta el HTML cargado

      // Activa eventos específicos según la pestaña
      if (tabName === "dashboard") initDashboardEvents(); // 🚀 Eventos de dashboard
      if (tabName === "ceoAI") initCeoEvents(); // 🚀 Eventos de CEO-as-a-Service
    })
    .catch((err) => {
      console.error("Error cargando pestaña:", err);
      mainContent.innerHTML = "<p>Error al cargar el contenido.</p>";
    });
}

// === [2] EVENTOS ESPECÍFICOS DEL DASHBOARD (ej. grabación, animación bienvenida) ===
function initDashboardEvents() {
  const recordBtn = document.getElementById("recordBtn"); // 🎙 Botón para iniciar grabación de voz
  const sendBtn = document.getElementById("sendBtn"); // 📩 Botón para enviar texto manual

  if (recordBtn) recordBtn.addEventListener("click", startRecording);
  if (sendBtn) sendBtn.addEventListener("click", enviarTextoManual);

  escribirBienvenida(); // 💬 Muestra mensaje tipo Jarvis al cargar dashboard
}

// === [3] FUNCIÓN PARA ANIMACIÓN DE BIENVENIDA CON VOZ JARVIS ===
function escribirBienvenida() {
  const message =
    "Welcome to the main panel of MEVES Industries, Sir Mera. " +
    "Initializing protocols... Systems activated. " +
    "It is a pleasure to have you back, Sir.";

  const target = document.getElementById("welcomeMessage");
  if (!target) return;

  target.innerHTML = "";
  let index = 0;

  const synth = window.speechSynthesis;
  let jarvisVoice = null;

  function configurarYHablar() {
    const voces = synth.getVoices();
    console.log("🗣 VOCES DISPONIBLES:", voces); // 👀 Mira en consola

    // Intenta encontrar voz masculina inglesa
    jarvisVoice = voces.find(
      (voice) =>
        voice.name.includes("Google UK English Male") ||
        (voice.lang === "en-GB" && voice.name.toLowerCase().includes("male"))
    );

    if (!jarvisVoice && voces.length > 0) {
      jarvisVoice = voces.find((voice) => voice.lang.startsWith("en")); // Fallback
    }

    // Hablar mensaje una sola vez
    const utter = new SpeechSynthesisUtterance(message);
    utter.voice = jarvisVoice;
    utter.lang = "en-GB";
    utter.rate = 0.95;
    utter.pitch = 0.8;
    utter.volume = 1;
    synth.speak(utter);
  }

  // Animación tipo Jarvis
  function escribirLetraPorLetra() {
    const char = message.charAt(index);
    target.innerHTML += char === "\n" ? "<br>" : char;
    index++;
    if (index < message.length) {
      const delay = char === "." ? 200 : 40;
      setTimeout(escribirLetraPorLetra, delay);
    }
  }

  // Espera a que se carguen las voces una sola vez
  if (synth.getVoices().length !== 0) {
    configurarYHablar();
  } else {
    synth.onvoiceschanged = () => {
      configurarYHablar();
    };
  }

  escribirLetraPorLetra(); // Inicia animación visual
}

// === [4] EVENTOS DE LA PESTAÑA CEO-as-a-Service ===
function initCeoEvents() {
  const ceoInput = document.getElementById("ceoInput"); // 📥 Input de ideas
  const ceoSendBtn = document.getElementById("ceoSendBtn"); // 📤 Botón para enviar idea
  const deckContainer = document.getElementById("pitchDeckContainer"); // 📊 Contenedor del pitch deck
  const closeBtn = document.getElementById("closeDeckBtn"); // ❌ Botón cerrar deck

  // Listeners
  ceoSendBtn?.addEventListener("click", enviarIdeaCEO);
  ceoInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      enviarIdeaCEO();
    }
  });

  // Cerrar pitch deck
  closeBtn?.addEventListener("click", () =>
    deckContainer?.classList.add("hidden")
  );
}

async function enviarIdeaCEO() {
  const input = document.getElementById("ceoInput");
  const output = document.getElementById("ceoResponse");
  const modo = document.getElementById("modoSelector")?.value || "plan";
  const idea = input?.value.trim();

  if (!idea) return;

  output.innerHTML =
    "<div class='ceo-slide'><h3>Procesando...</h3><p>Un momento, señor.</p></div>";

  try {
    const response = await fetch("/api/ceo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idea, modo }),
    });

    const data = await response.json();
    const text = data.respuesta || "⚠️ No se pudo generar una respuesta.";

    const icons = ["💡", "⭐", "🧩", "⚙️", "🚀", "🧠", "🎯", "🗺️", "💬"];
    const slides = text
      .split(/\n(?=\d+\.|\✅|📌|🎯|🧪|💸|🚀|🧲|🗺️|📊|💬|🔧)/)
      .map((s) => s.trim())
      .filter(Boolean);

    const cards = [];

    slides.forEach((slide, i) => {
      const [titleLine, ...rest] = slide.split("\n");
      const title = titleLine.replace(
        /^(\d+\.|\✅|📌|🎯|🧪|💸|🚀|🧲|🗺️|📊|💬|🔧)?\s*/,
        ""
      );
      const icon = icons[i % icons.length];

      const content = rest.join("\n");
      const bullets = content
        .split(/[\n•-]+/)
        .map((b) => b.trim())
        .filter(Boolean);

      bullets.forEach((bullet, idx) => {
        cards.push({
          icon,
          title: idx === 0 ? title : `${title} (${idx + 1})`,
          body: bullet,
        });
      });
    });

    const html = cards
      .map(
        (c) => `
      <div class="ceo-card">
        <div class="ceo-card-icon">${c.icon}</div>
        <div class="ceo-card-title">${c.title}</div>
        <div class="ceo-card-body">${c.body}</div>
      </div>`
      )
      .join("");

    output.innerHTML = `<div class="ceo-grid">${html}</div>`;
  } catch (error) {
    console.error("Error al enviar al backend:", error);
    output.innerHTML =
      "<div class='ceo-slide'><h3>❌ Error</h3><p>No se pudo contactar con la IA.</p></div>";
  }
}

// === [6] GESTIÓN DE CLICS EN TABS (Dashboard / CEO-as-a-Service) ===
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    // Desactiva todos
    document
      .querySelectorAll(".tab-btn")
      .forEach((b) => b.classList.remove("active"));
    // Activa el botón actual
    btn.classList.add("active");

    const tabName = btn.getAttribute("data-tab"); // nombre de pestaña
    loadTabContent(tabName); // carga la pestaña
  });
});

// Carga inicial del dashboard automáticamente al abrir
loadTabContent("dashboard");
