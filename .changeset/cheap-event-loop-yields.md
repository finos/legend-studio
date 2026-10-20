---
'@finos/legend-shared': patch
'@finos/legend-graph': patch
---

Yield to the event loop with a MessageChannel message instead of `setTimeout(0)` while building and deserializing graphs: chained timeouts are clamped to at least 4ms each, which left the graph builder idle for seconds on large projects. Add `yieldToEventLoop`.
