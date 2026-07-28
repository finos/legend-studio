---
'@finos/legend-application-studio': patch
'@finos/legend-application-query': patch
---

Improve the Legend AI suggestion experience across the service editor, data product editor, and query editors (create and rename dialogs):

- Log AI suggestion failures via telemetry with the error message (and the element path in Studio), so failures can be monitored. The error is still surfaced to the user as before; telemetry is added without changing existing behavior.
- When an AI suggestion fails with a 401 or 403 HTTP status, append an entitlements documentation link to the error message (driven by the shared `legend-ai.how-to-get-entitlements` documentation key) so users can discover how to resolve authorization issues.
