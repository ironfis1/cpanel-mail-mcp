// Scripted fake Dovecot behind a cloudflare:sockets style connect(). Ported from the spike's fake.
const bytesToText = new TextDecoder("latin1");

export const FAKE_PASSWORD = 'p"a\\ss wörd';

const STRUCTURE =
  '((("TEXT" "PLAIN" ("CHARSET" "UTF-8") NIL NIL "8BIT" 5 1 NIL NIL NIL NIL)' +
  '("TEXT" "HTML" ("CHARSET" "UTF-8") NIL NIL "QUOTED-PRINTABLE" 12 1 NIL NIL NIL NIL) "ALTERNATIVE" ("BOUNDARY" "b2") NIL NIL NIL)' +
  '("MESSAGE" "RFC822" NIL NIL NIL "7BIT" 100 ("Mon, 2 Nov 2026 12:00:00 +0000" "inner" NIL NIL NIL NIL NIL NIL NIL NIL) ' +
  '("TEXT" "PLAIN" ("CHARSET" "US-ASCII") NIL NIL "7BIT" 3 1 NIL NIL NIL NIL) 4 NIL NIL NIL NIL)' +
  '("APPLICATION" "OCTET-STREAM" ("NAME" "a \\"b\\".bin") NIL NIL "BASE64" 2048 NIL ("ATTACHMENT" ("FILENAME" {7}\r\nodd.bin)) NIL NIL) "MIXED" ("BOUNDARY" "b1") NIL NIL NIL)';

const HEADER =
  "From: Recruiter <r@example.com>\r\nSubject: =?UTF-8?B?UXVpY2s=?=\r\n" +
  "Message-ID: <orig-1@example.com>\r\nReferences: <root@example.com>\r\n\t<fold@example.com>\r\n\r\n";

function dovecot(tag, cmd, options) {
  let m;
  if (/^AUTHENTICATE PLAIN /.test(cmd)) {
    const raw = Uint8Array.from(atob(cmd.slice(19)), (c) => c.charCodeAt(0));
    const [, , pass] = new TextDecoder().decode(raw).split("\0");
    if (pass === options.password) return `${tag} OK Logged in\r\n`;
    return `${tag} NO [AUTHENTICATIONFAILED] Authentication failed.\r\n`;
  }
  if (cmd === "CAPABILITY") return `* CAPABILITY ${options.postLoginCaps}\r\n${tag} OK Capability completed\r\n`;
  if (cmd === 'LIST "" "*"') {
    return (
      '* LIST (\\HasNoChildren) "." INBOX\r\n' +
      '* LIST (\\HasNoChildren \\Drafts) "." "INBOX.Drafts"\r\n' +
      '* LIST (\\HasNoChildren \\Sent) "." "INBOX.Sent"\r\n' +
      '* LIST (\\HasNoChildren \\Trash) "." "INBOX.Trash"\r\n' +
      '* LIST (\\HasNoChildren) NIL "Quo\\"ted"\r\n' +
      '* LIST (\\HasNoChildren) "." {14}\r\nINBOX.Odd Name\r\n' +
      `${tag} OK List completed\r\n`
    );
  }
  if ((m = /^SELECT "(.*)"$/.exec(cmd))) {
    if (m[1] === "Missing") return `${tag} NO [NONEXISTENT] Mailbox doesn't exist\r\n`;
    return (
      "* FLAGS (\\Answered \\Flagged \\Deleted \\Seen \\Draft)\r\n* 2 EXISTS\r\n* 0 RECENT\r\n" +
      "* OK [UIDVALIDITY 1730000000] UIDs valid\r\n* OK [UIDNEXT 8] Predicted next UID\r\n" +
      `${tag} OK [READ-WRITE] Select completed\r\n`
    );
  }
  if (/^UID SEARCH /.test(cmd)) return `* SEARCH 5 7\r\n${tag} OK Search completed\r\n`;
  if ((m = /^UID FETCH (\S+) \((.*)\)$/.exec(cmd))) {
    const items = m[2];
    const parts = ["UID 7", "FLAGS (\\Seen)"];
    if (/BODYSTRUCTURE/.test(items)) parts.push(`BODYSTRUCTURE ${STRUCTURE}`);
    if (/RFC822\.SIZE/.test(items)) parts.push("RFC822.SIZE 4096");
    let section;
    if ((section = /BODY\.PEEK\[(HEADER\.FIELDS \([^)]*\))\]/.exec(items))) {
      parts.push(`BODY[${section[1]}] {${HEADER.length}}\r\n${HEADER}`);
    } else if ((section = /BODY\.PEEK\[([^\]]*)\]<(\d+)\.(\d+)>/.exec(items))) {
      const data = "x".repeat(Number(section[3]));
      parts.push(`BODY[${section[1]}]<${section[2]}> {${data.length}}\r\n${data}`);
    } else if (/BODY\.PEEK\[\]/.test(items)) {
      parts.push(`BODY[] {${options.large.length}}\r\n${options.large}`);
    }
    return `* 2 FETCH (FLAGS (\\Recent))\r\n* 2 FETCH (${parts.join(" ")})\r\n${tag} OK Fetch completed\r\n`;
  }
  if (/^UID STORE /.test(cmd)) return `${tag} OK Store completed\r\n`;
  if ((m = /^UID MOVE (\S+) "(.*)"$/.exec(cmd))) {
    return `* OK [COPYUID 1730000001 ${m[1]} 42] Moved\r\n* 2 EXPUNGE\r\n${tag} OK Move completed\r\n`;
  }
  if ((m = /^UID COPY (\S+) "(.*)"$/.exec(cmd))) return `${tag} OK [COPYUID 1730000001 ${m[1]} 42] Copy completed\r\n`;
  if (/^UID EXPUNGE /.test(cmd)) return `* 2 EXPUNGE\r\n${tag} OK Expunge completed\r\n`;
  if (cmd === "LOGOUT") return `* BYE Logging out\r\n${tag} OK Logout completed\r\n`;
  return `${tag} BAD Unexpected: ${cmd.split(" ")[0]}\r\n`;
}

