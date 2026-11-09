---
'@finos/legend-lego': patch
'@finos/legend-extension-dsl-data-product': patch
---

The data product viewer's Pure code boxes (the Pure Query tab's accessor and example, and the access point's definition) are now as tall as their code once long lines wrap, so a wrapped line no longer hides the last line in a narrow panel; the definition still scrolls past 20 lines. `CodeEditor` takes an `onContentHeightChange` callback for that: the height of the editor's content, once laid out and whenever it changes.
