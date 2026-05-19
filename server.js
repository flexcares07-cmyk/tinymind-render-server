import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import os from "os";
import { v4 as uuidv4 } from "uuid";
import ffmpeg from "fluent-ffmpeg";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.json({
    ok: true,
    app: "TinyMind Kids FFmpeg Render Server",
    status: "running",
    endpoints: ["/health", "/render"]
  });
});

app.get("/health", (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

async function downloadFile(urlOrData, filePath) {
  if (!urlOrData) throw new Error("Missing asset URL/data");
  if (String(urlOrData).startsWith("data:")) {
    const base64 = String(urlOrData).split(",")[1];
    fs.writeFileSync(filePath, Buffer.from(base64, "base64"));
    return filePath;
  }
  const r = await fetch(urlOrData);
  if (!r.ok) throw new Error(`Download failed ${r.status}`);
  const buffer = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

function runFFmpeg(command) {
  return new Promise((resolve, reject) => {
    command.on("end", resolve).on("error", reject).run();
  });
}

app.post("/render", async (req, res) => {
  const jobId = uuidv4();
  const jobDir = path.join(os.tmpdir(), `tinymind-${jobId}`);
  fs.mkdirSync(jobDir, { recursive: true });

  try {
    const { timeline = [], width = 1920, height = 1080 } = req.body || {};
    if (!Array.isArray(timeline) || timeline.length === 0) {
      return res.status(400).json({ ok: false, error: "Missing timeline[]" });
    }

    const sceneVideos = [];

    for (let i = 0; i < timeline.length; i++) {
      const scene = timeline[i];
      const duration = Number(scene.durationSec || 12);
      const imagePath = path.join(jobDir, `scene-${i}.png`);
      const audioPath = path.join(jobDir, `scene-${i}.mp3`);
      const outPath = path.join(jobDir, `scene-${i}.mp4`);

      await downloadFile(scene.image || scene.imageUrl, imagePath);

      let hasAudio = false;
      if (scene.audio || scene.audioUrl) {
        try {
          await downloadFile(scene.audio || scene.audioUrl, audioPath);
          hasAudio = true;
        } catch {}
      }

      let cmd = ffmpeg()
        .input(imagePath)
        .inputOptions(["-loop 1"])
        .videoFilters([
          `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
          `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
          "format=yuv420p"
        ])
        .outputOptions([
          "-t", String(duration),
          "-r", "30",
          "-pix_fmt", "yuv420p",
          "-movflags", "+faststart"
        ]);

      if (hasAudio) {
        cmd = cmd.input(audioPath).outputOptions(["-shortest"]);
      } else {
        cmd = cmd.outputOptions(["-an"]);
      }

      cmd = cmd.output(outPath);
      await runFFmpeg(cmd);
      sceneVideos.push(outPath);
    }

    const listPath = path.join(jobDir, "concat.txt");
    fs.writeFileSync(listPath, sceneVideos.map(p => `file '${p}'`).join("\n"));

    const finalPath = path.join(jobDir, "tinymind-final.mp4");

    await runFFmpeg(
      ffmpeg()
        .input(listPath)
        .inputOptions(["-f", "concat", "-safe", "0"])
        .outputOptions(["-c", "copy", "-movflags", "+faststart"])
        .output(finalPath)
    );

    const mp4 = fs.readFileSync(finalPath);
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", `attachment; filename="tinymind-video-${jobId}.mp4"`);
    res.send(mp4);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  } finally {
    setTimeout(() => {
      try { fs.rmSync(jobDir, { recursive: true, force: true }); } catch {}
    }, 10000);
  }
});

app.listen(PORT, () => {
  console.log(`TinyMind render server running on port ${PORT}`);
});
