// Reads messages off an IMAP session into the objects the tools return. The caller has already
// selected the folder. Header text is decoded here, and message text comes from partial or per-part
// fetches chosen from BODYSTRUCTURE, so an attachment is never downloaded to read a message.
import { encodeMessageId } from "../message-id.js";
import { parseHeaders } from "../imap/parser.js";
import { decodeHeader, parseAddressList } from "../mime/headers.js";
import {
  decodePart,
  deliveryStatusSummary,
  htmlToText,
  makeSnippet,
  nodeFromStructure,
  threadBody,
  threadSections,
} from "../mime/parse.js";

const FIELDS = "FROM TO CC SUBJECT DATE MESSAGE-ID REFERENCES IN-REPLY-TO";
const ITEMS = `UID FLAGS INTERNALDATE BODYSTRUCTURE BODY.PEEK[HEADER.FIELDS (${FIELDS})]`;
const MESSAGE_ID = /<[\x21-\x3b\x3d\x3f-\x7e]+>/g;

// Bytes to fetch for 200 snippet characters. Encoding can take 12 bytes per character, and an HTML
// part can spend many kilobytes on markup before its first word.
const TEXT_BYTES = 8192;
const HTML_BYTES = 32768;

export const messageIds = (value) => (value ? (String(value).match(MESSAGE_ID) ?? []) : []);

function parseTime(dateHeader, internalDate) {
  const header = Date.parse(dateHeader ?? "");
  if (!Number.isNaN(header)) return header;
  // INTERNALDATE reads "02-Nov-2026 12:00:00 +0000".
  const internal = Date.parse(String(internalDate ?? "").replace(/^\s*(\d+)-(\w+)-(\d+)/, "$1 $2 $3"));
  return Number.isNaN(internal) ? null : internal;
}

// A bare MAILER-DAEMON has no @, and a bounce must still show who sent it.
function sender(raw) {
  const [first] = parseAddressList(raw);
  if (first) return first;
  return raw ? { name: decodeHeader(raw), address: null } : null;
}

// One entry per UID that still exists, in the order asked for.
export async function readMetadata(client, uids) {
  if (uids.length === 0) return [];
  const fetched = await client.uidFetch(uids.join(","), ITEMS);
  const byUid = new Map(
    fetched.map((message) => {
      const raw = Object.entries(message.sections).find(([key]) => /^HEADER/i.test(key))?.[1];
      const headers = parseHeaders(raw ?? "");
      return [
        message.uid,
        {
          uid: message.uid,
          flags: message.flags ?? [],
          headers,
          structure: message.bodyStructure ?? null,
          time: parseTime(headers.date, message.internalDate),
          messageId: messageIds(headers["message-id"])[0] ?? null,
        },
      ];
    }),
  );
  return uids.map((uid) => byUid.get(uid)).filter(Boolean);
}

export function describe(account, folder, uidValidity, meta) {
  const { headers, uid, messageId, time, flags } = meta;
  return {
    id: encodeMessageId({ account: account.id, folder, uidValidity, uid, messageId }),
    account: account.id,
    from: sender(headers.from),
    to: parseAddressList(headers.to),
    subject: decodeHeader(headers.subject),
    date: time === null ? null : new Date(time).toISOString(),
    flags,
  };
}

function leaves(node, out = []) {
  if (node.disposition?.type === "attachment") return out;
  if (node.parts) for (const part of node.parts) leaves(part, out);
  else out.push(node);
  return out;
}

const isType = (leaf, type, subtype) => leaf.type === type && leaf.subtype === subtype;

function findReport(node) {
  if (node.type === "multipart" && node.subtype === "report") return node;
  for (const part of node.parts ?? []) {
    const found = findReport(part);
    if (found) return found;
  }
  return null;
}

// Which parts make up a message's snippet: its text, and for a report its delivery status.
function snippetParts(structure) {
  if (!structure) return { text: null, status: null };
  const all = leaves(structure);
  const report = findReport(structure);
  return {
    text: all.find((leaf) => isType(leaf, "text", "plain")) ?? all.find((leaf) => isType(leaf, "text", "html")) ?? null,
    status: report ? (leaves(report).find((leaf) => isType(leaf, "message", "delivery-status")) ?? null) : null,
  };
}

const decodeLeaf = (leaf, raw) =>
  decodePart(raw ?? "", { encoding: leaf.encoding, charset: leaf.params.charset });

// { uid: snippet }. Messages sharing a part number share one partial fetch, so a page of 100 costs
// a handful of commands.
export async function readSnippets(client, metas) {
  const plans = metas.map((meta) => ({ uid: meta.uid, ...snippetParts(meta.structure) }));
  const wanted = new Map();
  const want = (uid, leaf, bytes) => {
    const key = `${leaf.part}/${bytes}`;
    if (!wanted.has(key)) wanted.set(key, { section: leaf.part, length: bytes, uids: [] });
    wanted.get(key).uids.push(uid);
  };
  for (const { uid, text, status } of plans) {
    if (text) want(uid, text, isType(text, "text", "html") ? HTML_BYTES : TEXT_BYTES);
    if (status) want(uid, status, TEXT_BYTES);
  }

  const bytes = new Map();
  for (const { section, length, uids } of wanted.values()) {
    for (const message of await client.uidFetch(uids.join(","), `UID BODY.PEEK[${section}]<0.${length}>`)) {
      bytes.set(`${message.uid}/${section}`, message.sections[section]);
    }
  }

  return Object.fromEntries(
    plans.map(({ uid, text, status }) => {
      const read = (leaf) => decodeLeaf(leaf, bytes.get(`${uid}/${leaf.part}`));
      const body = !text ? "" : isType(text, "text", "html") ? htmlToText(read(text)) : read(text);
      const lead = status ? deliveryStatusSummary(read(status)) : "";
      return [uid, makeSnippet(`${lead} ${body}`)];
    }),
  );
}

// A selected folder's messages as `emails` and `search` return them, in the order of uids.
export async function readMessages(client, account, folder, uidValidity, uids) {
  const metas = await readMetadata(client, uids);
  const snippets = await readSnippets(client, metas);
  return metas.map((meta) => ({ ...describe(account, folder, uidValidity, meta), snippet: snippets[meta.uid] }));
}

// One message's text for `thread`.
export async function readBody(client, meta) {
  if (!meta.structure) return "";
  const sections = threadSections(meta.structure);
  if (sections.length === 0) return "";
  const items = sections.map((section) => `BODY.PEEK[${section}]`).join(" ");
  const [message] = await client.uidFetch(meta.uid, `UID ${items}`);
  return threadBody(nodeFromStructure(meta.structure, message?.sections ?? {}));
}
