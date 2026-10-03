---
'@finos/legend-application-studio': patch
---

Telemetry follow-ups: build SDLC review / project overview telemetry identities inside the action's `try` so a failing lookup is surfaced as a notification instead of leaving the action stuck in progress; make editor tab close telemetry key off the opened tab instance, skip emitting when closing a tab that is not opened, report tabs dropped via wholesale tab replacement (element deletion, generation refresh) as closed, and tag store-driven closes with the `programmatic` trigger.
