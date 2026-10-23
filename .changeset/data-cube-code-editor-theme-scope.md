---
'@finos/legend-code-editor': patch
'@finos/legend-lego': patch
'@finos/legend-data-cube': patch
---

Stop DataCube's code editor theme from leaking into the hosting application's code editors (Monaco has a single theme per page), and switch already-open DataCube code editors when the dark mode setting is toggled. Applications now set the base code editor theme via `setBaseCodeEditorTheme()`, and embedded components claim their own theme via `claimCodeEditorTheme()` while their editors are mounted, restoring the application's theme once released.
