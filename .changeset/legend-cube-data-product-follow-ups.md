---
'@finos/legend-cube-builder': patch
'@finos/legend-application-query': patch
---

Legend Cube's data product tab pages the lakehouse's list of data products itself, stopping on a page that isn't one, a missing, unreadable or repeated cursor, or past a page cap, drops a listed product it can't read rather than failing the whole list, and stops a listing once the dialog closes or the mode changes. A failed listing shows in the tab with its own Retry. When Legend Query's config names a marketplace server (`marketplace.serverUrl`, unset by default), the tab instead searches the marketplace as the viewer types, keeping only the latest search's answer and the product picked, says when a search's matches may be cut short, and reopens a data product cube on its own product without searching. A data product cube's Source panel shows its deployment class and edits its warehouse, as one undo step that is remembered for the viewer's next cubes; a warehouse change clears the run's error and marks its rows stale, a read-only cube allows no change, and a SNAPSHOT project is labelled as one that may change.
