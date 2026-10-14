---
'@finos/legend-cube': patch
'@finos/legend-cube-builder': patch
---

Legend Cube, a UX pass from the demo review:

- **Plain row-step names:** "Drop first rows", "Take first rows" and "Take a range of rows", in place of the `<x>` placeholders.
- **Steps not set yet** show their type's name with a muted "Not set" ("Join Another Input", not "Join additional input"; not "Apply 0 Window Functions"), and their tooltip shows only what is missing. The core's nodes say whether they are set (`isUnset`).
- **Group rows' numbers** read as quantities: their thousands grouped, an integer's too, and a fraction rounded to the column's scale, or 2 places, so an Average doesn't show every digit. A group's key is never touched, and hover and copy keep the exact value.
- **Types by the kind of value:** the editors' column lists say "Text", "Whole number", "Date"… and "can be empty", in place of `Varchar(20)?`; the exact type is on hover, and messages that compare types (Join, Concat, a table that changed) keep it.
