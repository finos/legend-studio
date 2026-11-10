---
'@finos/legend-extension-application-studio-depot-dashboard': patch
---

Depot dashboard: fetch data products and generation specifications at most 8 at a time and look each project up once. Starting every request at once made the browser fail them with `net::ERR_INSUFFICIENT_RESOURCES`.
