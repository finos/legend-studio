---
'@finos/legend-data-cube': patch
'@finos/legend-dev-utils': patch
'@finos/legend-art': patch
'@finos/legend-application-data-cube': patch
---

Add a dark color theme to DataCube, toggled via the new `Dark Mode: Enabled` setting (Settings › Appearance). Default grid colors (foreground, grid lines, highlighted rows, etc.) follow the theme while customized colors are kept as-is. To support this, Tailwind color utilities now read their values from the `--tw-color-*` CSS variables (the default palette is unchanged), so a subtree can be re-themed by redefining these variables.