// options:
//   literalPlus    advertise LITERAL+ (default true)
//   caps           extra post-login capabilities (default "MOVE UIDPLUS")
//   password       accepted password
//   silent         "connect", "greeting", or a RegExp of command text that gets no reply
//   respond        (tag, cmd, srv, conn) => string | undefined, tried before the Dovecot script. conn
//                  is an object private to this connection
//   large          the body returned for BODY.PEEK[]
//   chunkSize      split every server send into network chunks of this many bytes
export function fakeServer(options = {}) {
  const opts = {
    literalPlus: true,
    caps: "MOVE UIDPLUS",
    password: FAKE_PASSWORD,
    large: "",
    ...options,
  };
  const literalCap = opts.literalPlus ? " LITERAL+" : "";
  opts.preLoginCaps = `IMAP4rev1 SASL-IR AUTH=PLAIN${literalCap}`;
  opts.postLoginCaps = `IMAP4rev1 SASL-IR${literalCap} SPECIAL-USE ${opts.caps}`.trim();

  const srv = { commands: [], literals: [], sockets: [], connections: [], send: null };

  srv.connect = (address, socketOptions) => {
    srv.connections.push({ address, socketOptions, at: srv.commands.length });
    const conn = { address };
    let controller;
    let closed = false;
    const readable = new ReadableStream({
      start(c) {
        controller = c;
      },
    });
    const send = (text) => {
      if (closed || !text) return;
      const bytes = Uint8Array.from(text, (c) => c.charCodeAt(0));
      const size = opts.chunkSize ?? bytes.length;
      for (let i = 0; i < bytes.length; i += size) controller.enqueue(bytes.subarray(i, i + size));
    };
    srv.send = send;

    let pending = "";
    let owed = 0;
    let literalTag = null;
    const handle = (tag, cmd) => {
      srv.commands.push(cmd);
      if (opts.silent instanceof RegExp && opts.silent.test(cmd)) return;
      const custom = opts.respond?.(tag, cmd, srv, conn);
      send(custom !== undefined ? custom : dovecot(tag, cmd, opts));
    };
    const onLine = (line) => {
      const space = line.indexOf(" ");
      const tag = line.slice(0, space);
      const cmd = line.slice(space + 1);
      const literal = /^(.*) \{(\d+)(\+?)\}$/.exec(cmd);
      if (!literal) return handle(tag, cmd);
      owed = Number(literal[2]);
      literalTag = tag;
      srv.commands.push(cmd);
      if (opts.silent instanceof RegExp && opts.silent.test(cmd)) {
        owed = 0;
        return undefined;
      }
      if (!literal[3]) {
        const refuse = opts.respond?.(tag, cmd, srv, conn);
        if (refuse !== undefined) {
          owed = 0;
          return send(refuse);
        }
        send("+ OK\r\n");
      }
      return undefined;
    };
    const writable = new WritableStream({
      write(chunk) {
        pending += bytesToText.decode(chunk);
        for (;;) {
          if (owed > 0) {
            if (pending.length < owed + 2) return;
            srv.literals.push(pending.slice(0, owed));
            pending = pending.slice(owed + 2);
            owed = 0;
            send(`${literalTag} OK [APPENDUID 1730000000 9] Append completed\r\n`);
            continue;
          }
          const end = pending.indexOf("\r\n");
          if (end < 0) return;
          const line = pending.slice(0, end);
          pending = pending.slice(end + 2);
          onLine(line);
        }
      },
    });

    const socket = {
      opened: opts.silent === "connect" ? new Promise(() => {}) : Promise.resolve(),
      readable,
      writable,
      closed: false,
      async close() {
        socket.closed = true;
        if (!closed) {
          closed = true;
          controller.close();
        }
      },
    };
    srv.sockets.push(socket);
    if (opts.silent !== "connect" && opts.silent !== "greeting") {
      send(`* OK [CAPABILITY ${opts.preLoginCaps}] Dovecot ready.\r\n`);
    }
    return socket;
  };
  return srv;
}

