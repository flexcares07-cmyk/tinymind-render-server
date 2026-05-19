const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: "25mb" }));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

app.get("/", (req, res) => {
  res.json({
    ok: true,
    app: "TinyMind Kids AI Render Server",
    status: "live",
    model: MODEL,
    routes: [
      "GET /api/health",
      "POST /api/create-script",
      "POST /api/create-scenes",
      "POST /api/chat",
      "POST /api/render-video"
    ]
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "TinyMind backend ready",
    openai: Boolean(process.env.OPENAI_API_KEY),
    firebase: Boolean(process.env.FIREBASE_API_KEY),
    model: MODEL
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ ok: false, error: "message is required" });

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "Eres TinyMind Kids, un asistente experto en crear contenido infantil seguro, educativo y apto para YouTube Kids."
        },
        { role: "user", content: message }
      ],
      temperature: 0.7
    });

    res.json({ ok: true, reply: response.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/create-script", async (req, res) => {
  try {
    const {
      idea = "Un dinosaurio pequeño aprende a compartir sus juguetes con sus amigos",
      language = "español",
      duration = 180,
      ageRange = "4-7",
      style = "3D cartoon premium tipo película infantil"
    } = req.body;

    const prompt = `
Crea un guion infantil premium para YouTube Kids.

Idea: ${idea}
Idioma: ${language}
Duración mínima: ${duration} segundos
Edad: ${ageRange}
Estilo visual: ${style}

Reglas:
- Contenido seguro para niños.
- Sin violencia, miedo fuerte, política, temas adultos ni lenguaje inapropiado.
- Debe durar aproximadamente 3 minutos.
- Debe tener narrador, diálogos cortos y moraleja.
- Devuelve SOLO texto limpio listo para copiar.
`;

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "Eres un guionista experto en videos infantiles educativos, seguros y virales para YouTube Kids." },
        { role: "user", content: prompt }
      ],
      temperature: 0.75
    });

    res.json({ ok: true, script: response.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/create-scenes", async (req, res) => {
  try {
    const {
      idea = "Un dinosaurio pequeño aprende a compartir sus juguetes con sus amigos",
      scenes = 15,
      secondsPerScene = 12,
      language = "español",
      style = "3D cartoon premium"
    } = req.body;

    const prompt = `
Crea una estructura JSON para un video infantil.

Idea: ${idea}
Idioma: ${language}
Cantidad de escenas: ${scenes}
Duración por escena: ${secondsPerScene} segundos
Estilo: ${style}

Devuelve SOLO JSON válido con esta forma:
{
  "title": "...",
  "durationSeconds": 180,
  "moral": "...",
  "scenes": [
    {
      "number": 1,
      "duration": 12,
      "title": "...",
      "narration": "...",
      "dialogue": "...",
      "visualPrompt": "...",
      "cameraMotion": "...",
      "sound": "..."
    }
  ]
}

Reglas:
- Seguro para niños.
- No uses personajes famosos ni marcas.
- VisualPrompt debe ser detallado para generar imagen/video IA.
`;

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "Eres director creativo experto en videos infantiles de IA. Devuelve JSON válido solamente." },
        { role: "user", content: prompt }
      ],
      temperature: 0.6
    });

    let raw = response.choices[0].message.content.trim();
    raw = raw.replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/i, "").trim();

    let parsed;
    try { parsed = JSON.parse(raw); } catch { parsed = { raw }; }

    res.json({ ok: true, result: parsed });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/render-video", async (req, res) => {
  res.json({
    ok: true,
    status: "render-endpoint-ready",
    message: "Este endpoint está reservado para FFmpeg/Remotion. El próximo paso será conectar imágenes, audio y escenas para crear MP4 final.",
    received: req.body || {}
  });
});

app.listen(PORT, () => {
  console.log(`TinyMind AI Render Server running on port ${PORT}`);
});
