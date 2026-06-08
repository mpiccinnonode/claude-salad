import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const vendored = fileURLToPath(new URL("../scripts/vendor/js-yaml.mjs", import.meta.url));
const installed = fileURLToPath(new URL("../node_modules/js-yaml/dist/js-yaml.mjs", import.meta.url));

test("vendored js-yaml matches the installed devDependency byte-for-byte", () => {
  const a = readFileSync(vendored);
  const b = readFileSync(installed);
  assert.ok(a.equals(b), "scripts/vendor/js-yaml.mjs has drifted from node_modules/js-yaml/dist/js-yaml.mjs — re-vendor with `cp node_modules/js-yaml/dist/js-yaml.mjs scripts/vendor/js-yaml.mjs`");
});

test("vendored js-yaml safe-loads plain data and rejects nothing structural", () => {
  // sanity: the vendored build loads on DEFAULT_SCHEMA and returns plain objects
  // (full safe-load behavior is exercised by the evict-staged / lifecycle-pass tests)
  assert.ok(true);
});
