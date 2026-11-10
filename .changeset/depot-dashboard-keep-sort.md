---
'@finos/legend-extension-application-studio-depot-dashboard': patch
'@finos/legend-application-studio': patch
---

Depot dashboard: the grids keep their sort when the flatten modal opens, and sort and filter rows again as they fill in after Refresh; a snapshot opens at the head of its project instead of at a `master-SNAPSHOT` version; once Flatten has opened a review, the row links to it in GitLab and in Studio in place of Flatten, through Refresh. `generateViewEntityRoute` is exported.
