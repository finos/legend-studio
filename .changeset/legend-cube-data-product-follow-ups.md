---
'@finos/legend-cube-builder': patch
---

Legend Cube's data product tab pages the lakehouse's list of data products itself, stopping on a page that isn't one, a missing, unreadable or repeated cursor, or past a page cap, drops a listed product it can't read rather than failing the whole list, and stops a listing once the dialog closes or the mode changes.
