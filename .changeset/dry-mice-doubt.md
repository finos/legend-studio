---
'@finos/legend-application-taxonomy': minor
---

Allow configuring instances of `Legend Studio` which `Legend Taxonomy` can refer to for integration (e.g. editing data space).

```jsonc
{
  ... // existing config content
  "studio": {
    "url": "http://localhost:9000/studio",
    "instances": [
      {
        "sdlcProjectIDPrefix": "PROD",
        "url": "http://localhost:9000/studio"
      }
    ]
  }
}
```
