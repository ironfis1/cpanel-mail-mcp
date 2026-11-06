// Minimal IMAP4rev1 client over a cloudflare:sockets style socket: { opened, readable, writable,
// close }. Implements only the commands the design needs. Not a general IMAP library.
import { ImapError } from "./errors.js";
import { parseCopyUid, parseFetchResponse, parseHeaders, parseListResponse } from "./parser.js";

// REQ-4-8. Each value bounds the whole step, however the server paces its bytes.
export const TIMEOUTS = Object.freeze({
  connect: 10_000,
  greeting: 5_000,
  login: 10_000,
  command: 15_000,
  append: 30_000,
});

const enc = new TextEncoder();
const dec = new TextDecoder();
const CRLF = "\r\n";
const UID_SET = /^(\d+|\*)(:(\d+|\*))?(,(\d+|\*)(:(\d+|\*))?)*$/;
const FLAG = /^\\?[A-Za-z$][A-Za-z0-9$_.-]*$/;
const FETCH_ITEMS = /^[A-Za-z0-9.\-\[\]<>() ]+$/;
const LINE_BREAK = /[\r\n\0]/;

const invalid = (what) => new ImapError("invalid", `invalid ${what}`);

function uidSet(value) {
  if (!UID_SET.test(String(value))) throw invalid("UID set");
  return String(value);
}

function flagList(flags) {
  for (const flag of flags) if (!FLAG.test(flag)) throw invalid("flag");
  return flags.join(" ");
}

