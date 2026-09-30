---
'@finos/legend-server-showcase-deployment': patch
---

Pin the showcase server Docker image to Node 24 LTS (`node:24-bookworm-slim`) instead of the unpinned `node:bullseye-slim` tag, which currently resolves to Node 26 on an EOL Debian release.
