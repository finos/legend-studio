---
'@finos/legend-art': minor
---

Make the text value we get from all `monaco-editor` instances more consistent by exposing the method `getEditorValue()` that returns the text value with line-ending option `LF` and `normalizeLineEnding()` to remove `CR` characters `\r` in the input value, see example usage of `TextInputEditor.tsx` for example ([#608](https://github.com/finos/legend-studio/issues/608)).
