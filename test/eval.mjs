// Minimal evaluation harness for Beyond SI-CAD.
// Runs sample prompts through the planner (schema-only if no kernel/model) and reports results.
import { parsePlan } from "../shared/plan-schema.js";
import { BOTTLE, SHAFT } from "../shared/samples.js";

const samples = [
  { name: "bottle", plan: BOTTLE },
  { name: "shaft", plan: SHAFT },
];

let passed = 0;
for (const s of samples) {
  try {
    const p = parsePlan(s.plan);
    console.log(`OK  ${s.name}: ${p.bodies.length} body, ${p.bodies[0].features.length} feature(s)`);
    passed++;
  } catch (e) {
    console.log(`FAIL ${s.name}: ${e.message}`);
  }
}
console.log(`\n${passed}/${samples.length} sample plans valid.`);
process.exit(passed === samples.length ? 0 : 1);
