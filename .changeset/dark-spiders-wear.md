---
'@finos/legend-application-query': patch
'@finos/legend-query-builder': patch
'@finos/legend-extension-dsl-data-space': patch
---

Introduce the Legend AI agent chat panel to the Legend Query : the bundled Legend Query application picks up the `legendAI.agentURL` configuration, the query editor header exposes a Legend AI agent chat toggle gated by that configuration, and the query builder replaces the previous Legend AI query chat with the new agent chat panel, Agent chat telemetry is moved into a dedicated `LegendQueryAgentChatTelemetryHelper`, and a plugin extension is added so extra metadata (e.g. agent chat trace id) can be attached to query run launch/success/failure/cancel telemetry.
