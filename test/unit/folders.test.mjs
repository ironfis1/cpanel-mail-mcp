// Uses the real LIST responses recorded from both hosts in C1.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { loadRegistry } from "../../src/accounts.js";
import { FolderMap, LOGICAL_NAMES, parseFolderAddress } from "../../src/folders.js";
import { parseListResponse } from "../../src/imap/parser.js";
import { RequestSessions } from "../../src/imap/session.js";
import { account, FAKE_PASSWORD, fakeServer } from "../helpers/fake-imap.mjs";
import { repoFile, wranglerConfig } from "../helpers/wrangler-config.mjs";

const recordedList = (host) =>
  readFileSync(repoFile(`test/fixtures/imap/${host}/03-list.imap`), "latin1")
    .split("\r\n")
    .filter((line) => line.startsWith("* LIST"))
    .map((text) => parseListResponse({ text, literals: [] }));
const folder = (path, ...flags) => ({ path, delimiter: ".", flags, specialUse: null });
const mapping = (map) => Object.fromEntries(LOGICAL_NAMES.map((name) => [name, map.path(name)]));

const EXPECTED = {
  Inbox: "INBOX",
  Sent: "INBOX.Sent",
  Drafts: "INBOX.Drafts",
  Archive: "INBOX.Archive",
  Trash: "INBOX.Trash",
  Junk: "INBOX.spam",
};

test("REQ-5-1 REQ-5-6: the real cPanel A LIST resolves to the folder map in the spec", () => {
  assert.deepEqual(mapping(new FolderMap(recordedList("server128"))), EXPECTED);
});

test("REQ-2-4 REQ-5-1: the real cPanel B LIST resolves the same way", () => {
  assert.deepEqual(mapping(new FolderMap(recordedList("server223"))), EXPECTED);
});

for (const host of ["server128", "server223"]) {
  test(`REQ-5-2 REQ-5-6: on ${host} flagged INBOX.spam is Junk and unflagged INBOX.Junk gets no logical name`, () => {
    const list = recordedList(host);
    assert.ok(list.some((f) => f.path === "INBOX.Junk"), "the duplicate junk folder is in the fixture");
    const map = new FolderMap(list);
    assert.equal(map.path("Junk"), "INBOX.spam");
    assert.ok(!Object.values(mapping(map)).includes("INBOX.Junk"));
  });
}

test("REQ-5-5: cPanel A folders use the INBOX. prefix with . as delimiter and advertise SPECIAL-USE", () => {
  const list = recordedList("server128");
  for (const { path, delimiter } of list) {
    assert.equal(delimiter, ".");
    assert.ok(path === "INBOX" || path.startsWith("INBOX."), path);
  }
  const capability = readFileSync(repoFile("test/fixtures/imap/server128/02-capability.imap"), "latin1");
  assert.match(capability, /\bSPECIAL-USE\b/);
});

test("REQ-5-10: Archive is INBOX.Archive with \\Archive on the recorded cPanel A and cPanel B lists", () => {
  for (const host of ["server128", "server223"]) {
    const archive = recordedList(host).find((f) => f.path === "INBOX.Archive");
    assert.ok(archive.flags.includes("\\Archive"), host);
  }
});

test("REQ-5-2: SPECIAL-USE wins even when another folder has the exact role name", () => {
  const map = new FolderMap([folder("INBOX.Sent"), folder("INBOX.Outgoing", "\\Sent")]);
  assert.equal(map.path("Sent"), "INBOX.Outgoing");
});

test("REQ-5-1: the SPECIAL-USE flag match is case-insensitive", () => {
  assert.equal(new FolderMap([folder("INBOX.Outgoing", "\\SENT")]).path("Sent"), "INBOX.Outgoing");
});

const NAME_CASES = [
  ["Sent", ["Sent", "Sent Items", "Sent Messages"]],
  ["Drafts", ["Drafts"]],
  ["Archive", ["Archive"]],
  ["Trash", ["Trash", "Deleted Items"]],
  ["Junk", ["Junk", "Spam"]],
];

for (const [logical, names] of NAME_CASES) {
  test(`REQ-5-3: with no flag, ${logical} matches its names on the last segment, ignoring case`, () => {
    for (const name of names) {
      const path = `INBOX.Parent.${name.toUpperCase()}`;
      assert.equal(new FolderMap([folder(path), folder("INBOX.Other")]).path(logical), path);
    }
  });
}

test("REQ-5-3: only the last path segment counts, and a null delimiter means the whole name", () => {
  assert.throws(() => new FolderMap([folder("INBOX.Sent.Old")]).path("Sent"), (e) => e.code === "folder");
  assert.equal(new FolderMap([{ path: "Sent", delimiter: null, flags: [] }]).path("Sent"), "Sent");
  assert.throws(() => new FolderMap([{ path: "a.Sent", delimiter: null, flags: [] }]).path("Sent"), (e) => e.code === "folder");
});

