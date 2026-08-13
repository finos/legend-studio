---
'@finos/legend-lego': patch
---

`CodeEditor` now accepts an optional `rightActions?: ReactNode` prop that is rendered in the editor header alongside the built-in word-wrap toggle. This lets callers add editor-scoped actions (e.g. an "add entry" button for a JSON editor) on the same row as the word-wrap control without having to redraw the editor header.