// Fake socket that replays recorded server bytes: the greeting at connect, then one recording per
// client command, in order. Commands are framed but not interpreted.
export function replayConnect(recordings) {
  return () => {
    const queue = [...recordings];
    let controller;
    let closed = false;
    const readable = new ReadableStream({
      start(c) {
        controller = c;
      },
    });
    const next = () => {
      const bytes = queue.shift();
      if (bytes && !closed) controller.enqueue(bytes);
    };
    let pending = "";
    let owed = 0;
    let replied = false; // a synchronizing literal's recording, with its "+", already went out
    const writable = new WritableStream({
      write(chunk) {
        pending += bytesToText.decode(chunk);
        for (;;) {
          if (owed > 0) {
            if (pending.length < owed + 2) return;
            pending = pending.slice(owed + 2);
            owed = 0;
            if (!replied) next();
            continue;
          }
          const end = pending.indexOf("\r\n");
          if (end < 0) return;
          const line = pending.slice(0, end);
          pending = pending.slice(end + 2);
          const literal = /\{(\d+)(\+?)\}$/.exec(line);
          if (literal) {
            owed = Number(literal[1]);
            replied = !literal[2];
            if (replied) next();
          } else {
            next();
          }
        }
      },
    });
    next();
    return {
      opened: Promise.resolve(),
      readable,
      writable,
      async close() {
        if (!closed) {
          closed = true;
          controller.close();
        }
      },
    };
  };
}

// Lets pending promise and stream work settle. setImmediate is left unmocked by the timeout tests.
export async function settle(rounds = 25) {
  for (let i = 0; i < rounds; i++) await new Promise((resolve) => setImmediate(resolve));
}

export const account = (id, host, secretRef = "IMAP_PASS_TEST") => ({ id, host, port: 993, secret_ref: secretRef });
export const utf8 = (text) => new TextEncoder().encode(text);
