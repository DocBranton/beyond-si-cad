// Deterministic regeneration for Beyond SI-CAD.
// Supports extrude, revolve, loft, hole, fillet, chamfer, shell via replicad/Open CASCADE.
// Runs in Node for the planner loop and in a Web Worker for the browser.

import { evaluate, resolveParameters } from "../../shared/expr.js";

export const MATERIALS = {
  "Aluminum 6061": 2.7,
  "Aluminum 7075": 2.81,
  "Steel 1018": 7.87,
  "Stainless 316": 8.0,
  "Titanium Ti-6Al-4V": 4.43,
  PETG: 1.27,
  PLA: 1.24,
  ABS: 1.04,
  "Nylon PA12": 1.01,
};

function positive(name, v) {
  if (!(v > 0)) throw new Error(`${name} must be greater than 0 (got ${v})`);
  return v;
}

function drawProfile(r, p, num) {
  if (p.type === "rect") {
    const w = positive("width", num(p.width));
    const h = positive("height", num(p.height));
    const cr = p.cornerRadius === undefined ? 0 : num(p.cornerRadius);
    if (cr < 0 || cr * 2 >= Math.min(w, h)) throw new Error("corner radius too large");
    return cr > 0 ? r.drawRoundedRectangle(w, h, cr) : r.drawRectangle(w, h);
  }
  if (p.type === "circle") return r.drawCircle(positive("diameter", num(p.diameter)) / 2);
  if (p.type === "slot") {
    const l = positive("length", num(p.length));
    const w = positive("width", num(p.width));
    if (l <= w) throw new Error("slot length must be greater than width");
    return r.drawRoundedRectangle(l, w, w / 2 - 1e-4);
  }
  if (p.type === "ring") {
    const o = positive("outer", num(p.outer));
    const i = positive("inner", num(p.inner));
    if (i >= o) throw new Error("ring inner must be smaller than outer");
    return r.drawCircle(o / 2).cut(r.drawCircle(i / 2));
  }
  if (p.type === "text") throw new Error("text profiles not yet implemented in this engine");
  throw new Error(`unknown profile ${p.type}`);
}

function applyFeature(r, shape, f, num) {
  switch (f.op) {
    case "extrude": {
      const dist = num(f.distance);
      if (dist === 0) throw new Error("distance must not be 0");
      const [u, v] = (f.at || [0, 0]).map(num);
      const off = num(f.offset || 0);
      const drawing = drawProfile(r, f.profile, num).translate(u, v);
      const twist = f.twist === undefined ? 0 : num(f.twist);
      let solid = drawing.sketchOnPlane(f.plane || "XY", off).extrude(dist, twist ? { twistAngle: twist } : undefined);
      if (f.mode === "cut" && shape) return { shape: shape.cut(solid) };
      if (shape && f.mode !== "new") return { shape: shape.fuse(solid) };
      return { shape: solid };
    }
    case "revolve": {
      const angle = num(f.angle ?? 360);
      const [u, v] = (f.at || [0, 0]).map(num);
      const drawing = drawProfile(r, f.profile, num).translate(u, v);
      const axis = f.axis || "Z";
      // replicad: sketch.revolve(angle, { origin, direction }) or similar; fallback to documented API
      let solid;
      try {
        solid = drawing.sketchOnPlane(f.plane || "XZ").revolve(angle);
      } catch {
        // Alternative path if revolve signature differs
        solid = drawing.sketchOnPlane(f.plane || "XZ").revolve(angle, [0, 0, 0], axis === "X" ? [1, 0, 0] : axis === "Y" ? [0, 1, 0] : [0, 0, 1]);
      }
      if (f.mode === "cut" && shape) return { shape: shape.cut(solid) };
      if (shape && f.mode !== "new") return { shape: shape.fuse(solid) };
      return { shape: solid };
    }
    case "loft": {
      if (!f.profiles || f.profiles.length < 2) throw new Error("loft needs at least 2 profiles");
      const sketches = f.profiles.map((p) => {
        const [u, v] = (p.at || [0, 0]).map(num);
        const off = num(p.offset || 0);
        return drawProfile(r, p.profile, num).translate(u, v).sketchOnPlane(p.plane || "XY", off);
      });
      let solid = sketches[0].loftWith(...sketches.slice(1));
      if (f.mode === "cut" && shape) return { shape: shape.cut(solid) };
      if (shape && f.mode !== "new") return { shape: shape.fuse(solid) };
      return { shape: solid };
    }
    case "hole": {
      if (!shape) throw new Error("hole needs an existing solid");
      const d = positive("diameter", num(f.diameter));
      // Simplified: single through hole at origin of face for foundation; expand later
      const solid = r.makeCylinder(d / 2, 1000, [0, 0, -1], [0, 0, 1]);
      return { shape: shape.cut(solid) };
    }
    case "fillet": {
      if (!shape) throw new Error("fillet needs an existing solid");
      return { shape: shape.fillet(positive("radius", num(f.radius))) };
    }
    case "chamfer": {
      if (!shape) throw new Error("chamfer needs an existing solid");
      return { shape: shape.chamfer(positive("distance", num(f.distance))) };
    }
    case "shell": {
      if (!shape) throw new Error("shell needs an existing solid");
      return { shape: shape.shell(positive("thickness", num(f.thickness))) };
    }
    default:
      throw new Error(`unknown operation ${f.op}`);
  }
}

export function regenerate(r, plan, opts = {}) {
  const { values, errors: paramErrors } = resolveParameters(plan.parameters || []);
  const lookup = (n) => {
    if (n in values) return values[n];
    if (n in paramErrors) throw new Error(`parameter ${n} invalid: ${paramErrors[n]}`);
    throw new Error(`unknown parameter ${n}`);
  };
  const num = (v) => evaluate(v, lookup);
  const bodies = [];
  const features = {};
  for (const body of plan.bodies) {
    let shape = null;
    let failed = false;
    for (const f of body.features) {
      if (f.suppressed) { features[f.id] = { state: "suppressed" }; continue; }
      if (failed) { features[f.id] = { state: "skipped", message: "earlier feature failed" }; continue; }
      try {
        const out = applyFeature(r, shape, f, num);
        shape = out.shape;
        features[f.id] = { state: "ok" };
      } catch (e) {
        failed = true;
        features[f.id] = { state: "error", message: e.message || String(e) };
      }
    }
    bodies.push({ id: body.id, name: body.name, shape, failed });
  }
  return { bodies, features, parameters: values, parameterErrors: paramErrors, valid: bodies.every((b) => !b.failed && b.shape) };
}
