// Per-request session rules: one lazy session per account, sequential within a host, parallel
// across hosts, and a failed account stays failed for the rest of the request. One object per
// request; nothing here outlives it, so there are no persistent connections and no pool.
import { ImapClient } from "./client.js";
import { ImapError } from "./errors.js";
import { FolderMap } from "../folders.js";

async function openSession(connect, account, password) {
  let socket;
  try {
    socket = connect({ hostname: account.host, port: account.port }, { secureTransport: "on", allowHalfOpen: false });
  } catch {
    throw new ImapError("connection", "IMAP connection could not be opened");
  }
  const client = new ImapClient(socket);
  try {
    await client.opened();
    await client.greeting();
    await client.login(account.id, password);
    await client.capability();
    // Discovered at every session open; there is no folder cache.
    client.folders = new FolderMap(await client.list(), account.folders);
    return client;
  } catch (error) {
    await client.close();
    throw error;
  }
}

const authFailure = (account) =>
  new ImapError("auth", `IMAP authentication failed for ${account.id}: check the ${account.secret_ref} secret. Not retried.`);

export class RequestSessions {
  #connect;
  #env;
  #sessions = new Map();
  #failed = new Map();
  #hostQueues = new Map();
  #closed = false;

  // connect: cloudflare:sockets connect. env: holds each account's password under its secret_ref.
  constructor({ connect, env }) {
    this.#connect = connect;
    this.#env = env;
  }

  #enqueue(host, work) {
    const result = (this.#hostQueues.get(host) ?? Promise.resolve()).then(work);
    this.#hostQueues.set(host, result.catch(() => {}));
    return result;
  }

  async #session(account) {
    if (this.#closed) throw new ImapError("connection", "IMAP sessions for this request are closed");
    if (this.#failed.has(account.id)) throw this.#failed.get(account.id);
    if (this.#sessions.has(account.id)) return this.#sessions.get(account.id);

    const password = this.#env[account.secret_ref];
    if (!password) {
      const error = authFailure(account);
      this.#failed.set(account.id, error);
      throw error;
    }
    try {
      const client = await openSession(this.#connect, account, password);
      this.#sessions.set(account.id, client);
      return client;
    } catch (raw) {
      const error = raw.code === "auth" ? authFailure(account) : raw;
      this.#failed.set(account.id, error);
      throw error;
    }
  }

  // Runs fn(client) on the account's session once earlier work on that host has finished.
  run(account, fn) {
    return this.#enqueue(account.host, async () => {
      const client = await this.#session(account);
      try {
        return await fn(client);
      } catch (error) {
        if (client.broken) {
          this.#failed.set(account.id, error);
          this.#sessions.delete(account.id);
          await client.close();
        }
        throw error;
      }
    });
  }

  // Runs fn on every account. One account's failure is reported in its own entry and never rejects
  // the call, so every result says whether that account was reached.
  runEach(accounts, fn) {
    return Promise.all(
      accounts.map((account) =>
        this.run(account, fn).then(
          (value) => ({ id: account.id, ok: true, value }),
          (error) => ({ id: account.id, ok: false, code: error.code ?? "error", error: error.message }),
        ),
      ),
    );
  }

  // Call at request end. Logs out and closes every open session; a failure here cannot lose work.
  async closeAll() {
    await Promise.all(this.#hostQueues.values());
    this.#closed = true;
    const open = [...this.#sessions.values()];
    this.#sessions.clear();
    await Promise.all(
      open.map(async (client) => {
        try {
          await client.logout();
        } catch {
          // The work is done; only the goodbye failed.
        }
        await client.close();
      }),
    );
  }
}
