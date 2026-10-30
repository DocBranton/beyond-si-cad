# Beyond SI-CAD — Development Contract

**Goal:** Super Intelligent parametric CAD that is more reliable than one-shot LLMs by closing the loop with a real geometry kernel.

## MVP
- Closed-loop SI planner (propose → regenerate → diagnose → revise, max 3 turns).
- Feature plan schema with extrude, revolve, loft, hole, fillet, chamfer, shell.
- Deterministic regeneration on Open CASCADE (replicad WASM / Node).
- Explicit human approval before build.
- Databricks App deployment, internal Model Serving only, UC Volumes for projects.
- STEP / STL export of verified solids.

## Explicit non-goals for this stage
- Full constrained sketcher (profiles are parametric primitives).
- Assemblies with mates.
- Drawings / BOM.
- External APIs.

## Definition of better
A plan is better when:
1. It passes schema validation.
2. After regeneration, every feature is in state "ok" and the solid is valid.
3. Assumptions clearly flag anything that could not be satisfied.
4. The user can edit parameters and regenerate deterministically.

See ARCHITECTURE.md for the loop design.
