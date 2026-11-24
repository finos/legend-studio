---
'@finos/legend-shared': patch
'@finos/legend-graph': patch
'@finos/legend-application-studio': patch
---

Add local mode: a plugin can provide a local engine (`LegendStudioApplicationPlugin.getExtraLocalEngines`) that answers some engine calls in the browser instead of the engine server, and `engine.local` in Studio's `config.json` turns it on for the listed routes (`mode: on`, `routes`). The engine client (`V1_EngineServerClient`) sends those calls to a `LocalEngineRouter` before compression and reads the local answer with the same response handling as the server's (`processResponse`, now exported from `@finos/legend-shared`). A refusal reruns the call on the engine server and ends local mode for the session; the Dev Tool panel can turn local mode off for a browser. Each local call records `engine.local-engine.call` telemetry: route, engine key, duration and outcome, never content.
