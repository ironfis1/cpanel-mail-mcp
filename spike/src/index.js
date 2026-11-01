// Feasibility spike: IMAP from Cloudflare Workers to cPanel.
// Run 2 showed imapflow times out on Workers; this uses the native-socket client in imap.js.
// Design ref: docs/design.md section 10.
// Test account comes from three plain secrets: TEST_HOST, TEST_USER, TEST_PASS.
// (Earlier ACCOUNTS_JSON format, kept for reference:)
//   [{"id":"mcptest@reasinger.net","host":"mail.example.com","pass":"...","mode":"full"},
//    {"id":"scott@reasinger.net","host":"...","pass":"...","mode":"list"}]
// mode "full": login, LIST, SELECT, SEARCH, FETCH, APPEND draft, STORE flag (test mailbox only).
// mode "list": login and LIST only. Read-only. Safe for live mailboxes.
import { Imap, imapDate } from "./imap.js";
import { connect } from "cloudflare:sockets";

const withTimeout = (p, ms, what) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout after ${ms}ms: ${what}`)), ms))]);

// Raw TLS probe with Cloudflare's native socket API, independent of imapflow.
// Pass: we read the server's IMAP greeting ("* OK ...").
async function probe(host, port = 993) {
  const sock = connect({ hostname: host, port }, { secureTransport: "on", allowHalfOpen: false });
  try {
    await withTimeout(sock.opened, 10000, "TCP/TLS open");
    const reader = sock.readable.getReader();
    const { value } = await withTimeout(reader.read(), 10000, "IMAP greeting");
    const greeting = new TextDecoder().decode(value || new Uint8Array()).trim().slice(0, 120);
    reader.releaseLock();
    return { greeting };
  } finally {
    try { await sock.close(); } catch {}
  }
}

const json = (o, s = 200) =>
  new Response(JSON.stringify(o, null, 2), { status: s, headers: { "content-type": "application/json" } });

async function step(log, name, fn) {
  const t = Date.now();
  try {
    const out = await fn();
    log.push({ step: name, ok: true, ms: Date.now() - t, out });
    return out;
  } catch (e) {
    log.push({ step: name, ok: false, ms: Date.now() - t, error: String(e?.message || e), code: e?.code });
    throw e;
  }
}

function draftMime({ from, to, subject, body, inReplyTo, references }) {
  const date = new Date().toUTCString();
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Date: ${date}`,
    `Message-ID: <spike-${crypto.randomUUID()}@cpanel-mail-mcp>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
  ];
  if (inReplyTo) lines.push(`In-Reply-To: ${inReplyTo}`);
  if (references) lines.push(`References: ${references}`);
  return lines.join("\r\n") + "\r\n\r\n" + body + "\r\n";
}

// Strip display name: "Name <a@b>" -> "a@b"
const addr = (h) => (h || "").match(/<([^>]+)>/)?.[1] || (h || "").trim() || null;

async function runAccount(acct, opts) {
  const log = [];
  await step(log, "raw TLS probe (cloudflare:sockets)", () => probe(acct.host)).catch(() => null);
  if (!log[0].ok) return { id: acct.id, mode: acct.mode, ok: false, log };
  if (opts.probeOnly) return { id: acct.id, mode: "probe", ok: true, log };

  const sock = connect({ hostname: acct.host, port: 993 }, { secureTransport: "on", allowHalfOpen: false });
  const c = new Imap(sock, { timeoutMs: 15000 });
  try {
    await step(log, "greeting", () => c.greeting().then((g) => ({ literalPlus: c.literalPlus })));
    await step(log, "login (SASL PLAIN)", () => c.login(acct.id, acct.pass).then(() => "ok"));
    const folders = await step(log, "list", () => c.list());
    if (acct.mode !== "full") return { id: acct.id, mode: acct.mode, ok: true, log };

    const drafts = folders.find((f) => f.specialUse === "\\Drafts")?.path || folders.find((f) => /drafts$/i.test(f.path || ""))?.path;
    await step(log, "select INBOX", () => c.select("INBOX"));
    const uids = await step(log, "uid search since 7d", async () => {
      const r = await c.uidSearch(`SINCE ${imapDate(new Date(Date.now() - 7 * 864e5))}`);
      return { count: r.length, last5: r.slice(-5) };
    });
    let latest = null;
    if (uids.count) {
      latest = await step(log, "fetch headers (latest)", async () => {
        const m = await c.uidFetchHeaders(uids.last5.at(-1));
        return { uid: m.uid, flags: m.flags, from: addr(m.headers.from), subject: m.headers.subject || "", messageId: m.headers["message-id"] || null, references: m.headers.references || null };
      });
      if (opts.flag) await step(log, "store \\Flagged on latest", () => c.uidStore(latest.uid, "+", ["\\Flagged"]).then(() => "ok"));
    }
    if (!drafts) throw new Error("no Drafts folder found");
    await step(log, `append draft to ${drafts}`, async () => {
      const mime = draftMime({
        from: acct.id,
        to: latest?.from || acct.id,
        subject: latest ? `Re: ${latest.subject.replace(/^re:\s*/i, "")}` : "cpanel-mail-mcp spike draft",
        body: "Spike draft from cpanel-mail-mcp. No signature added by the server. Do not send to anyone but the test mailbox.",
        inReplyTo: latest?.messageId,
        references: [latest?.references, latest?.messageId].filter(Boolean).join(" ") || null,
      });
      const r = await c.append(drafts, mime, ["\\Draft", "\\Seen"]);
      return { ...r, replyTo: latest?.messageId || null };
    });
    return { id: acct.id, mode: acct.mode, ok: true, log };
  } catch (e) {
    return { id: acct.id, mode: acct.mode, ok: false, log };
  } finally {
    await c.logout();
    try { await sock.close(); } catch {}
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname !== "/spike") return json({ error: "not found" }, 404);
    if (req.headers.get("authorization") !== `Bearer ${env.SPIKE_TOKEN}`) return json({ error: "unauthorized" }, 401);
    let accounts;
    if (env.TEST_HOST && env.TEST_USER && env.TEST_PASS) {
      // Plain per-value secrets: no JSON, no escaping.
      accounts = [{ id: env.TEST_USER.trim(), host: env.TEST_HOST.trim(), pass: env.TEST_PASS, mode: "full" }];
    } else {
      const missing = ["TEST_HOST", "TEST_USER", "TEST_PASS"].filter((k) => !env[k]);
      return json({ error: `missing secrets: ${missing.join(", ")}` }, 500);
    }
    const opts = { flag: url.searchParams.get("flag") === "1", probeOnly: url.searchParams.get("probe") === "1" };
    const t = Date.now();
    const results = await Promise.all(accounts.map((a) =>
      withTimeout(runAccount(a, opts), 50000, "whole account run").catch((e) => ({ id: a.id, ok: false, error: String(e.message || e) }))
    ));
    return json({ runtime: "cloudflare-workers", totalMs: Date.now() - t, results });
  },
};
