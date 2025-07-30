// voz-audio.js
require("dotenv").config(); // ✅ Asegúrate de que esto esté arriba de todo
const axios = require("axios");
const fs = require("fs");
const player = require("play-sound")({});

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // voz predeterminada

async function hablar(texto) {
  try {
    const response = await axios({
      method: "POST",
      url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      data: {
        text: texto,
        model_id: "eleven_multilingual_v2", // ✅ mejor modelo y multilenguaje
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.8,
        },
      },
      responseType: "arraybuffer",
    });

    const audioPath = "respuesta.mp3";
    fs.writeFileSync(audioPath, response.data);

    player.play(audioPath, function (err) {
      if (err) console.error("❌ Error al reproducir:", err);
    });
  } catch (err) {
    console.error("❌ Error al hablar:", err.message);
  }
}

module.exports = { hablar };