test("REQ-5-3: a flag on any folder stops name matching for that role only", () => {
  const map = new FolderMap([folder("INBOX.Trash", "\\Archive"), folder("INBOX.Archive"), folder("INBOX.Bin", "\\Trash")]);
  assert.equal(map.path("Archive"), "INBOX.Trash");
  assert.equal(map.path("Trash"), "INBOX.Bin");
});

test("REQ-5-4: several name matches are an error that asks for an override", () => {
  const map = new FolderMap([folder("INBOX.Junk"), folder("INBOX.spam")]);
  assert.throws(() => map.path("Junk"), /several folders match Junk by name; set a config override/);
});

test("REQ-5-4: no name match is an error that asks for an override", () => {
  assert.throws(() => new FolderMap([folder("INBOX")]).path("Sent"), /no folder found for Sent.*config override/);
});

test("REQ-5-4 REQ-19-1: several folders with one flag is an error asking for an override (spec question Q2)", () => {
  const map = new FolderMap([folder("INBOX.A", "\\Sent"), folder("INBOX.B", "\\Sent")]);
  assert.throws(() => map.path("Sent"), /several folders carry \\sent for Sent; set a config override/);
});

test("REQ-2-10: an override replaces discovery for that logical name only", () => {
  const map = new FolderMap(recordedList("server128"), { Archive: "INBOX.Old" });
  assert.deepEqual(mapping(map), { ...EXPECTED, Archive: "INBOX.Old" });
});

test("REQ-2-10: an override settles a name that would otherwise be an error", () => {
  const list = [folder("INBOX.Junk"), folder("INBOX.spam")];
  assert.equal(new FolderMap(list, { Junk: "INBOX.spam" }).path("Junk"), "INBOX.spam");
});

test("REQ-5-9: a missing Archive is an error, while the other folders still resolve", () => {
  const map = new FolderMap(recordedList("server128").filter((f) => f.path !== "INBOX.Archive"));
  assert.throws(() => map.path("Archive"), /no folder found for Archive; it is not created automatically/);
  assert.equal(map.path("Drafts"), "INBOX.Drafts");
});

test("REQ-5-9: the server has no way to create a folder", () => {
  for (const file of readdirSync(repoFile("src"), { recursive: true }).filter((f) => f.endsWith(".js"))) {
    assert.doesNotMatch(readFileSync(repoFile(`src/${file}`), "utf8"), /["`]CREATE\b/, file);
  }
});

test("REQ-2-9: LIST runs at every session open, so a later request sees a changed folder", async () => {
  let archive = "INBOX.Archive";
  const srv = fakeServer({
    respond: (tag, cmd) =>
      cmd.startsWith("LIST") ? `* LIST (\\Archive) "." "${archive}"\r\n${tag} OK List completed\r\n` : undefined,
  });
  const env = { IMAP_PASS_TEST: FAKE_PASSWORD };
  const one = account("a@x.test", "x.test");
  const resolve = async () => {
    const sessions = new RequestSessions({ connect: srv.connect, env });
    const path = await sessions.run(one, (client) => client.folders.path("Archive"));
    await sessions.closeAll();
    return path;
  };
  assert.equal(await resolve(), "INBOX.Archive");
  archive = "INBOX.Moved";
  assert.equal(await resolve(), "INBOX.Moved");
  assert.equal(srv.commands.filter((c) => c.startsWith("LIST")).length, 2);
});

test("REQ-2-10: a session applies the account's folder overrides", async () => {
  const srv = fakeServer();
  const sessions = new RequestSessions({ connect: srv.connect, env: { IMAP_PASS_TEST: FAKE_PASSWORD } });
  const one = { ...account("a@x.test", "x.test"), folders: { Trash: "INBOX.Bin" } };
  assert.equal(await sessions.run(one, (client) => client.folders.path("Trash")), "INBOX.Bin");
  await sessions.closeAll();
});

const registry = loadRegistry(wranglerConfig().env.production.vars.MAILBOXES);

test("REQ-5-7: folders are addressed as account:LogicalName", () => {
  for (const logical of ["Inbox", "Sent", "Drafts", "Archive"]) {
    assert.deepEqual(parseFolderAddress(`scott@reasinger.net:${logical}`, registry), {
      account: "scott@reasinger.net",
      logical,
    });
  }
});

test("REQ-5-7: an unknown account, name or shape is an error", () => {
  for (const bad of ["nobody@x.test:Inbox", "scott@reasinger.net:INBOX.Sent", "scott@reasinger.net:inbox", "scott@reasinger.net", ":Inbox", ""]) {
    assert.throws(() => parseFolderAddress(bad, registry), (e) => e.code === "folder", bad);
  }
});

test("REQ-5-8: Trash and Junk are addressable logical names", () => {
  assert.equal(parseFolderAddress("scott@reasinger.net:Trash", registry).logical, "Trash");
  assert.equal(parseFolderAddress("founders@yourcigardenindy.com:Junk", registry).logical, "Junk");
});
