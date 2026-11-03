# Spark reference samples (spec question Q4)

Real messages composed and sent by Spark from mcptest@reasinger.net, captured by the verifier from the received copy in Gmail through the Gmail connector. The format reference for REQ-18-8's quote format.

Scrubbing applied, nothing else changed:
- Transport and authentication headers (Received, ARC, DKIM, SPF, X-AntiAbuse and similar) removed; they carry the sender's home IP address.
- The real recipient address replaced with `Recipient <recipient@example.invalid>` in the To header, and in the forwarded-header block of spark-forward.eml (text and HTML, quoted-printable kept valid).
- Body bytes are exactly as received.

| File | What | Captured |
|---|---|---|
| spark-reply.eml | Spark reply to a message in the same mailbox | 2026-11-03 |
| spark-forward.eml | Spark forward of a message in the same mailbox | 2026-11-03 |

Observations from spark-reply.eml:
- multipart/alternative, text part 7bit, HTML part quoted-printable.
- Text part: new text, one blank line, the signature, then on the very next line (no blank line) the attribution `On <Mon D, YYYY, h:mm AM/PM -ZZZZ>, <Display Name> <address>, wrote:`, then each original line prefixed `> `.
- HTML part: `<div name="messageBodySection">`, then `<div name="messageSignatureSection"><br />...</div>`, then `<div name="messageReplySection">` holding the attribution line, `<br />`, and `<blockquote type="cite">` around the original's body section.
- The signature in this sample is the one set in Spark for mcptest (a placeholder), not the server's configured test signature.
- Spark linked the bare domain in its own signature as `href="yourcigardenindy.com"` with no scheme (relevant to Q6).

Observations from spark-forward.eml:
- Same three HTML sections as the reply. The reply section holds `---------- Forwarded message ----------`, then From, Date, To, Subject lines (labels in `<strong>` in HTML), a blank line, then a `<blockquote style="margin: 5px 5px; padding-left: 10px; border-left-width: thin; border-left-style: solid; border-left-color: #1abc9c;">` around the original.
- Text part: signature, then on the next line `---------- Forwarded message ----------`, the four header lines, two blank lines, then the original prefixed `> `.
- Text part is quoted-printable here (7bit in the reply sample).
- Subject: `Fwd: ` prepended to the full original subject, including its `Re: `.
- Spark sets In-Reply-To and References on a forward, so it threads with the original (consistent with REQ-9-20).
- Delivery note: two earlier Spark forwards from the test mailboxes were filed as spam by Gmail; this one reached the inbox.
