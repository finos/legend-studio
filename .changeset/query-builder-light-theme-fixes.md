---
'@finos/legend-art': patch
'@finos/legend-query-builder': patch
'@finos/legend-application-studio': patch
---

Light-theme visual fixes for Query Builder (hosted in Studio):

- `legend-art`: form input / textarea and the `input--dark` compat alias now use `--color-border-default` for their border instead of `--color-bg-input` (which is white in light theme and made fields invisible on modal / elevated surfaces).
- `legend-art`: light-theme `--color-text-disabled` remapped from `light-grey-400` to `dark-grey-500` so disabled controls stay perceptibly "off" while remaining legible on `bg-panel` and `bg-elevated`.
- `legend-query-builder`: header `Advanced` / `Help...` pills, the selected Fetch-Structure mode pill, and `QueryBuilderPanelIssueCountBadge` now use `--color-text-on-accent` for text sitting on saturated fills (was `--color-text-secondary` / `--color-text-primary`, unreadable in light theme).
- `legend-application-studio`: promoted the moon/sun `ColorThemeToggle` to production. Removed the now-unused `STUDIO_NON_PRODUCTION_COLOR_THEMES` gating and the `NonProductionFeatureFlag` check in the toggle — light theme is enabled for all users.
