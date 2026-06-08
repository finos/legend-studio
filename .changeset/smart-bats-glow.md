---
'@finos/legend-art': patch
'@finos/legend-query-builder': patch
---

Fix light-theme theming regressions for splitter and lambda-editor surfaces.

- restore missing vertical `react-reflex` splitter sizing/hit-area styles in `legend-art`
- make shared lambda-editor styles theme-aware so Function Editor lambda input follows the active theme
