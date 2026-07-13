---
'@finos/legend-art': patch
'@finos/legend-application-query': patch
---

Add a semantic-token mapping for the Legacy Light theme (`.theme__legacy-light`)
so tokenized components without a per-selector override in Legend Query's
`light-mode.scss` resolve to the legacy light shade instead of falling through
to the dark `:root` defaults ("dark islands"). Surfaces already repainted by
`light-mode.scss` are unchanged — those per-selector rules still take
precedence. Also fix three references to undefined `--color-legacylight-*`
variables in `light-mode.scss`.
