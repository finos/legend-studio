---
'@finos/legend-cube-builder': patch
'@finos/legend-lego': patch
'@finos/legend-application-query': patch
---

Check Legend Cube's Pure code as it is typed, in place of a Validate button: Filter by Expression's condition, Extend's expressions and Import Pure's text are checked once typing pauses (F10 at once), their border green when ready, red with a problem. Complete the code as it is typed: the columns an expression can read after `$x.`, with their types, the functions of a column's type after `->`, then the engine's completions where it has its code completion service. The code editor takes a completion source, offered while it has the focus, and can show its floating widgets in the page's body, above a transformed container such as a popper.
