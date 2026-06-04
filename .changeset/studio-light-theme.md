---
'@finos/legend-art': patch
'@finos/legend-application': patch
'@finos/legend-application-studio': patch
'@finos/legend-lego': patch
'@finos/legend-code-editor': patch
'@finos/legend-extension-dsl-data-product': patch
'@finos/legend-extension-dsl-data-quality': patch
'@finos/legend-extension-dsl-data-space': patch
'@finos/legend-extension-dsl-data-space-studio': patch
'@finos/legend-extension-dsl-diagram': patch
'@finos/legend-extension-dsl-service': patch
'@finos/legend-extension-dsl-text': patch
'@finos/legend-extension-store-service-store': patch
'@finos/legend-extension-application-studio-depot-dashboard': patch
---

Introduce a scalable, theme-aware styling foundation for Legend Studio. Component styles now consume a two-tier CSS variable system (palette tokens → role-based semantic tokens such as `--color-bg-panel`, `--color-text-primary`, `--color-border-default`) that is remapped per theme via a body class (`theme__default-dark` / `theme__default-light`), rather than hardcoding palette colors directly. This makes the dark theme the stable default while enabling a light theme and additional themes in the future. No public API changes — existing dark-theme appearance is preserved.
