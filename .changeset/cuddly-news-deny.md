---
'@finos/legend-application': minor
---

Support loading documentation regitry entries from an external source, e.g. `documentation.registry: [{ url: 'https://legend.finos.org/resource/studio/documentation' }]`; this config takes an additional flag `simple` when the endpoint is only just a `JSON` file and the server has a fairly relaxed `CORS` policy (Access-Control-Allow-Origin", "\*"), e.g. `documentation.registry: [{ url: 'https://legend.finos.org/resource/studio/documentation.json', simple: true }]`.

Also, we have finalized the order of overriding for documentation entries. The later will override the former in order:

- Natively specified: specified in the codebase (no overriding allowed within this group of documentation entries): _since we have extension mechanism, the order of plugins matter, we do not allow overriding, i.e. so the first specification for a documentation key wins_
- Fetched from documentation registries (no overriding allowed within this group of documentation entries): _since we have extension mechanism and allow specifying multiple registry URLS, we do not allow overriding, i.e. so the first specification for a documentation key wins_
- Configured in application config (overiding allowed within this group)
