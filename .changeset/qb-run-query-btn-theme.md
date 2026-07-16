---
'@finos/legend-query-builder': patch
---

Fix `text-on-accent` trap regressions from the Query Builder tokenization:
text/icons on stable saturated fills had been mapped to themed text tokens,
rendering dark-on-color in light themes. Affected: the Run Query / Stop /
dropdown combo button (play, stop, and caret icons showed black in Studio
light and Legend Query legacy light), the OLAP operation/window operator
badges, the execution-plan native view-mode label, the explorer milestoning
type chip, and the value-spec variable pill. All now use
`--color-text-on-accent` (or stable dark on yellow), matching their
pre-tokenization appearance in dark theme.
