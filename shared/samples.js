// Sample plans that exercise revolve and loft.

export const BOTTLE = {
  schema: "beyond-si-cad/feature-plan@2",
  name: "Bottle",
  units: "mm",
  parameters: [
    { name: "base_dia", expr: 60, unit: "mm" },
    { name: "neck_dia", expr: 28, unit: "mm" },
    { name: "height", expr: 180, unit: "mm" },
  ],
  bodies: [{
    id: "bottle",
    name: "Bottle",
    material: "PETG",
    features: [{
      id: "body",
      op: "loft",
      profiles: [
        { profile: { type: "circle", diameter: "base_dia" }, plane: "XY", offset: 0 },
        { profile: { type: "circle", diameter: "neck_dia" }, plane: "XY", offset: "height" },
      ],
    }],
  }],
  assumptions: ["Simple lofted bottle from base to neck."],
};

export const SHAFT = {
  schema: "beyond-si-cad/feature-plan@2",
  name: "Shaft",
  units: "mm",
  parameters: [
    { name: "dia", expr: 20, unit: "mm" },
    { name: "length", expr: 100, unit: "mm" },
  ],
  bodies: [{
    id: "shaft",
    name: "Shaft",
    material: "Steel 1018",
    features: [{
      id: "revolve",
      op: "revolve",
      profile: { type: "rect", width: "length", height: "dia / 2" },
      plane: "XZ",
      axis: "Z",
      angle: 360,
    }],
  }],
  assumptions: ["Revolved shaft from a rectangular profile."],
};
