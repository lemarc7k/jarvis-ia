require("dotenv").config();
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { createClient } = require("@deepgram/sdk");
const { OpenAI } = require("openai");

const app = express();
const upload = multer({ dest: "uploads/" });
const PORT = 3000;

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(express.static("frontend"));
app.use(express.json());

// 🎙️ Transcripción + Respuesta IA
app.post("/api/voice", upload.single("audio"), async (req, res) => {
  const file = fs.readFileSync(req.file.path);

  try {
    const { result } = await deepgram.listen.prerecorded.transcribeFile(file, {
      mimetype: "audio/webm",
      model: "nova",
      language: "es",
      smart_format: true,
    });

    const transcription =
      result?.channels?.[0]?.alternatives?.[0]?.transcript || "No se entendió";

    const aiRes = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "Eres Jarvis, el asistente inteligente de Kevin Mera, pero con humor sarcástico y bromas ingeniosas. Habla siempre de usted. Responde siempre con precisión y profesionalismo, pero añade toques divertidos frecuentemente, frases casuales o juegos de palabras. Se breve en tus respuestas cuando hagas bromas. Usa un español natural y coloquial, y termina algunas frases con la palabra señor. puedes ofender o ser inapropiado de vez en cuando..",
        },
        {
          role: "user",
          content: transcription,
        },
      ],
    });

    res.json({
      transcription,
      response: aiRes.choices[0].message.content,
    });
  } catch (err) {
    console.error("❌ ERROR EN BACKEND:", err);
    res.status(500).send("Error procesando audio");
  } finally {
    fs.unlinkSync(req.file.path);
  }
});

// 🔊 TTS con ElevenLabs (ESPAÑOL NATURAL)
/*
app.post("/api/speak", async (req, res) => {
  try {
    const { text } = req.body;

    const voiceId = "lnIpQcZuikKim3oNdYlP"; // Tu voz personalizada
    const apiKey = process.env.ELEVENLABS_API_KEY;

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text,
        model_id: "eleven_multilingual_v2", // IMPORTANTE para buen español
        voice_settings: {
          stability: 0.3,
          similarity_boost: 0.9,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
          Accept: "audio/mpeg",
        },
        responseType: "arraybuffer",
      }
    );


    const outputPath = path.join(__dirname, "voice.mp3");
    fs.writeFileSync(outputPath, response.data);

    res.setHeader("Content-Type", "audio/mpeg");
    res.sendFile(outputPath);
  } catch (err) {
    console.error("❌ Error generando voz con ElevenLabs:", err.message);
    res.status(500).json({ error: "Error en TTS" });
  }
});
*/

// ✍️ Texto manual + Respuesta IA
app.post("/api/ia", async (req, res) => {
  try {
    const prompt = req.body.prompt;

    if (!prompt) {
      return res.status(400).json({ error: "No se proporcionó ningún texto" });
    }

    const aiRes = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "Eres Jarvis, el asistente inteligente de Kevin Mera, pero con humor sarcástico y bromas ingeniosas. Habla siempre de usted. Responde siempre con precisión y profesionalismo, pero añade toques divertidos frecuentemente, frases casuales o juegos de palabras. Se breve en tus respuestas cuando hagas bromas. Usa un español natural y coloquial, y termina algunas frases con la palabra señor. puedes ofender o ser inapropiado de vez en cuando..",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    res.json({ respuesta: aiRes.choices[0].message.content });
  } catch (error) {
    console.error("❌ Error procesando texto:", error);
    res.status(500).json({ error: "Error procesando el texto" });
  }
});

app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
