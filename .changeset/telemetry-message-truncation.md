---
'@finos/legend-shared': patch
---

Add `truncateMessageForTelemetry(message, limit?)` and `DEFAULT_TELEMETRY_MESSAGE_LENGTH_LIMIT` (2000) to `StringUtil`.

Caps a free-text message destined for a telemetry payload and reports whether it was clipped. Backend error messages are unbounded — they can embed generated SQL, stack traces or compilation output — and telemetry pipelines typically drop oversized events whole, so the biggest and most interesting failures are exactly the ones that silently disappear from a dashboard. The `truncated` flag is returned rather than inferred so callers can report it alongside the text; a silently clipped message makes substring searches produce false negatives with no way for an analyst to tell.

This is a size control, not a privacy control — it does not remove sensitive values that appear in a message's first characters.
