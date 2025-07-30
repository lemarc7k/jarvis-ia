const { spawn } = require("child_process");
const fs = require("fs");
const { createClient } = require("@deepgram/sdk");
require("dotenv").config();

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

function escucharVoz(callback) {
  console.log("🎙️ Escuchando...");

  const micName = "Microphone Array (Realtek(R) Audio)"; // cámbialo si usas otro

  // Comando FFmpeg para capturar el micro y convertir a audio crudo
  const ffmpeg = spawn("ffmpeg", [
    "-f",
    "dshow",
    "-i",
    `audio=${micName}`,
    "-ar",
    "16000",
    "-ac",
    "1",
    "-f",
    "s16le",
    "-",
  ]);

  // Crear stream Deepgram
  const dgStream = deepgram.listen.live({
    model: "nova",
    language: "es",
    punctuate: true,
    interim_results: false,
  });

  // Guardar audio para debug
  const writeStream = fs.createWriteStream("output.raw");

  // Eventos de conexión Deepgram
  dgStream.addListener("open", () => {
    console.log("🔊 Conectado a Deepgram");
  });

  dgStream.addListener("transcriptReceived", (msg) => {
    const texto = msg.channel.alternatives[0]?.transcript;
    if (texto && texto.length > 0) {
      console.log(`🗣️ Tú dijiste: ${texto}`);
      ffmpeg.kill("SIGINT");
      dgStream.finish();
      writeStream.end(); // terminar archivo raw
      callback(texto);
    }
  });

  dgStream.addListener("error", (err) => {
    console.error("❌ Error con Deepgram:", err);
  });

  dgStream.addListener("close", () => {
    console.log("🔒 Conexión cerrada con Deepgram");
  });

  // Si hay salida de audio desde FFmpeg
  ffmpeg.stdout.on("data", (chunk) => {
    console.log("📦 Chunk enviado:", chunk.length, "bytes");
    writeStream.write(chunk); // Guardamos para debug
    dgStream.send(chunk); // Enviamos a Deepgram
  });

  ffmpeg.stderr.on("data", (data) => {
    console.log("⚠️ FFmpeg:", data.toString());
  });

  ffmpeg.on("error", (err) => {
    console.error("❌ Error al iniciar FFmpeg:", err);
  });

  ffmpeg.on("exit", (code, signal) => {
    console.log(`📤 FFmpeg cerrado con código ${code}, señal ${signal}`);
  });
}

module.exports = { escucharVoz };
