// Beyond SI-CAD server — Express app for Databricks Apps.
// Serves the client and the closed-loop /api/si/plan endpoint.
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { planWithLoop, siStatus } from "./planner.js";
import { regenerate } from "../src/engine/regenerate.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "2mb" }));

// Lazy-load replicad so the server starts even if the WASM kernel is not yet available.
let r = null;
async function getReplicad() {
  if (r) return r;
  try {
    const replicad = await import("replicad");
    const { setOC } = replicad;
    const opencascade = await import("replicad-opencascadejs");
    setOC(await opencascade.default());
    r = replicad;
    return r;
  } catch (e) {
    console.warn("Kernel not available:", e.message);
    return null;
  }
}

app.get("/api/health", (_req, res) => res.json({ ok: true, name: "beyond-si-cad", si: siStatus() }));

app.post("/api/si/plan", async (req, res) => {
  try {
    const { prompt, current } = req.body || {};
    if (!prompt || typeof prompt !== "string") return res.status(400).json({ error: "prompt required" });
    if (prompt.length > 4000) return res.status(400).json({ error: "prompt too long" });

    const kernel = await getReplicad();
    const regenerateFn = kernel
      ? async (plan) => regenerate(kernel, plan)
      : null;

    const result = await planWithLoop(req, { prompt, current, regenerate: regenerateFn });
    res.json({ ...result, planner: siStatus().endpoint || "offline" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

const dist = path.join(__dirname, "../dist");
app.use(express.static(dist));
app.get("*", (_req, res) => {
  res.sendFile(path.join(dist, "index.html"), (err) => {
    if (err) res.status(404).send("Client not built. Run npm run build.");
  });
});

const port = process.env.PORT || 8000;
app.listen(port, () => console.log(`Beyond SI-CAD listening on ${port}`));
