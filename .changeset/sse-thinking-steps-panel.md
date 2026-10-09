---
'@finos/legend-shared': patch
'@finos/legend-lego': patch
---

Add `readSSEStream` to `@finos/legend-shared`: a protocol-agnostic helper that turns a `fetch` response body into a sequence of Server-Sent Event `data:` payloads (blank-line event framing, CRLF normalization, partial-tail carry-over, `[DONE]`/keep-alive skipping), leaving payload parsing entirely to the caller.

Add `@finos/legend-lego/sse-chat`: `ThinkingStepsPanel`, a presentation-only, pre-classified progress stepper (with `SSEThinkingStep`/`SSEThinkingStepStatus` types) for any chat surface whose backend streams structured progress events over SSE.
