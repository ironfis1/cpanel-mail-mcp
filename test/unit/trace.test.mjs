import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { repoFile } from "../helpers/wrangler-config.mjs";

const fixture = (name) => fileURLToPath(repoFile(`test/fixtures/${name}`));

function trace(...args) {
  const script = fileURLToPath(repoFile("scripts/trace.mjs"));
  return spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
}

test("REQ-14-1: trace.mjs finds exactly 277 REQs in the real spec", () => {
  const { status, stdout } = trace();
  assert.equal(status, 0, stdout);
  assert.match(stdout, /^Spec: 277 REQs/m);
  assert.match(stdout, /^Matrix: 277 rows/m);
});

test("REQ-14-1: every C0 row is filled and covered", () => {
  const { status, stdout } = trace("--chunk", "C0", "--strict");
  assert.equal(status, 0, stdout);
  assert.match(stdout, /^C0: 7\/7 rows filled, 0 uncovered/m);
});

test("REQ-14-1: --strict passes a chunk with a named test and a filled manual row", () => {
  const { status, stdout } = trace("--root", fixture("trace"), "--chunk", "C0", "--strict");
  assert.equal(status, 0, stdout);
  assert.match(stdout, /^C0: 2\/2 rows filled, 0 uncovered/m);
});

test("REQ-14-1: --strict fails a chunk with a blank row", () => {
  const { status, stdout } = trace("--root", fixture("trace"), "--chunk", "C1", "--strict");
  assert.equal(status, 1);
  assert.match(stdout, /REQ-1-3: blank/);
});

test("REQ-14-1: --strict fails an automated row with no test", () => {
  const { status, stdout } = trace("--root", fixture("trace"), "--chunk", "C2", "--strict");
  assert.equal(status, 1);
  assert.match(stdout, /REQ-1-4: no test named with this REQ/);
});

test("REQ-14-1: a skipped test does not count as coverage", () => {
  const { status, stdout } = trace("--root", fixture("trace"), "--chunk", "C3", "--strict");
  assert.equal(status, 1);
  assert.match(stdout, /REQ-1-5: no test named with this REQ/);
});

test("REQ-14-1: --strict fails when Verified by names a file without the test", () => {
  const { status, stdout } = trace("--root", fixture("trace"), "--chunk", "C4", "--strict");
  assert.equal(status, 1);
  assert.match(stdout, /REQ-1-6: Verified by names no file with its test/);
});

test("REQ-14-1: --strict fails a chunk with no rows", () => {
  const { status, stdout } = trace("--root", fixture("trace"), "--chunk", "C9", "--strict");
  assert.equal(status, 1);
  assert.match(stdout, /C9: no rows/);
});

test("REQ-14-1: without --strict uncovered rows report but exit 0", () => {
  const { status, stdout } = trace("--root", fixture("trace"), "--chunk", "C1");
  assert.equal(status, 0);
  assert.match(stdout, /^C1: 0\/1 rows filled, 1 uncovered/m);
});

test("REQ-14-1: spec, matrix and test names that disagree always exit 1", () => {
  const { status, stdout } = trace("--root", fixture("trace-broken"));
  assert.equal(status, 1);
  assert.match(stdout, /REQ-1-2: in the spec, no matrix row/);
  assert.match(stdout, /REQ-1-9: matrix row, not in the spec/);
  assert.match(stdout, /REQ-7-7: cited by a test, not in the spec/);
});
