---
'@finos/legend-application': major
---

**BREAKING CHANGE:** Added partial support for configurable color themes: although, we lack proper support for light color themes in many other places across the apps, this mechanism sets the foundation for the themeing strategy we want to converge to. Legacy flag `LayoutService.TEMPORARY__isLightThemeEnabled` is kept for convenience, but underlying, the binary/boolean theme setting `TEMPORARY__application.layout.enableLightTheme` has been removed in favor of `application.layout.colorTheme` which now takes the color theme key, e.g. `legacy-light` (Legacy Light), `hc-light` (High-Contract Light), etc.
