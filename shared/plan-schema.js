// Feature-plan schema for Beyond SI-CAD.
// Plan is data only. SI never emits code.
import { z } from "zod";

export const SCHEMA_ID = "beyond-si-cad/feature-plan@2";

const name = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]{0,40}$/);
const id = z.string().regex(/^[A-Za-z0-9_-]{1,40}$/);
export const Value = z.union([z.number().finite(), z.string().min(1).max(200)]);
const Vec2 = z.tuple([Value, Value]);
const Vec3 = z.tuple([Value, Value, Value]);

export const PlaneName = z.enum(["XY", "XZ", "YZ"]);
export const FaceName = z.enum(["top", "bottom", "front", "back", "left", "right"]);
export const EdgeSet = z.union([
  z.enum(["all", "vertical", "top", "bottom"]),
  z.object({ diameter: Value }),
]);
const Circular = z.object({ count: Value, startAngle: Value.optional() });

export const Profile = z.discriminatedUnion("type", [
  z.object({ type: z.literal("rect"), width: Value, height: Value, cornerRadius: Value.optional() }),
  z.object({ type: z.literal("circle"), diameter: Value }),
  z.object({ type: z.literal("slot"), length: Value, width: Value }),
  z.object({ type: z.literal("ring"), outer: Value, inner: Value }),
  z.object({ type: z.literal("text"), text: z.string().min(1).max(80), size: Value, font: z.enum(["sans", "sans-bold", "mono"]).default("sans-bold") }),
]);

const base = { id, name: z.string().max(60).optional(), suppressed: z.boolean().optional() };

export const Feature = z.discriminatedUnion("op", [
  z.object({
    ...base,
    op: z.literal("extrude"),
    profile: Profile,
    plane: PlaneName.default("XY"),
    at: Vec2.default([0, 0]),
    offset: Value.default(0),
    distance: Value,
    symmetric: z.boolean().optional(),
    twist: Value.optional(),
    circular: Circular.optional(),
    mode: z.enum(["new", "join", "cut"]).default("new"),
  }),
  z.object({
    ...base,
    op: z.literal("revolve"),
    profile: Profile,
    plane: PlaneName.default("XZ"),
    at: Vec2.default([0, 0]),
    axis: z.enum(["X", "Y", "Z"]).default("Z"),
    angle: Value.default(360),
    mode: z.enum(["new", "join", "cut"]).default("new"),
  }),
  z.object({
    ...base,
    op: z.literal("loft"),
    profiles: z.array(z.object({
      profile: Profile,
      plane: PlaneName.default("XY"),
      offset: Value.default(0),
      at: Vec2.default([0, 0]),
    })).min(2).max(8),
    mode: z.enum(["new", "join", "cut"]).default("new"),
  }),
  z.object({
    ...base,
    op: z.literal("hole"),
    face: FaceName.default("top"),
    diameter: Value,
    depth: Value.optional(),
    positions: z.array(Vec2).max(64).optional(),
    pattern: z.object({ countX: Value, countY: Value, spacingX: Value, spacingY: Value }).optional(),
    circular: Circular.extend({ diameter: Value }).optional(),
    countersink: z.object({ diameter: Value, angle: Value.default(90) }).optional(),
  }),
  z.object({ ...base, op: z.literal("fillet"), radius: Value, edges: EdgeSet.default("vertical") }),
  z.object({ ...base, op: z.literal("chamfer"), distance: Value, edges: EdgeSet.default("top") }),
  z.object({ ...base, op: z.literal("shell"), thickness: Value, openFace: FaceName.default("top") }),
]);

export const Parameter = z.object({
  name,
  expr: Value,
  unit: z.enum(["mm", "deg", "", "text"]).default("mm"),
  description: z.string().max(120).optional(),
});

export const Body = z.object({
  id,
  name: z.string().min(1).max(60),
  material: z.string().max(40).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  placement: Vec3.default([0, 0, 0]),
  visible: z.boolean().default(true),
  features: z.array(Feature).min(1).max(80),
});

export const Plan = z.object({
  schema: z.literal(SCHEMA_ID).default(SCHEMA_ID),
  name: z.string().min(1).max(80),
  units: z.literal("mm").default("mm"),
  parameters: z.array(Parameter).max(80).default([]),
  bodies: z.array(Body).min(1).max(12),
  assumptions: z.array(z.string().max(400)).max(24).default([]),
});

export function parsePlan(input) {
  const r = Plan.safeParse(input);
  if (r.success) return r.data;
  const issues = r.error.issues.slice(0, 12).map((i) => `${i.path.join(".") || "plan"}: ${i.message}`);
  throw new Error("Invalid feature plan — " + issues.join("; "));
}

export const PLAN_GUIDE = `
Return ONE JSON object matching schema "${SCHEMA_ID}".
Operations include extrude, revolve (profile + axis + angle), loft (2+ profiles on parallel planes),
hole, fillet, chamfer, shell. Use named parameters and expressions. Be honest with
"NOT SUPPORTED:" and "CHECK:" assumptions. Units are millimetres.
`;
