// Feasibility spike: does imapflow run on Cloudflare Workers against cPanel?
// Design ref: docs/design.md section 10.
// Test account comes from three plain secrets: TEST_HOST, TEST_USER, TEST_PASS.
// (Earlier ACCOUNTS_JSON format, kept for reference:)
//   [{"id":"mcptest@reasinger.net","host":"mail.example.com","pass":"...","mode":"full"},
//    {"id":"scott@reasinger.net","host":"...","pass":"...","mode":"list"}]
// mode "full": login, LIST, SELECT, SEARCH, FETCH, APPEND draft, STORE flag (test mailbox only).
// mode "list": login and LIST only. Read-only. Safe for live mailboxes.
import { ImapFlow } from "imapflow";
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

async function runAccount(acct, opts) {
  const log = [];
  const client = new ImapFlow({
    host: acct.host,
    port: 993,
    secure: true,
    auth: { user: acct.id, pass: acct.pass },
    logger: false,
    disableAutoIdle: true,
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
  });
  try {
    await step(log, "raw TLS probe (cloudflare:sockets)", () => probe(acct.host));
    if (opts.probeOnly) return { id: acct.id, mode: "probe", ok: true, log };
    await step(log, "connect+login", () => client.connect().then(() => ({ capabilities: [...client.capabilities.keys()] })));
    const folders = await step(log, "list", async () =>
      (await client.list()).map((f) => ({ path: f.path, specialUse: f.specialUse || null, delimiter: f.delimiter }))
    );
    if (acct.mode !== "full") return { id: acct.id, mode: acct.mode, ok: true, log };

    const drafts = folders.find((f) => f.specialUse === "\\Drafts")?.path || folders.find((f) => /drafts$/i.test(f.path))?.path;
    const lock = await client.getMailboxLock("INBOX");
    let latest = null;
    try {
      await step(log, "select INBOX", () => ({ exists: client.mailbox.exists, uidValidity: String(client.mailbox.uidValidity) }));
      const uids = await step(log, "search since 7d", async () => {
        const r = await client.search({ since: new Date(Date.now() - 7 * 864e5) }, { uid: true });
        return { count: r.length, uids: r.slice(-5) };
      });
      if (uids.count) {
        latest = await step(log, "fetch envelope", async () => {
          const m = await client.fetchOne(String(uids.uids.at(-1)), { envelope: true, flags: true, headers: ["references"] }, { uid: true });
          return { uid: m.uid, subject: m.envelope.subject, from: m.envelope.from?.[0]?.address, messageId: m.envelope.messageId, flags: [...m.flags], references: m.headers?.toString().replace(/^references:\s*/i, "").trim() || null };
        });
        if (opts.flag) await step(log, "store \\Flagged on latest", () => client.messageFlagsAdd(String(latest.uid), ["\\Flagged"], { uid: true }));
      }
    } finally {
      lock.release();
    }
    if (!drafts) throw new Error("no Drafts folder found");
    await step(log, `append draft to ${drafts}`, async () => {
      const mime = draftMime({
        from: acct.id,
        to: latest?.from || acct.id,
        subject: latest ? `Re: ${latest.subject}` : "cpanel-mail-mcp spike draft",
        body: "Spike draft from cpanel-mail-mcp. No signature added by the server. Do not send to anyone but the test mailbox.",
        inReplyTo: latest?.messageId,
        references: [latest?.references, latest?.messageId].filter(Boolean).join(" ") || null,
      });
      const r = await client.append(drafts, mime, ["\\Draft", "\\Seen"]);
      return { uid: r?.uid ?? null, replyTo: latest?.messageId || null };
    });
    return { id: acct.id, mode: acct.mode, ok: true, log };
  } catch (e) {
    return { id: acct.id, mode: acct.mode, ok: false, log };
  } finally {
    try { await client.logout(); } catch {}
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
