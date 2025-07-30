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
app.use(express.json());

// 🔊 Transcripción de audio y respuesta IA
app.post("/api/voice", upload.single("audio"), async (req, res) => {
  const tmpPath = req.file.path;
  try {
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

    res.json({
      transcription,
      response: aiRes.choices[0].message.content,
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

    res.json({ respuesta: aiRes.choices[0].message.content });
  } catch (err) {
    console.error("❌ ERROR EN /api/ia:", err);
    res.status(500).json({ error: "Error procesando el texto" });
  }
});

// 🌐 Fallback para Single Page App
app.get("*", (req, res) => {
  const indexPath = path.join(frontendPath, "index.html");
  fs.existsSync(indexPath)
    ? res.sendFile(indexPath)
    : res.status(404).send("index.html no encontrado");
});

// 🚀 Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Jarvis Online escuchando en http://localhost:${PORT}`);
});
