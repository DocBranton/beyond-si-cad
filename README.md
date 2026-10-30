# Beyond SI-CAD

**Super Intelligent parametric CAD for the DoW — better than one-shot LLMs.**

A Databricks App that turns design intent into verified, editable B-Rep solids. The geometry kernel (Open CASCADE via WASM) runs in the browser. The SI assistant proposes schema-validated feature plans, then iterates against the real kernel until the plan builds cleanly or explicitly reports what cannot be done.

> Status: foundation. Builds on the SI-CAD Workbench feasibility spike with a closed-loop planner.

## Why this is better than a general Claude-style prompt

| Capability | General LLM (Claude etc.) | Beyond SI-CAD |
|---|---|---|
| Output form | Free-form text or code | Schema-validated feature-plan JSON only |
| Geometry check | None | Live regenerate + B-Rep validation in the loop |
| Failure handling | Hallucinated or broken geometry | Exact kernel diagnostics fed back; max 3 turns |
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
- **Closed-loop planner** (`server/planner.js`): propose → regenerate → if errors, feed diagnostics back → revise (max 3 turns) → only return a plan the kernel accepted, or a plan with explicit `NOT SUPPORTED` / `CHECK` flags.
- **Kernel**: Open CASCADE (replicad) in a Web Worker. Deterministic regeneration. Never throws on bad input.
- **Storage**: UC Volumes for projects and revision history.
- **Themes**: Air Force (default), Army, Navy, Marine Corps.

## Current operations (schema)

- Extrude (rect / circle / slot / ring / text; twist; circular pattern; new/join/cut)
- **Revolve** (profile + axis + angle) — first-class
- **Loft** (two or more profiles on parallel planes) — first-class
- Hole (patterns, bolt circle, countersink)
- Fillet, chamfer, shell

Regeneration for revolve and loft is wired into the schema and planner contract; full kernel implementation follows the same path as the existing extrude engine.

## Run locally

```bash
npm install
npm run dev
```

Without a `SERVING_ENDPOINT` the offline planner is used.

## Deploy

```bash
databricks bundle deploy -t dev
databricks bundle run beyond_si_cad -t dev
```

Set `SERVING_ENDPOINT` to an approved internal Model Serving endpoint and `PROJECTS_VOLUME` to a Unity Catalog Volume.

## Next

1. Complete revolve and loft in the regeneration engine.
2. Constrained sketcher that emits profiles the existing ops can consume.
3. Evaluation harness (prompt → plan → kernel checks) so improvements are measurable.
4. Optional fine-tune once approved (prompt, final plan) pairs accumulate.

See `docs/ARCHITECTURE.md` for the closed-loop design and `docs/DEVELOPMENT_CONTRACT.md` for scope.
