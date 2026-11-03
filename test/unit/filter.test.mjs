import assert from "node:assert/strict";
import { test } from "node:test";
import { translateFilter } from "../../src/filter.js";

// 2 Nov 2026, 12:00 in Indianapolis (EST, UTC-5).
const NOON = new Date("2026-11-02T17:00:00Z");
const t = (filter, now = NOON) => translateFilter(filter, { now });
const names = (filter, token) =>
  assert.throws(
    () => t(filter),
    (error) => error.code === "filter" && error.message.includes(`"${token}"`),
    filter,
  );

test("REQ-7-1 REQ-18-1: each token in the table translates to its IMAP key", () => {
  assert.equal(t("from:a"), 'FROM "a"');
  assert.equal(t("to:a"), 'TO "a"');
  assert.equal(t("subject:a"), 'SUBJECT "a"');
  assert.equal(t("newer_than:3d"), "SINCE 30-Oct-2026");
  assert.equal(t("older_than:3d"), "BEFORE 30-Oct-2026");
  assert.equal(t("is:unread"), "UNSEEN");
  assert.equal(t("is:read"), "SEEN");
  assert.equal(t("is:pinned"), "FLAGGED");
  assert.equal(t("word"), 'TEXT "word"');
});

test("REQ-7-1: every value is quoted, so it cannot break out of the search", () => {
  assert.equal(t("from:a\\b"), 'FROM "a\\\\b"');
  assert.equal(t("o'brien"), `TEXT "o'brien"`);
});

test("REQ-7-1: an empty filter matches everything", () => {
  for (const empty of ["", "   ", undefined, null]) assert.equal(translateFilter(empty, { now: NOON }), "ALL");
});

test("REQ-7-1: non-ASCII values declare UTF-8, and ASCII searches do not", () => {
  assert.equal(t("subject:café"), 'CHARSET UTF-8 SUBJECT "café"');
  assert.equal(t("from:a newer_than:1d josé"), 'CHARSET UTF-8 FROM "a" SINCE 1-Nov-2026 TEXT "josé"');
  assert.doesNotMatch(t("subject:cafe"), /CHARSET/);
});

test("REQ-7-2: multiple tokens combine with AND, as a run of IMAP keys in order", () => {
  assert.equal(t("from:a  to:b\tis:unread hello"), 'FROM "a" TO "b" UNSEEN TEXT "hello"');
  assert.doesNotMatch(t("from:a to:b"), /\bOR\b/);
});

test("REQ-7-3: OR, negation, grouping and quoting are errors that name the token", () => {
  names("from:a OR from:b", "OR");
  names("NOT from:a", "NOT");
  names("-from:a", "-from:a");
  names("-word", "-word");
  names('"two words"', '"two');
  names('from:"a', 'from:"a');
  names("{a b}", "{a");
  names("(a b)", "(a");
  names("|a", "|a");
});

test("REQ-7-3 REQ-7-4: unknown tokens are errors that name the token and are never dropped", () => {
  for (const token of ["cc:a", "label:x", "in:inbox", "has:attachment", "is:starred", "is:", "re:hello", "http://a.test", "__proto__:x", "constructor:x"]) {
    names(`from:a ${token}`, token);
  }
});

test("REQ-18-1: the token keys are exact: other cases and empty values are errors", () => {
  for (const token of ["FROM:a", "From:a", "IS:unread", "is:UNREAD", "from:", "to:", "subject:"]) names(token, token);
});

test("REQ-7-4: control characters are refused and name the token", () => {
  assert.throws(() => t("from:a\0b"), /unsupported filter token/);
});

test("REQ-7-6: the only supported date unit is d", () => {
  for (const token of ["newer_than:3", "newer_than:3h", "newer_than:1w", "newer_than:1m", "newer_than:1y", "newer_than:d", "newer_than:-1d", "newer_than:3D", "older_than:2w", "newer_than:"]) {
    names(token, token);
  }
});

