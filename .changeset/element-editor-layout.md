---
'@finos/legend-application-studio': patch
---

Element editors: a shared layout (`ElementEditorLayout`) with a header that shows the element's icon, name, type, package and a read-only badge, a tab strip with a count on each tab, and an empty state that offers the tab's add action. The enumeration and profile editors use it first: enumeration values read as a table with each value's documentation, and the profile's tags and stereotypes read as tables. The profile's add-tag action is now labelled "Add tag". `ElementEditorHeader`, `ElementEditorTabs` and `ElementEditorEmptyState` are exported for extension editors.
