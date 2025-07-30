const fs = require("fs");
const mic = require("mic");

const micInstance = mic({
  rate: "16000",
  channels: "1",
  debug: true,
  exitOnSilence: 6,
});

const micInputStream = micInstance.getAudioStream();
const outputFileStream = fs.WriteStream("test_audio.wav");

micInputStream.pipe(outputFileStream);

micInputStream.on("data", function (data) {
  console.log("🎙️ Grabando audio...");
});

micInputStream.on("error", function (err) {
  console.log("❌ Error: " + err);
});

micInputStream.on("startComplete", function () {
  console.log("✅ Grabación iniciada, se grabarán 5 segundos...");
  setTimeout(() => {
    micInstance.stop();
  }, 5000);
});

micInputStream.on("stopComplete", function () {
  console.log("✅ Grabación terminada. Revisa el archivo test_audio.wav");
});

micInstance.start();
