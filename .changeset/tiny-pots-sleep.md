---
'@finos/legend-studio': major
---

**BREAKING CHANGE:** Renamed `LegendStudioStore` to `LegendStudioBaseStore`, `LegendStudioPlugin` to `LegendStudioApplicationPlugin`, `LegendStudioConfig` to `LegendStudioApplicationConfig`. We also unified `LegendStudioApplicationPlugin` and `LegendApplicationPlugin` in `LegendStudioPluginManager` so we have removed `getStudioPlugins()` method, use `getApplicationPlugins()` instead. We also renamed page/screen components in `Legend Studio` codebase to make them spell out better what they do, this change includes renaming `Setup` to `WorkspaceSetup`, `Viewer` to `ProjectViewer`, and `Review` to `WorkspaceReview`.
