---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
---

Legend Cube UX polish, from an audit of the demo:

- **Picking a source in the source dialog.** The picked row shows an accent bar, a check and a stronger background, which hovering no longer hides. Lists sit on the input background, so hovering a row shows. Add looks disabled until something is picked, and says why. Double-clicking a table, data set or access point adds it, as does Enter on a picked one.
- **The Join describes itself:** `Left Outer join on "DESK_ID" = "ID"` once it has key pairs, in place of "Join additional input".
- **Node tooltips** no longer end with the node's internal id.
- **Apply closes the node editor**, as the other ways out but Cancel do.
- **Shorter node labels:** a source shows its name, with its schema, data product or ingest definition below; the full description stays in the tooltip. Steps sit closer together, so a long flow keeps its text larger.
- **An added transform opens its editor**, unless it has nothing to set (Distinct).
