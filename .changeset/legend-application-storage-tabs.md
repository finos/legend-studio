---
'@finos/legend-application': patch
---

Stop a save in one browser tab from wiping what other tabs of the same application saved (recent items, settings, panel toggles): `StorageService` now reads its local storage entry again before each save and changes only the saved key, and reloads its data when another tab saves.
