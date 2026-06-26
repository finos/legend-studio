---
'@finos/legend-query-builder': patch
---

Tokenize Query Builder styles onto the two-tier semantic color system so it themes correctly under both dark and light themes (instead of rendering as a dark island in Studio's light theme). Type badges, status/error states, focus rings, tab indicators, and muted text now use semantic tokens; stable categorical colors (visualization node schemes, SQL syntax highlighting, query/test labels) are kept theme-agnostic. Also fixes three latent references to undefined palette variables (`--color-dark-grey-0`, `--color-dark-grey-180`, `--color-light-grey-500`).
