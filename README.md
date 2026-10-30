# Beyond SI-CAD

**Super Intelligent parametric CAD for the DoW — better than one-shot LLMs.**

A Databricks App that turns design intent into verified, editable B-Rep solids. The geometry kernel (Open CASCADE via WASM) runs in the browser. The SI assistant proposes schema-validated feature plans, then iterates against the real kernel until the plan builds cleanly or explicitly reports what cannot be done.

> Status: working foundation. Closed-loop planner skeleton + regeneration engine with revolve and loft.

## Why this is better than a general Claude-style prompt

| Capability | General LLM | Beyond SI-CAD |
|---|---|---|
| Output form | Free-form text or code | Schema-validated feature-plan JSON only |
| Geometry check | None | Live regenerate + feature-level diagnostics in the loop |
| Failure handling | Hallucinated or broken geometry | Exact kernel errors fed back; max 3 turns |
| Human control | Implicit | Explicit Approve & build; assumptions flagged |
| External APIs | Usually required | Internal Model Serving only (NIPR-safe) |
| Editable result | Code or mesh | Parametric feature timeline + parameters |

The SI never emits executable code. It emits data. The kernel is the judge.

## Architecture

```
Browser (React + Three.js + OCCT WASM worker)
  └─ plan (JSON) ◄─► regenerate / validate / mesh
          │
          ▼
Databricks App (Express / AppKit)
  ├─ /api/si/plan   → Model Serving (closed-loop)
  └─ /api/projects  → Unity Catalog Volume
```

- **Plan is the system of record** (`shared/plan-schema.js`). Zod-validated. Expressions over named parameters.
- **Closed-loop planner** (`server/planner.js`): propose → regenerate → if errors, feed diagnostics back → revise (max 3 turns).
- **Kernel** (`src/engine/regenerate.js`): Open CASCADE via replicad. Supports extrude, **revolve**, **loft**, hole, fillet, chamfer, shell.
- **Samples** (`shared/samples.js`): Bottle (loft) and Shaft (revolve).

## Run locally

```bash
npm install
npm run dev
```

Without a `SERVING_ENDPOINT` the planner reports that the model is not configured. Wire Model Serving and inject a `regenerate` function for the full loop.

## Deploy

```bash
databricks bundle deploy -t dev
databricks bundle run beyond_si_cad -t dev
```

## Next

1. Wire Model Serving in `server/planner.js` and inject the regeneration function so the loop is live.
2. Complete hole / pattern / edge-selection fidelity in the engine.
3. Add the React UI shell and Three.js viewport.
4. Evaluation harness (prompt → plan → kernel checks).
5. Constrained sketcher that emits profiles the existing ops can consume.

See `docs/ARCHITECTURE.md` and `docs/DEVELOPMENT_CONTRACT.md`.
