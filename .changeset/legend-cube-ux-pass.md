---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
---

Legend Cube, a UX pass from the demo review:

- **Plain row-step names:** "Drop first rows", "Take first rows" and "Take a range of rows", in place of the `<x>` placeholders.
- **Steps not set yet** show their type's name with a muted "Not set" ("Join Another Input", not "Join additional input"; not "Apply 0 Window Functions"), and their tooltip shows only what is missing. The core's nodes say whether they are set (`isUnset`).
