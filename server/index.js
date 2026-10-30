// Beyond SI-CAD server — Express app for Databricks Apps.
// Serves the client and the closed-loop /api/si/plan endpoint.
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { planWithLoop } from "./planner.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, name: "beyond-si-cad" }));

app.post("/api/si/plan", async (req, res) => {
  try {
    const { prompt, current } = req.body || {};
    if (!prompt || typeof prompt !== "string") return res.status(400).json({ error: "prompt required" });
    // Kernel regenerate is injected when the engine is loaded (Node replicad).
    // For now the planner runs schema-only if no kernel is wired.
    const result = await planWithLoop(req, { prompt, current, regenerate: null });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const dist = path.join(__dirname, "../dist");
app.use(express.static(dist));
app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));

const port = process.env.PORT || 8000;
app.listen(port, () => console.log(`Beyond SI-CAD listening on ${port}`));
