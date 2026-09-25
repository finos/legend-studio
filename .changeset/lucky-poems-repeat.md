---
'@finos/legend-graph': patch
---

Support engine's multi-line (`'''...'''`) string literal protocol changes: `V1_CString` (and its raw value specification counterpart) now carries an optional `multiLine` flag, and a tagged value's `value` accepts both the plain string and the `{ _type: 'string', multiLine: true, value: '...' }` wire shapes.