// IMAP quoted string. Refusing line breaks stops a value from starting a second command.
export function quote(value) {
  const text = String(value);
  if (LINE_BREAK.test(text)) throw invalid("quoted string");
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const imapDate = (d) => `${d.getUTCDate()}-${MONTHS[d.getUTCMonth()]}-${d.getUTCFullYear()}`;

export class ImapClient {
  #socket;
  #reader;
  #writer;
  #buf = new Uint8Array(4096);
  #start = 0;
  #end = 0;
  #tag = 0;
  #fatal = null;

  capabilities = new Set();

  constructor(socket) {
    this.#socket = socket;
    this.#reader = socket.readable.getReader();
    this.#writer = socket.writable.getWriter();
  }

  // True once a timeout or lost connection has made the socket unusable.
  get broken() {
    return this.#fatal !== null;
  }

  async #deadline(ms, step, work) {
    if (this.#fatal) throw this.#fatal;
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new ImapError("timeout", `IMAP ${step} timed out after ${ms} ms`)), ms);
    });
    try {
      return await Promise.race([work(), timeout]);
    } catch (error) {
      if (error.code === "timeout" || error.code === "connection") this.#fatal = error;
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async #fill() {
    let result;
    try {
      result = await this.#reader.read();
    } catch {
      throw new ImapError("connection", "IMAP connection failed while reading");
    }
    if (result.done) throw new ImapError("connection", "IMAP connection closed by server");
    const chunk = result.value;
    if (this.#end + chunk.length > this.#buf.length) {
      const live = this.#end - this.#start;
      const target = Math.max(this.#buf.length, (live + chunk.length) * 2);
      const next = new Uint8Array(target);
      next.set(this.#buf.subarray(this.#start, this.#end));
      this.#buf = next;
      this.#start = 0;
      this.#end = live;
    }
    this.#buf.set(chunk, this.#end);
    this.#end += chunk.length;
  }

  async #readLine() {
    let scan = this.#start;
    for (;;) {
      for (; scan + 1 < this.#end; scan++) {
        if (this.#buf[scan] === 13 && this.#buf[scan + 1] === 10) {
          const line = dec.decode(this.#buf.subarray(this.#start, scan));
          this.#start = scan + 2;
          return line;
        }
      }
      const offset = scan - this.#start;
      await this.#fill();
      scan = this.#start + offset;
    }
  }

  async #readBytes(length) {
    while (this.#end - this.#start < length) await this.#fill();
    const out = this.#buf.slice(this.#start, this.#start + length);
    this.#start += length;
    return out;
  }

  // One logical server response: a line plus any literals it announces.
  async #readResponse() {
    let text = await this.#readLine();
    const literals = [];
    for (;;) {
      const match = /\{(\d+)\}$/.exec(text);
      if (!match) return { text, literals };
      literals.push(await this.#readBytes(Number(match[1])));
      text = text.slice(0, match.index) + `\0LIT${literals.length - 1}\0` + (await this.#readLine());
    }
  }

  async #write(...parts) {
    try {
      for (const part of parts) await this.#writer.write(typeof part === "string" ? enc.encode(part) : part);
    } catch {
      throw new ImapError("connection", "IMAP connection failed while writing");
    }
  }

  #failure(step, tag, line) {
    const body = line.slice(tag.length + 1);
    return new ImapError("command", `IMAP ${step} failed: ${body.split(" ")[0]}`, {
      status: body.split(" ")[0],
      serverText: body,
    });
  }

  async #exchange(step, command, literal) {
    const tag = `A${++this.#tag}`;
    if (literal === undefined) {
      await this.#write(`${tag} ${command}${CRLF}`);
    } else if (this.capabilities.has("LITERAL+")) {
      await this.#write(`${tag} ${command} {${literal.length}+}${CRLF}`, literal, CRLF);
    } else {
      await this.#write(`${tag} ${command} {${literal.length}}${CRLF}`);
      for (;;) {
        const response = await this.#readResponse();
        if (response.text.startsWith("+")) break;
        if (response.text.startsWith(`${tag} `)) throw this.#failure(step, tag, response.text);
      }
      await this.#write(literal, CRLF);
    }

    const untagged = [];
    for (;;) {
      const response = await this.#readResponse();
      if (!response.text.startsWith(`${tag} `)) {
        untagged.push(response);
        continue;
      }
      const status = response.text.slice(tag.length + 1).split(" ")[0].toUpperCase();
      if (status !== "OK") throw this.#failure(step, tag, response.text);
      return { untagged, status: response.text };
    }
  }

  #run(step, command, { literal, timeout = TIMEOUTS.command } = {}) {
    return this.#deadline(timeout, step, () => this.#exchange(step, command, literal));
  }

  #readCapabilities(text) {
    this.capabilities = new Set(text.trim().split(/\s+/).filter(Boolean).map((c) => c.toUpperCase()));
  }

  // Resolves when TCP and TLS are up.
  opened() {
    return this.#deadline(TIMEOUTS.connect, "connect", async () => {
      try {
        await this.#socket.opened;
      } catch {
        throw new ImapError("connection", "IMAP connection could not be opened");
      }
    });
  }

  greeting() {
    return this.#deadline(TIMEOUTS.greeting, "greeting", async () => {
      const { text } = await this.#readResponse();
      if (!/^\* OK\b/i.test(text)) throw new ImapError("protocol", "IMAP server sent a bad greeting");
      const capability = /\[CAPABILITY ([^\]]*)\]/i.exec(text);
      if (capability) this.#readCapabilities(capability[1]);
      return text;
    });
  }

  // AUTHENTICATE PLAIN with SASL-IR: base64, so the password needs no escaping. The caller never
  // sees the command text. A refusal is code "auth" only with AUTHENTICATIONFAILED or no response
  // code. Any other response code (UNAVAILABLE, LIMIT) says the password is not the problem, so it
  // is a connection-class failure that names the code.
  async login(user, password) {
    let binary = "";
    for (const byte of enc.encode(`\0${user}\0${password}`)) binary += String.fromCharCode(byte);
    try {
      await this.#run("login", `AUTHENTICATE PLAIN ${btoa(binary)}`, { timeout: TIMEOUTS.login });
    } catch (error) {
      if (error.code !== "command") throw error;
      const responseCode = /^\S+ \[([A-Za-z0-9._-]+)/.exec(error.serverText)?.[1].toUpperCase();
      if (!responseCode || responseCode === "AUTHENTICATIONFAILED") {
        throw new ImapError("auth", "IMAP authentication failed", { status: error.status, serverText: error.serverText });
      }
      throw new ImapError("connection", `IMAP login refused with server response code ${responseCode}. Not retried.`, {
        status: error.status,
        serverText: error.serverText,
        responseCode,
      });
    }
  }

  // The greeting lists pre-login capabilities only; MOVE and UIDPLUS appear after login.
  async capability() {
    const { untagged } = await this.#run("CAPABILITY", "CAPABILITY");
    const line = untagged.find((r) => /^\* CAPABILITY /i.test(r.text));
    if (line) this.#readCapabilities(line.text.slice("* CAPABILITY ".length));
    return [...this.capabilities];
  }

  async list() {
    const { untagged } = await this.#run("LIST", `LIST "" "*"`);
    return untagged.filter((r) => /^\* LIST /i.test(r.text)).map(parseListResponse);
  }

  async select(mailbox) {
    const { untagged } = await this.#run("SELECT", `SELECT ${quote(mailbox)}`);
    const out = { exists: null, uidValidity: null };
    for (const { text } of untagged) {
      const exists = /^\* (\d+) EXISTS/i.exec(text);
      const validity = /\[UIDVALIDITY (\d+)\]/i.exec(text);
      if (exists) out.exists = Number(exists[1]);
      if (validity) out.uidValidity = validity[1];
    }
    return out;
  }

  // `criteria` is IMAP SEARCH syntax; values in it must already be quoted.
  async uidSearch(criteria) {
    if (LINE_BREAK.test(criteria)) throw invalid("search criteria");
    const { untagged } = await this.#run("UID SEARCH", `UID SEARCH ${criteria}`);
    const uids = [];
    for (const { text } of untagged) {
      if (/^\* SEARCH\b/i.test(text)) uids.push(...text.slice(8).trim().split(/\s+/).filter(Boolean).map(Number));
    }
    return uids;
  }

  // UIDs ordered by the Date header (RFC 5256), newest first unless reverse is false. Takes the same
  // criteria as uidSearch; SORT names its charset as an argument, so the CHARSET prefix is dropped.
  async uidSort(criteria, { reverse = true } = {}) {
    if (LINE_BREAK.test(criteria)) throw invalid("search criteria");
    if (!this.capabilities.has("SORT")) throw new ImapError("unsupported", "host lacks SORT; cannot order messages by date");
    const keys = criteria.replace(/^CHARSET UTF-8 /, "");
    const { untagged } = await this.#run("UID SORT", `UID SORT (${reverse ? "REVERSE " : ""}DATE) UTF-8 ${keys}`);
    const uids = [];
    for (const { text } of untagged) {
      if (/^\* SORT\b/i.test(text)) uids.push(...text.slice(6).trim().split(/\s+/).filter(Boolean).map(Number));
    }
    return uids;
  }

  // Returns one parsed entry per message. FETCH lines with no UID are unsolicited updates, skipped.
  async uidFetch(uids, items) {
    if (!FETCH_ITEMS.test(items)) throw invalid("FETCH items");
    const { untagged } = await this.#run("UID FETCH", `UID FETCH ${uidSet(uids)} (${items})`);
    return untagged
      .filter((r) => /^\* \d+ FETCH /i.test(r.text))
      .map(parseFetchResponse)
      .filter((message) => message.uid !== null);
  }

  async uidFetchHeaders(uid, fields = ["FROM", "TO", "SUBJECT", "DATE", "MESSAGE-ID", "REFERENCES"]) {
    const section = `HEADER.FIELDS (${fields.join(" ")})`;
    const [message] = await this.uidFetch(uid, `UID FLAGS BODY.PEEK[${section}]`);
    if (!message) return null;
    const raw = Object.entries(message.sections).find(([key]) => /^HEADER/i.test(key))?.[1];
    return { uid: message.uid, flags: message.flags, headers: parseHeaders(raw ?? "") };
  }

  async uidFetchBodyStructure(uid) {
    const [message] = await this.uidFetch(uid, "UID BODYSTRUCTURE");
    return message?.bodyStructure ?? null;
  }

  // Up to `length` bytes of a section from `offset`, without setting \Seen.
  async uidFetchPartial(uid, section, offset, length) {
    if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length <= 0) {
      throw invalid("partial range");
    }
    const [message] = await this.uidFetch(uid, `UID BODY.PEEK[${section}]<${offset}.${length}>`);
    return message?.sections[section] ?? null;
  }

  async append(mailbox, message, flags = []) {
    const literal = typeof message === "string" ? enc.encode(message) : message;
    const { status } = await this.#run("APPEND", `APPEND ${quote(mailbox)} (${flagList(flags)})`, {
      literal,
      timeout: TIMEOUTS.append,
    });
    const match = /\[APPENDUID (\d+) (\d+)\]/i.exec(status);
    return { uidValidity: match?.[1] ?? null, uid: match ? Number(match[2]) : null };
  }

  // op: "+", "-" or "" for replace.
  async uidStore(uids, op, flags) {
    if (!["+", "-", ""].includes(op)) throw invalid("STORE operation");
    await this.#run("UID STORE", `UID STORE ${uidSet(uids)} ${op}FLAGS.SILENT (${flagList(flags)})`);
  }

  // Never falls back to a plain EXPUNGE, which would remove every \Deleted message in the folder.
  async uidExpunge(uids) {
    if (!this.capabilities.has("UIDPLUS")) {
      throw new ImapError("unsupported", "host lacks UIDPLUS; refusing a plain EXPUNGE");
    }
    await this.#run("UID EXPUNGE", `UID EXPUNGE ${uidSet(uids)}`);
  }

  // MOVE when advertised, else UID COPY, STORE \Deleted and UID EXPUNGE. With neither MOVE nor
  // UIDPLUS it refuses before touching the message. Returns the destination UID when reported.
  async move(uids, destination) {
    const set = uidSet(uids);
    const target = quote(destination);
    if (this.capabilities.has("MOVE")) {
      const { untagged, status } = await this.#run("UID MOVE", `UID MOVE ${set} ${target}`);
      return parseCopyUid([...untagged.map((r) => r.text), status].join(" "));
    }
    if (!this.capabilities.has("UIDPLUS")) {
      throw new ImapError("unsupported", "host advertises neither MOVE nor UIDPLUS; message left in place");
    }
    const { status } = await this.#run("UID COPY", `UID COPY ${set} ${target}`);
    await this.uidStore(set, "+", ["\\Deleted"]);
    await this.uidExpunge(set);
    return parseCopyUid(status);
  }

  async logout() {
    await this.#run("LOGOUT", "LOGOUT");
  }

  // Bounded like any other network step, and never throws.
  async close() {
    let timer;
    const timeout = new Promise((resolve) => {
      timer = setTimeout(resolve, TIMEOUTS.command);
    });
    try {
      await Promise.race([Promise.resolve().then(() => this.#socket.close()), timeout]);
    } catch {
      // Already closed.
    } finally {
      clearTimeout(timer);
    }
  }
}
