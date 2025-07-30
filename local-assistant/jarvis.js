// Cargar variables de entorno
require("dotenv").config();

// Importar librerías necesarias
const OpenAI = require("openai");
const { escucharVoz } = require("./voz"); // Captura desde micrófono
const { hablar } = require("./voz-audio"); // Reproduce audio de respuesta

// Crear cliente de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Función principal
async function iniciarJarvis() {
  console.log("🧠 Jarvis está listo. Di algo... (di 'salir' para terminar)");

  escucharVoz(async (pregunta) => {
    const texto = pregunta.toLowerCase().trim();

    if (texto === "salir") {
      console.log("👋 Adiós, Kevin.");
      process.exit(); // Finaliza el programa
    }

    try {
      console.log("🗣️ Tú dijiste:", texto);

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "Eres un asistente personal inteligente, profesional y amigable.",
          },
          { role: "user", content: texto },
        ],
      });

      const respuesta = response.choices[0].message.content;
      console.log("\n🤖 Jarvis:", respuesta + "\n");

      // Jarvis responde en voz
      await hablar(respuesta);

      // Esperar la próxima entrada por voz (loop)
      iniciarJarvis();
    } catch (error) {
      console.error("❌ Error:", error.message);
    }
  });
}

// Iniciar
iniciarJarvis();

if (require.main === module) {
  iniciarJarvis(); // Solo se ejecuta si corres node jarvis.js directamente
}
