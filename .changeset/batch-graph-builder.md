---
'@finos/legend-graph': patch
---

Optimize graph builder performance by batching element processing. Instead of scheduling a separate `setTimeout` macrotask per element (which incurs ~4ms minimum delay each), elements are now processed synchronously in batches of 100 with a single event-loop yield between batches. This applies to both entity deserialization (`V1_entitiesToPureModelContextData`) and all graph builder passes (`initializeAndIndexElements`, `buildTypes`, `buildStores`, `buildMappings`, etc.). For large projects this reduces graph build time significantly while still keeping the UI responsive.