test("REQ-7-6: an out-of-range day count is an error, not a bad date", () => {
  names("newer_than:99999999d", "newer_than:99999999d");
  names(`older_than:${"9".repeat(30)}d`, `older_than:${"9".repeat(30)}d`);
});

test("REQ-7-5 REQ-7-6: today is the Indianapolis date when UTC has already moved on", () => {
  // 23:30 on 2 Nov in Indianapolis is 04:30 on 3 Nov UTC.
  assert.equal(t("newer_than:0d", new Date("2026-11-03T04:30:00Z")), "SINCE 2-Nov-2026");
  assert.equal(t("newer_than:3d", new Date("2026-11-03T04:30:00Z")), "SINCE 30-Oct-2026");
});

test("REQ-7-5: the Indianapolis date rolls at local midnight in EST and in EDT", () => {
  assert.equal(t("newer_than:0d", new Date("2026-01-15T04:59:00Z")), "SINCE 14-Jan-2026");
  assert.equal(t("newer_than:0d", new Date("2026-01-15T05:00:00Z")), "SINCE 15-Jan-2026");
  assert.equal(t("newer_than:0d", new Date("2026-07-15T03:59:00Z")), "SINCE 14-Jul-2026");
  assert.equal(t("newer_than:0d", new Date("2026-07-15T04:00:00Z")), "SINCE 15-Jul-2026");
});

test("REQ-7-5: day subtraction crosses DST changes and month and year ends by calendar date", () => {
  assert.equal(t("newer_than:7d", new Date("2026-11-03T17:00:00Z")), "SINCE 27-Oct-2026");
  assert.equal(t("newer_than:7d", new Date("2026-03-10T17:00:00Z")), "SINCE 3-Mar-2026");
  assert.equal(t("newer_than:3d", new Date("2027-01-01T17:00:00Z")), "SINCE 29-Dec-2026");
  assert.equal(t("newer_than:1d", new Date("2028-03-01T17:00:00Z")), "SINCE 29-Feb-2028");
});

test("REQ-7-7: SINCE is a date, not a time, so mail from early on the boundary date is included", () => {
  assert.equal(t("newer_than:3d", new Date("2026-11-03T04:30:00Z")), t("newer_than:3d", new Date("2026-11-02T05:30:00Z")));
  assert.doesNotMatch(t("newer_than:3d"), /:\d\d/);
});

test("REQ-7-8: from: is IMAP FROM with the value unchanged, so the server matches any part of the header", () => {
  assert.equal(t("from:mailer-daemon"), 'FROM "mailer-daemon"');
  assert.equal(t("from:Jane"), 'FROM "Jane"');
  assert.equal(t("from:jane@acme.example"), 'FROM "jane@acme.example"');
});

test("REQ-7-9: bare words translate to IMAP TEXT", () => {
  assert.equal(t("delivery failed"), 'TEXT "delivery" TEXT "failed"');
});

test("REQ-14-14 REQ-7-10: every filter string the skills pass translates", () => {
  const cases = {
    "from:mailer-daemon newer_than:3d": 'FROM "mailer-daemon" SINCE 30-Oct-2026',
    "from:postmaster newer_than:3d": 'FROM "postmaster" SINCE 30-Oct-2026',
    "newer_than:3d": "SINCE 30-Oct-2026",
    "newer_than:7d": "SINCE 26-Oct-2026",
    "to:jane@acme.example": 'TO "jane@acme.example"',
  };
  for (const [filter, expected] of Object.entries(cases)) assert.equal(t(filter), expected, filter);
});

test("REQ-7-11: the send confirmation and reply detection filters translate", () => {
  assert.equal(t("to:jane@acme.example newer_than:2d"), 'TO "jane@acme.example" SINCE 31-Oct-2026');
  assert.equal(t("from:jane@acme.example"), 'FROM "jane@acme.example"');
});

test("REQ-14-13: the MAILER-DAEMON and postmaster filters ask the server for a FROM match", () => {
  assert.equal(t("from:mailer-daemon"), 'FROM "mailer-daemon"');
  assert.equal(t("from:postmaster"), 'FROM "postmaster"');
});
