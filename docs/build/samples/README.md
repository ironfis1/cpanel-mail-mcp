# Spark reference samples (spec question Q4)

Real messages composed and sent by Spark from mcptest@reasinger.net, captured by the verifier from the received copy in Gmail through the Gmail connector. The format reference for REQ-18-8's quote format.

Scrubbing applied, nothing else changed:
- Transport and authentication headers (Received, ARC, DKIM, SPF, X-AntiAbuse and similar) removed; they carry the sender's home IP address.
- The real recipient address replaced with `Recipient <recipient@example.invalid>` in the To header.
- Body bytes are exactly as received.

| File | What | Captured |
|---|---|---|
| spark-reply.eml | Spark reply to a message in the same mailbox | 2026-11-03 |
| spark-forward.eml | Spark forward | pending |

Observations from spark-reply.eml:
- multipart/alternative, text part 7bit, HTML part quoted-printable.
- Text part: new text, one blank line, the signature, then on the very next line (no blank line) the attribution `On <Mon D, YYYY, h:mm AM/PM -ZZZZ>, <Display Name> <address>, wrote:`, then each original line prefixed `> `.
- HTML part: `<div name="messageBodySection">`, then `<div name="messageSignatureSection"><br />...</div>`, then `<div name="messageReplySection">` holding the attribution line, `<br />`, and `<blockquote type="cite">` around the original's body section.
- The signature in this sample is the one set in Spark for mcptest (a placeholder), not the server's configured test signature.
- Spark linked the bare domain in its own signature as `href="yourcigardenindy.com"` with no scheme (relevant to Q6).
