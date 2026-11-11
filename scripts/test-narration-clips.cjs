const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const filename = path.resolve(__dirname, "../src/helpers/narration-clips.ts");
const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const helper = new Module(filename, module);
helper.filename = filename;
helper.paths = module.paths;
helper._compile(compiled, filename);
const { readNarrationPlan } = helper.exports;
const wrap = (clips) => `const NARRATION_CLIPS = ${JSON.stringify(clips)};`;
const clips = [
  { startSeconds: 0, endSeconds: 6, text: "First scene" },
  { startSeconds: 6, endSeconds: 24, text: "Second scene" },
];

// Regression: an earlier 8-second estimate must not reject a 24-second plan.
const result = readNarrationPlan(wrap(clips));
assert.equal(result.at(-1).endSeconds, 24);
assert.equal(Math.round(result.at(-1).endSeconds * 30), 720);
for (const startSeconds of [5, 7]) {
  assert.throws(() => readNarrationPlan(wrap([
    clips[0], { ...clips[1], startSeconds },
  ])), /contiguous/);
}
assert.throws(() => readNarrationPlan(wrap([
  { ...clips[0], endSeconds: 0 },
])));
assert.throws(() => readNarrationPlan(wrap([
  { ...clips[0], endSeconds: 301 },
])), /300 seconds/);
assert.throws(() => readNarrationPlan(wrap([
  { ...clips[0], text: "" },
])));
assert.throws(() => readNarrationPlan("const OTHER = [];"), /missing/);
console.log("Narration timeline regression checks passed.");
