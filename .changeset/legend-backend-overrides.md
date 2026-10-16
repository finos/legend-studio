---
'@finos/legend-application': minor
---

Backend overrides: when `application.backendOverrides.enabled` is set in `config.json`, users can override the URLs of the backend servers an application declares (`LegendApplicationConfig.getBackendEntries()`) from a backend servers dialog. Overrides are saved in the browser per application and environment and applied to `config.json` when the application starts, so every server client built from the config uses them; a banner shows while any override is in use, and `?resetBackendOverrides` clears them.
