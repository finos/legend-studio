---
'@finos/legend-application-query': patch
---

Remember the runtime a user picks for a data space execution context: opening the data space again, reopening a saved query on it, or switching back to the context uses that runtime instead of the context's default. The choice is kept per user in the browser, never in the saved query. A runtime other than the default always shows in the setup panel, with a button to go back to the default. A link whose runtime no longer exists now opens with a warning instead of failing to load.
