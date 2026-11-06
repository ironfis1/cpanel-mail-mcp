// Errors the server returns for bad config, folders, filters, message IDs and drafts. Separate from
// ImapError, which describes the network and protocol.
// code: config | folder | filter | id_invalid | id_not_found | id_ambiguous | account_mismatch | draft |
// signature_unset | invalid_input.
export class ServerError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ServerError";
    this.code = code;
  }
}
