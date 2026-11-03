// Errors the server returns for bad config, folders, filters and message IDs. Separate from
// ImapError, which describes the network and protocol.
// code: config | folder | filter | id_invalid | id_not_found | id_ambiguous.
export class ServerError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ServerError";
    this.code = code;
  }
}
