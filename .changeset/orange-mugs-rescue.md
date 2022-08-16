---
'@finos/legend-art': major
---

**BREAKING CHANGE:** Cleanup and simplify `BlankPanelPlaceholder` props: (1) `placeholderText` is now renamed to `text`, (2) replaced `dndProps` by `isDropZoneActive` which when defined as a boolean will indicate if the drop zone should be animated when dropable item is dragged over, and (3) removed `readonlyProps` and added `disabled` props and `previewText` which will be shown when `disabled=true`.
