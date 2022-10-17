---
'@finos/legend-application': major
---

**BREAKING CHANGE:** In `ApplicationNavigator`, changed `reloadToLocation` to `goToLocation`, the old `goToLocation` will now be called `updateCurrentLocation` and subjected to navigation blocking, this method will technically only update the location of the application (i.e. for `WebApplicationNavigator`, the URL) without reloading the app, or going to another section of the app; hence this method should only be used in very particular cases: majority of the time, `goToLocation` should be used.
