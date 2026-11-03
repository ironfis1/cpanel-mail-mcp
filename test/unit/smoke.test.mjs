import assert from "node:assert/strict";
import { test } from "node:test";

test("REQ-14-1: smoke: the node --test runner executes this test", () => {
  assert.equal(1 + 1, 2);
});
