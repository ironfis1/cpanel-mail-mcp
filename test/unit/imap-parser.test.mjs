import assert from "node:assert/strict";
import { test } from "node:test";
import { parseBodyStructure, parseCopyUid, parseFetchResponse, parseHeaders, parseListResponse } from "../../src/imap/parser.js";

const enc = new TextEncoder();

test("REQ-4-3: LIST parses atoms, quoted names with escapes, NIL delimiters and literals", () => {
  assert.equal(parseListResponse({ text: '* LIST (\\HasNoChildren) "." INBOX', literals: [] }).path, "INBOX");
  const quoted = parseListResponse({ text: '* LIST (\\Junk) NIL "a\\"b\\\\c"', literals: [] });
  assert.equal(quoted.path, 'a"b\\c');
  assert.equal(quoted.delimiter, null);
  assert.equal(quoted.specialUse, "\\Junk");
  const literal = parseListResponse({ text: '* LIST () "." \0LIT0\0', literals: [enc.encode("Odd (name)")] });
  assert.equal(literal.path, "Odd (name)");
});

test("REQ-4-3: a malformed LIST line is an error, not a silently missing folder", () => {
  assert.throws(() => parseListResponse({ text: '* LIST (\\Junk "." "unterminated', literals: [] }), /malformed/);
  assert.throws(() => parseListResponse({ text: "* LIST () \0LIT9\0", literals: [] }), /malformed/);
});

test("REQ-4-3: FETCH items parse in any order, with a section atom holding parentheses", () => {
  const message = parseFetchResponse({
    text: '* 12 FETCH (BODY[HEADER.FIELDS (FROM SUBJECT)] \0LIT0\0 FLAGS (\\Seen $Forwarded) UID 77 RFC822.SIZE 900 INTERNALDATE "02-Nov-2026 12:00:00 +0000")',
    literals: [enc.encode("From: a\r\n\r\n")],
  });
  assert.equal(message.seq, 12);
  assert.equal(message.uid, 77);
  assert.deepEqual(message.flags, ["\\Seen", "$Forwarded"]);
  assert.equal(message.size, 900);
  assert.equal(message.internalDate, "02-Nov-2026 12:00:00 +0000");
  assert.equal(new TextDecoder().decode(message.sections["HEADER.FIELDS (FROM SUBJECT)"]), "From: a\r\n\r\n");
});

test("REQ-4-4: a partial section records its origin, and quoted or NIL section bodies are handled", () => {
  const partial = parseFetchResponse({ text: '* 1 FETCH (UID 1 BODY[1.2]<1024> "abc")', literals: [] });
  assert.deepEqual([...partial.sections["1.2"]], [97, 98, 99]);
  assert.equal(partial.origins["1.2"], 1024);
  assert.equal(parseFetchResponse({ text: "* 1 FETCH (UID 1 BODY[2] NIL)", literals: [] }).sections["2"], null);
});

test("REQ-4-4: a FLAGS look-alike inside a quoted string does not confuse the parser", () => {
  const message = parseFetchResponse({ text: '* 1 FETCH (INTERNALDATE "FLAGS (\\Fake)" UID 1 FLAGS ())', literals: [] });
  assert.deepEqual(message.flags, []);
});

test("REQ-4-4: BODYSTRUCTURE handles a single part, a text part's lines and part 1 numbering", () => {
  const single = parseBodyStructure(["TEXT", "PLAIN", ["CHARSET", "UTF-8"], null, null, "7BIT", "12", "3"]);
  assert.equal(single.part, "1");
  assert.equal(single.type, "text");
  assert.equal(single.params.charset, "UTF-8");
  assert.equal(single.size, 12);
  assert.equal(single.lines, 3);
  assert.equal(single.disposition, null);
  assert.throws(() => parseBodyStructure("nope"), /malformed/);
});

test("REQ-4-3: headers unfold, lower-case and accept bytes", () => {
  const headers = parseHeaders(enc.encode("Subject: a\r\n b\r\nX-Y: z: w\r\n\r\n"));
  assert.deepEqual(headers, { subject: "a b", "x-y": "z: w" });
});

test("REQ-4-5: COPYUID gives the destination UID, and its absence is not an error", () => {
  assert.deepEqual(parseCopyUid("* OK [COPYUID 5 7 42] Moved"), { uidValidity: "5", uid: 42 });
  assert.deepEqual(parseCopyUid("A1 OK Done"), { uidValidity: null, uid: null });
});
