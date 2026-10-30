# Beyond SI-CAD — Architecture

## Goal
A Super Intelligent parametric CAD assistant that is more reliable at producing buildable mechanical parts than a general frontier LLM used one-shot.

## Closed-loop planner

```
User prompt (+ optional current plan summary)
        │
        ▼
Model Serving (temperature 0, schema guide + few-shot)
        │
        ▼
Extract + Zod parse
        │
        ▼
regenerate(plan)  ←────────────────────────────────┐
        │                                     │
        ▼                                     │
Feature errors or invalid solid? ───────────────────────┘
        │  yes (turn < 3)
        ▼
Feed exact diagnostics back to model
        │
        ▼
Revised plan
        │
        ▼
Return plan + assumptions + verification report
```

Only a plan that the kernel has accepted (or an explicit partial plan with `NOT SUPPORTED` / `CHECK` flags) is shown to the user for approval.

## Plan schema extensions

Revolve and loft are first-class operations in `shared/plan-schema.js`:

- `revolve`: profile, plane, axis ("X" | "Y" | "Z" or point+direction), angle (default 360), mode.
- `loft`: ordered list of profiles on parallel planes (or explicit offsets), optional guide curves later.

Both use the same expression system and body/feature structure as extrude.

## Why the kernel stays in the browser

- No native dependencies in the App container.
- Sub-second interaction for simple parts; multi-second for complex (impeller-class) is acceptable for a spike.
- The closed-loop call can be server-side (Node replicad) for the planner, or the browser can return diagnostics. Server-side keeps the loop fast and consistent.

## NIPR / DoW constraints

- Model Serving endpoint only. No external APIs.
- UC Volumes for persistence.
- Plans are data. No `eval`. Worker CSP isolates the WASM.
- Service themes and classification banner support carried forward.
