---
'@finos/legend-studio': minor
---

The handling of multiple SDLC instances have changed slightly, to target a specific server option in the config, the URL must now include an additional prefix `sdlc-` to the server key, for example, `/studio/myServer/...` now becomes `/studio/sdlc-myServer/...`. On the config side, when `sdlc` field is configured with a list of option, we expect exactly one option to declare `default: true` and this would be used to the default option - _the old behavior is that the default option is the one with key of value `-`_.
