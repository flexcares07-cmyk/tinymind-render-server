const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    ok: true,
    app: "TinyMind Render Server",
    status: "live"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    status: "live"
  });
});

app.post("/api/create-script", async (req, res) => {
  const { idea = "Un dinosaurio pequeño aprende a compartir" } = req.body || {};

  res.json({
    ok: true,
    script: `Historia creada para: ${idea}`
  });
});

app.listen(PORT, () => {
  console.log(`TinyMind server running on port ${PORT}`);
});
