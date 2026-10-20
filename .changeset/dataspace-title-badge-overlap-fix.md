---
'@finos/legend-extension-dsl-data-space': patch
---

Fix dataspace viewer header and Quick Start layout bugs:

- The dataspace title no longer overflows into the AI readiness badge on long titles — the title now shrinks and truncates (with an ellipsis, full name still available via tooltip) instead of overlapping the badge, and a minimum gap between the title and the badge is now guaranteed.
- Fixed the AI panel resize handle (drag and keyboard) tracking the wrong edge when the viewer is horizontally centered on wide screens, which caused the divider to drift away from the cursor while dragging.
- Removed a fixed-width layout bug in the Quick Start tab bar that left a large dead gap between the content tabs (e.g. "Column Specifications", "Query") and the right-side action icons (e.g. "Data Access") when few tabs were present.
