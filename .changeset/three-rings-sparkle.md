---
'@finos/legend-studio': major
---

**BREAKING CHANGE:** Update the shape of `ApplicationPageRenderEntry` to take a unique `key` and multiple `urlPatterns`. Also, we nolonger automatically decorate the pattern to pick up the SDLC instance anymore, so plugin authors who need this will need to manually modify their URL patterns with the function `generateRoutePatternWithSDLCServerKey()` that we now expose.
