// code: auth | timeout | connection | command | protocol | unsupported | invalid.
// The message never holds a password or a command's arguments. Raw server text is kept apart in
// serverText, so a message is safe for callers to pass on.
export class ImapError extends Error {
  constructor(code, message, { status = null, serverText = null, responseCode = null } = {}) {
    super(message);
    this.name = "ImapError";
    this.code = code;
    this.status = status;
    this.serverText = serverText;
    this.responseCode = responseCode;
  }
}
