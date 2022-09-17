---
'@finos/legend-application-query': major
---

**BREAKING CHANGE:** `Legend Query` application config now requires `SDLC` entries configuration to enable the app to reason about the `SLDC` and `Studio` project/instance corresponding to a versioned project from the `Depot` server, this enables more seamless integration between `Legend Query` and `Legend Studio`, opening up avenues for new query edition modes. The new config looks like this:

```jsonc
{
  ... // existing config content
  "studio": {
    "url": "http://localhost:8080/studio",
    "instances": [
      {
        "sdlcProjectIDPrefix": "PROD",
        "url": "http://localhost:8080/studio"
      }
    ]
  }
}
```
