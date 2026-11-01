// Minimal IMAP4rev1 client over a WHATWG byte stream pair.
// Built for Cloudflare's native sockets (cloudflare:sockets), which the spike proved
// work against cPanel/Dovecot where imapflow's node:tls path times out.
// Scope: exactly the commands cpanel-mail-mcp needs. Not a general IMAP library.

const enc = new TextEncoder();
const dec = new TextDecoder();
const CRLF = "\r\n";

export class ImapError extends Error {
  constructor(msg, status) { super(msg); this.status = status; }
}

// IMAP quoted string. Used for mailbox names and search terms, never for passwords.
export const q = (s) => `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const imapDate = (d) => `${d.getUTCDate()}-${MONTHS[d.getUTCMonth()]}-${d.getUTCFullYear()}`;

export class Imap {
  constructor({ readable, writable }, { timeoutMs = 15000 } = {}) {
    this.reader = readable.getReader();
    this.writer = writable.getWriter();
    this.buf = new Uint8Array(0);
    this.tagN = 0;
    this.timeoutMs = timeoutMs;
    this.literalPlus = false;
  }

  async #fill() {
    let timer;
    const t = new Promise((_, rej) => { timer = setTimeout(() => rej(new ImapError(`read timeout after ${this.timeoutMs}ms`)), this.timeoutMs); });
    try {
      const { value, done } = await Promise.race([this.reader.read(), t]);
      if (done) throw new ImapError("connection closed by server");
      const merged = new Uint8Array(this.buf.length + value.length);
      merged.set(this.buf); merged.set(value, this.buf.length);
      this.buf = merged;
    } finally { clearTimeout(timer); }
  }

  async #readLine() {
    for (;;) {
      for (let i = 0; i + 1 < this.buf.length; i++) {
        if (this.buf[i] === 13 && this.buf[i + 1] === 10) {
          const line = dec.decode(this.buf.subarray(0, i));
          this.buf = this.buf.subarray(i + 2);
          return line;
        }
      }
      await this.#fill();
    }
  }

  async #readBytes(n) {
    while (this.buf.length < n) await this.#fill();
    const out = this.buf.subarray(0, n);
    this.buf = this.buf.subarray(n);
    return dec.decode(out);
  }

  // One logical server response: a line, plus any literals it announces.
  async #readResponse() {
    let text = await this.#readLine();
    const literals = [];
    for (;;) {
      const m = text.match(/\{(\d+)\}$/);
      if (!m) break;
      literals.push(await this.#readBytes(Number(m[1])));
      text += `\u0000LIT${literals.length - 1}\u0000` + (await this.#readLine());
    }
    return { text, literals };
  }

  async greeting() {
    const r = await this.#readResponse();
    if (!r.text.startsWith("* OK")) throw new ImapError(`bad greeting: ${r.text.slice(0, 80)}`);
    this.literalPlus = /LITERAL\+/i.test(r.text);
    return r.text;
  }

  // Send a command. `literal` (string) is appended after the command text as an IMAP literal.
  async cmd(command, { literal } = {}) {
    const tag = `A${++this.tagN}`;
    if (literal !== undefined) {
      const bytes = enc.encode(literal);
      if (this.literalPlus) {
        await this.writer.write(enc.encode(`${tag} ${command} {${bytes.length}+}${CRLF}`));
        await this.writer.write(bytes);
        await this.writer.write(enc.encode(CRLF));
      } else {
        await this.writer.write(enc.encode(`${tag} ${command} {${bytes.length}}${CRLF}`));
        const cont = await this.#readResponse();
        if (!cont.text.startsWith("+")) throw new ImapError(`expected continuation, got: ${cont.text.slice(0, 80)}`);
        await this.writer.write(bytes);
        await this.writer.write(enc.encode(CRLF));
      }
    } else {
      await this.writer.write(enc.encode(`${tag} ${command}${CRLF}`));
    }
    const untagged = [];
    for (;;) {
      const r = await this.#readResponse();
      if (r.text.startsWith(`${tag} `)) {
        const status = r.text.slice(tag.length + 1).split(" ")[0];
        if (status !== "OK") throw new ImapError(`${command.split(" ")[0]} failed: ${r.text.slice(tag.length + 1, tag.length + 120)}`, status);
        return { untagged, status: r.text };
      }
      untagged.push(r);
    }
  }

  // SASL PLAIN with initial response (server advertises SASL-IR). Avoids all quoting of the password.
  async login(user, pass) {
    const raw = enc.encode(`\u0000${user}\u0000${pass}`);
    let bin = ""; for (const b of raw) bin += String.fromCharCode(b);
    await this.cmd(`AUTHENTICATE PLAIN ${btoa(bin)}`);
  }

  async list() {
    const { untagged } = await this.cmd(`LIST "" "*"`);
    return untagged
      .filter((r) => r.text.startsWith("* LIST"))
      .map((r) => {
        const m = r.text.match(/^\* LIST \(([^)]*)\) (NIL|"(?:[^"\\]|\\.)*") (.*)$/);
        if (!m) return { raw: r.text };
        const flags = m[1].split(/\s+/).filter(Boolean);
        let path = m[3];
        if (path.startsWith('"')) path = path.slice(1, -1).replace(/\\(.)/g, "$1");
        else if (path.includes("\u0000LIT")) path = r.literals[0];
        const special = flags.find((f) => /^\\(Drafts|Sent|Archive|Trash|Junk|All|Flagged)$/i.test(f)) || null;
        return { path, delimiter: m[2] === "NIL" ? null : m[2].slice(1, -1), flags, specialUse: special };
      });
  }

  async select(mailbox) {
    const { untagged } = await this.cmd(`SELECT ${q(mailbox)}`);
    const out = { exists: null, uidValidity: null };
    for (const r of untagged) {
      let m;
      if ((m = r.text.match(/^\* (\d+) EXISTS/))) out.exists = Number(m[1]);
      if ((m = r.text.match(/UIDVALIDITY (\d+)/))) out.uidValidity = m[1];
    }
    return out;
  }

  async uidSearch(criteria) {
    const { untagged } = await this.cmd(`UID SEARCH ${criteria}`);
    const line = untagged.find((r) => r.text.startsWith("* SEARCH"));
    return line ? line.text.slice(8).trim().split(/\s+/).filter(Boolean).map(Number) : [];
  }

  // Fetch flags and selected header fields for one UID.
  async uidFetchHeaders(uid, fields = ["FROM", "TO", "SUBJECT", "DATE", "MESSAGE-ID", "REFERENCES"]) {
    const { untagged } = await this.cmd(`UID FETCH ${uid} (UID FLAGS BODY.PEEK[HEADER.FIELDS (${fields.join(" ")})])`);
    const r = untagged.find((x) => /^\* \d+ FETCH/.test(x.text));
    if (!r) return null;
    const flags = (r.text.match(/FLAGS \(([^)]*)\)/)?.[1] || "").split(/\s+/).filter(Boolean);
    const headers = parseHeaders(r.literals[0] || "");
    return { uid, flags, headers };
  }

  async append(mailbox, message, flags = []) {
    const { status } = await this.cmd(`APPEND ${q(mailbox)} (${flags.join(" ")})`, { literal: message });
    const m = status.match(/APPENDUID (\d+) (\d+)/);
    return { uidValidity: m?.[1] || null, uid: m ? Number(m[2]) : null };
  }

  async uidStore(uid, op, flags) {
    await this.cmd(`UID STORE ${uid} ${op}FLAGS.SILENT (${flags.join(" ")})`);
  }

  async logout() {
    try { await this.cmd("LOGOUT"); } catch {}
  }
}

export function parseHeaders(raw) {
  const unfolded = raw.replace(/\r\n[ \t]+/g, " ");
  const h = {};
  for (const line of unfolded.split("\r\n")) {
    const i = line.indexOf(":");
    if (i > 0) h[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
  return h;
}
