import assert from "node:assert/strict";
import { test } from "node:test";
import { callStaging, skip, testMailboxes } from "./harness.mjs";

test("REQ-14-2: staging Worker refuses a call without the bearer token", { skip }, async () => {
  const response = await callStaging("/", { authenticated: false });
  assert.equal(response.status, 401);
});

test("REQ-14-2: staging Worker serves only the test mailboxes", { skip }, async () => {
  const response = await callStaging();
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.environment, "staging");
  assert.deepEqual(
    body.mailboxes.map((m) => m.id).sort(),
    testMailboxes().map((m) => m.id).sort(),
  );
});

for (const { id, host } of testMailboxes()) {
  test(`REQ-14-3 REQ-14-4: staging Worker has ${id} on ${host}`, { skip }, async () => {
    const response = await callStaging();
    assert.equal(response.status, 200);
    const { mailboxes } = await response.json();
    assert.deepEqual(mailboxes.find((m) => m.id === id), { id, host });
  });
}
