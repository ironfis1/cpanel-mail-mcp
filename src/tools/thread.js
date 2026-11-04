// Thread reconstruction within one account, across Inbox, Sent and Archive, plus the requested
// message's own folder. Membership is the closure of two rules, repeated until nothing new joins:
//
//   Header link: a message whose Message-ID is known, or whose References or In-Reply-To names a
//   known ID, joins. Every member's own IDs then become known.
//
//   Subject fallback: a message with no References and no In-Reply-To joins when its normalized
//   subject matches a member's, they share a participant, and they are within 60 days. The account's
//   own address does not count as a shared participant, and the 60 days are measured from any member
//   with that subject (spec question Q7).
import { ServerError } from "../errors.js";
import { anyOf, withCharset } from "../filter.js";
import { imapDate, quote } from "../imap/client.js";
import { lookupMessage, encodeMessageId } from "../message-id.js";
import { decodeHeader, normalizeSubject, parseAddressList } from "../mime/headers.js";
import { describe, messageIds, readBody, readMetadata } from "./messages.js";

const THREAD_FOLDERS = ["Inbox", "Sent", "Archive"];
const DAY_MS = 86_400_000;
const FALLBACK_MS = 60 * DAY_MS;
const IDS_PER_SEARCH = 20;

const linksOf = ({ headers }) => [...messageIds(headers.references), ...messageIds(headers["in-reply-to"])];
const subjectOf = ({ headers }) => normalizeSubject(decodeHeader(headers.subject));

function participantsOf({ headers }, ownAddress) {
  const all = ["from", "to", "cc"].flatMap((name) => parseAddressList(headers[name]));
  return new Set(all.map(({ address }) => address.toLowerCase()).filter((address) => address !== ownAddress));
}

const idKeys = (id) => ["Message-ID", "References", "In-Reply-To"].map((name) => `HEADER ${name} ${quote(id)}`);

export async function readThread(client, account, decoded) {
  const located = await lookupMessage(client, decoded);
  const [requested] = await readMetadata(client, [located.uid]);
  if (!requested) throw new ServerError("id_not_found", "message not found; it may have been deleted");

  const paths = THREAD_FOLDERS.map((logical) => client.folders.path(logical));
  const ownAddress = account.id.toLowerCase();
  const members = new Map();
  const known = new Set();
  const searched = new Set();

  const join = (path, uidValidity, meta) => {
    members.set(`${path}\0${meta.uid}`, { path, uidValidity, meta });
    if (meta.messageId) known.add(meta.messageId);
    for (const id of linksOf(meta)) known.add(id);
  };
  join(located.folder, located.uidValidity, requested);

  // Runs criteria in every thread folder and joins the messages `accepts` lets in. Criteria are only
  // a substring match, so `accepts` makes the decision. Returns how many joined.
  const collect = async (criteria, accepts) => {
    let joined = 0;
    for (const path of paths) {
      const { uidValidity } = await client.select(path);
      const uids = (await client.uidSearch(criteria)).filter((uid) => !members.has(`${path}\0${uid}`));
      for (const meta of await readMetadata(client, uids)) {
        if (!accepts(meta)) continue;
        join(path, uidValidity, meta);
        joined++;
      }
    }
    return joined;
  };

  const followHeaderLinks = async () => {
    const fresh = [...known].filter((id) => !searched.has(id));
    for (let i = 0; i < fresh.length; i += IDS_PER_SEARCH) {
      const ids = fresh.slice(i, i + IDS_PER_SEARCH);
      for (const id of ids) searched.add(id);
      const linked = (meta) => known.has(meta.messageId) || linksOf(meta).some((id) => known.has(id));
      await collect(anyOf(ids.flatMap(idKeys)), linked);
    }
    return fresh.length > 0;
  };

  const followSubjects = async () => {
    const memberList = () => [...members.values()].map(({ meta }) => meta);
    const close = (meta, member) => Math.abs(meta.time - member.time) <= FALLBACK_MS;
    const accepts = (meta) => {
      if (linksOf(meta).length > 0 || meta.time === null) return false;
      const subject = subjectOf(meta);
      const people = participantsOf(meta, ownAddress);
      return memberList().some(
        (member) =>
          subjectOf(member) === subject &&
          member.time !== null &&
          close(meta, member) &&
          [...participantsOf(member, ownAddress)].some((address) => people.has(address)),
      );
    };

    let joined = 0;
    for (const subject of new Set(memberList().map(subjectOf))) {
      const times = memberList()
        .filter((member) => subjectOf(member) === subject && member.time !== null)
        .map((member) => member.time);
      if (!subject || times.length === 0) continue; // An empty subject would match everything.
      // Date-granular with a day to spare; `accepts` applies the exact 60 days.
      const since = new Date(Math.min(...times) - FALLBACK_MS - DAY_MS);
      const before = new Date(Math.max(...times) + FALLBACK_MS + 2 * DAY_MS);
      const criteria = withCharset(`SUBJECT ${quote(subject)} SINCE ${imapDate(since)} BEFORE ${imapDate(before)}`);
      joined += await collect(criteria, accepts);
    }
    return joined > 0;
  };

  for (;;) {
    if (await followHeaderLinks()) continue;
    if (!(await followSubjects())) break;
  }

  const ordered = [...members.values()].sort(
    (a, b) => (a.meta.time ?? 0) - (b.meta.time ?? 0) || a.path.localeCompare(b.path) || a.meta.uid - b.meta.uid,
  );
  const messages = [];
  let selected = null;
  for (const { path, uidValidity, meta } of ordered) {
    if (path !== selected) await client.select(path);
    selected = path;
    messages.push({ ...describe(account, path, uidValidity, meta), body: await readBody(client, meta) });
  }

  return {
    message_id: encodeMessageId({
      account: account.id,
      folder: located.folder,
      uidValidity: located.uidValidity,
      uid: located.uid,
      messageId: requested.messageId,
    }),
    messages,
  };
}
