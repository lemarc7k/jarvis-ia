require("dotenv").config();
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { createClient } = require("@deepgram/sdk");
const { OpenAI } = require("openai");

const app = express();
const upload = multer({ dest: "uploads/" });
const PORT = process.env.PORT || 3000;

// Inicializar Deepgram y OpenAI
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Servir archivos estáticos (frontend)
const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath));
app.use("/assets", express.static(path.join(frontendPath, "assets")));
app.use(express.json());

// 🔊 Transcripción de audio y respuesta IA
app.post("/api/voice", upload.single("audio"), async (req, res) => {
  const tmpPath = req.file.path;

  try {
    console.log("📥 Archivo recibido:", req.file);

    const buffer = fs.readFileSync(tmpPath);

    const { result } = await deepgram.listen.prerecorded.transcribeFile(
      buffer,
      {
        mimetype: "audio/webm",
        model: "nova",
        language: "es",
        smart_format: true,
      }
    );

    const transcription =
      result?.channels?.[0]?.alternatives?.[0]?.transcript || "No se entendió";

    console.log("🧠 Transcripción obtenida:", transcription);

    const aiRes = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "Eres Jarvis, el asistente de voz con humor sarcástico y bromas ingeniosas. Hables siempre de usted, sea preciso, breve y termine algunas frases con 'señor'.",
        },
        { role: "user", content: transcription },
      ],
    });

    const respuesta = aiRes.choices[0].message.content;
    console.log("🤖 Respuesta IA:", respuesta);

    res.json({
      transcription,
      response: respuesta,
    });
  } catch (err) {
    console.error("❌ ERROR EN /api/voice:", err);
    res.status(500).send("Error procesando el audio");
  } finally {
    fs.unlink(tmpPath, () => {});
  }
});

// 🧠 Texto manual
app.post("/api/ia", async (req, res) => {
  try {
    const prompt = req.body.prompt;
    if (!prompt) return res.status(400).json({ error: "Texto vacío" });

    const aiRes = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "Eres Jarvis, el asistente de voz con humor sarcástico y bromas ingeniosas. Hables siempre de usted, sea preciso, breve y termine algunas frases con 'señor'.",
        },
        { role: "user", content: prompt },
      ],
    });

    const respuesta = aiRes.choices[0].message.content;
    console.log("🧠 Texto manual recibido:", prompt);
    console.log("🤖 Respuesta IA:", respuesta);

    res.json({ respuesta });
  } catch (err) {
    console.error("❌ ERROR EN /api/ia:", err);
    res.status(500).json({ error: "Error procesando el texto" });
  }
});

// CEO AS A SERVIRCE: CEO-as-a-Service
app.post("/api/ceo", async (req, res) => {
  try {
    const { idea, modo } = req.body;
    if (!idea) return res.status(400).json({ error: "Falta la idea inicial" });

    // Prompt diferente si es pitch_deck
    const prompt =
      modo === "pitch_deck"
        ? `
Actúa como un experto en startups y presentaciones para inversores. 
Genera un pitch deck en formato de secciones numeradas. Cada sección representa una diapositiva con un título y contenido claro.
Usa este formato (no añadas notas ni explicaciones externas):

Slide 1: Título de la idea + frase impactante
Slide 2: Problema que resuelve
Slide 3: Solución propuesta
Slide 4: Cómo funciona
Slide 5: Mercado objetivo
Slide 6: Modelo de negocio
Slide 7: Diferenciador clave
Slide 8: Llamado a la acción / visión a futuro

Idea: ${idea}
      `
        : `
Actúa como CEO virtual experto en startups y emprendimiento. 
Genera un plan ejecutivo corto con estos puntos claros a partir de la idea proporcionada por el usuario:

1. Resumen de la idea.
2. Nombre sugerido del proyecto (3 opciones creativas).
3. Pasos inmediatos (lista breve de 5 tareas clave iniciales).
4. Descripción breve del MVP recomendado.
5. Branding sugerido (nombre, slogan corto).

Idea del usuario: ${idea}
      `;

    const ceoResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: prompt }],
    });

    const respuesta = ceoResponse.choices[0].message.content;
    res.json({ respuesta });
  } catch (err) {
    console.error("❌ ERROR EN /api/ceo:", err);
    res.status(500).json({ error: "Error generando plan ejecutivo" });
  }
});

// RUTA DEL SERVIDOR, MANTENER SIEMPRE AL FINAL DEL CODIGO: ✅ Escuchar en todos los entornos (local y Render)
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Jarvis Online escuchando en http://0.0.0.0:${PORT}`);
});

// RUTA DEL SERVIDOR, MANTENER SIEMPRE AL FINAL DEL CODIGO:🌐 Fallback para Single Page App
app.get("*", (req, res) => {
  const indexPath = path.join(frontendPath, "index.html");
  fs.existsSync(indexPath)
    ? res.sendFile(indexPath)
    : res.status(404).send("index.html no encontrado");
});

/// CEO-as-a-Service: Generador inteligente de planes ejecutivos o pitch decks
app.post("/api/ceo", async (req, res) => {
  try {
    const { idea, modo } = req.body;
    if (!idea) return res.status(400).json({ error: "Falta la idea inicial" });

    const prompt =
      modo === "pitch_deck"
        ? `...` // (mantén aquí el texto actual)
        : `...`; // (igual aquí)

    const ceoResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "Responde como un CEO fundador con visión, claridad ejecutiva y mentalidad de startup disruptiva.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.85,
      max_tokens: 1800,
    });

    const respuesta =
      ceoResponse.choices?.[0]?.message?.content ||
      "❌ No se pudo generar el plan.";

    res.json({ respuesta });
  } catch (err) {
    console.error("❌ ERROR EN /api/ceo:", err);
    res.status(500).json({ error: "Error generando plan ejecutivo" });
  }
});
