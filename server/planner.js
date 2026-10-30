// Closed-loop SI planner for Beyond SI-CAD.
// Propose → regenerate against kernel → feed diagnostics back → revise (max 3 turns).
// Only a kernel-accepted plan (or an explicit partial) is returned for user approval.
import { parsePlan, PLAN_GUIDE } from "../shared/plan-schema.js";

const SYSTEM = `You are the planning component of Beyond SI-CAD, a parametric mechanical CAD workbench.
You convert design intent into a feature plan. You never write code.
${PLAN_GUIDE}
When given kernel diagnostics, revise the plan to fix the reported errors. Do not invent unsupported operations.`;

export async function planWithLoop(req, { prompt, current, regenerate }) {
  // regenerate is injected so the planner can call the kernel (server-side or via worker result).
  // In the foundation this is a stub; wire to replicad regenerate when the engine is present.
  const maxTurns = 3;
  let messages = [
    { role: "system", content: SYSTEM },
    { role: "user", content: current ? `Current plan:\n${JSON.stringify(current)}\n\nRequest: ${prompt}` : `Request: ${prompt}` },
  ];

  let lastPlan = null;
  let lastReport = null;

  for (let turn = 0; turn < maxTurns; turn++) {
    const text = await callModel(req, messages);
    let plan;
    try {
      plan = parsePlan(extractJson(text));
    } catch (e) {
      messages.push({ role: "assistant", content: text }, { role: "user", content: `Schema error: ${e.message}. Return corrected JSON only.` });
      continue;
    }

    if (!regenerate) {
      return { plan, turns: turn + 1, verified: false, report: "kernel not wired" };
    }

    const report = await regenerate(plan);
    lastPlan = plan;
    lastReport = report;

    const errors = Object.entries(report.features || {}).filter(([, f]) => f.state === "error");
    if (errors.length === 0 && report.valid !== false) {
      return { plan, turns: turn + 1, verified: true, report };
    }

    const diag = errors.map(([id, f]) => `${id}: ${f.message}`).join("; ") || "validation failed";
    messages.push(
      { role: "assistant", content: text },
      { role: "user", content: `Kernel rejected the plan: ${diag}. Revise and return corrected JSON only.` },
    );
  }

  return { plan: lastPlan, turns: maxTurns, verified: false, report: lastReport, note: "max turns reached; review assumptions" };
}

function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object");
  return JSON.parse(text.slice(start, end + 1));
}

async function callModel(req, messages) {
  const endpoint = process.env.SERVING_ENDPOINT;
  if (!endpoint) throw new Error("SERVING_ENDPOINT not set");
  // Wire to Databricks Model Serving via the app's auth (same pattern as si-cad-workbench).
  // Placeholder for the foundation commit.
  throw new Error("Model Serving call not yet wired — set SERVING_ENDPOINT and implement api()");
}
