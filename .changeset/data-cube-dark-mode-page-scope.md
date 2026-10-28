---
'@finos/legend-data-cube': patch
'@finos/legend-application-data-cube': patch
---

Fixed a dark DataCube embedded in another application (e.g. the query builder) re-theming the application's own popovers and page background. The dark theme rules which style elements outside of DataCube (i.e. popups portaled to the page body, the page background) are now only used when the page is marked as owned by DataCube via the new `useDataCubeOwnsPage()` hook, which Legend DataCube uses.
