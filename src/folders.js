// Folder resolution from a LIST result. Nothing is cached between sessions, and the server never
// creates a folder.
import { ServerError } from "./errors.js";

export const LOGICAL_NAMES = Object.freeze(["Inbox", "Sent", "Drafts", "Archive", "Trash", "Junk"]);

const ROLES = {
  Sent: { flag: "\\sent", names: ["sent", "sent items", "sent messages"] },
  Drafts: { flag: "\\drafts", names: ["drafts"] },
  Archive: { flag: "\\archive", names: ["archive"] },
  Trash: { flag: "\\trash", names: ["trash", "deleted items"] },
  Junk: { flag: "\\junk", names: ["junk", "spam"] },
};

const lastSegment = ({ path, delimiter }) => (delimiter ? path.split(delimiter).at(-1) : path).toLowerCase();

// The path for a logical name, or null when no folder fills that role. Several candidates is an
// error, because the server never picks one.
function discover(logical, list) {
  if (logical === "Inbox") return "INBOX";
  const { flag, names } = ROLES[logical];

  const flagged = list.filter((folder) => folder.flags.some((f) => f.toLowerCase() === flag));
  if (flagged.length === 1) return flagged[0].path;
  if (flagged.length > 1) {
    throw new ServerError("folder", `several folders carry ${flag} for ${logical}; set a config override`);
  }

  const named = list.filter((folder) => names.includes(lastSegment(folder)));
  if (named.length === 1) return named[0].path;
  if (named.length > 1) {
    throw new ServerError("folder", `several folders match ${logical} by name; set a config override`);
  }
  return null;
}

export class FolderMap {
  #list;
  #overrides;

  // list: from ImapClient.list(). overrides: the account's `folders` config.
  constructor(list, overrides = {}) {
    this.#list = list;
    this.#overrides = overrides;
  }

  // The real folder path for a logical name. An override replaces discovery for that name.
  // Throws per name, so a missing Archive does not stop the Inbox working.
  path(logical) {
    if (!LOGICAL_NAMES.includes(logical)) throw new ServerError("folder", `unknown folder name: ${logical}`);
    const path = this.#overrides[logical] ?? discover(logical, this.#list);
    if (path === null) {
      throw new ServerError("folder", `no folder found for ${logical}; it is not created automatically. Set a config override`);
    }
    return path;
  }

  // What LIST returned for this session.
  get list() {
    return this.#list;
  }

  // Every selectable folder except Trash and Junk. A host with no Trash or Junk has nothing to leave out.
  searchable() {
    const excluded = ["Trash", "Junk"].map((logical) => this.#overrides[logical] ?? discover(logical, this.#list));
    return this.#list
      .filter(({ path, flags }) => !excluded.includes(path) && !flags.some((flag) => /^\\(noselect|nonexistent)$/i.test(flag)))
      .map(({ path }) => path);
  }
}

// Parses <account>:<LogicalName>. The account must exist; the name must be a logical name.
export function parseFolderAddress(address, registry) {
  const text = String(address);
  const colon = text.lastIndexOf(":");
  const account = text.slice(0, Math.max(colon, 0));
  const logical = text.slice(colon + 1);
  if (colon < 1 || !registry.some((entry) => entry.id === account)) {
    throw new ServerError("folder", `folder address needs a configured account: ${text}`);
  }
  if (!LOGICAL_NAMES.includes(logical)) throw new ServerError("folder", `unknown folder name: ${logical}`);
  return { account, logical };
}
