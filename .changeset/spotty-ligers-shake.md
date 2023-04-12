---
'@finos/legend-art': major
---

**BREAKING CHANGE:** Changed how we expose test mocks in exports: `@finos/legend-art/lib/markdown/test/MockedReactMarkdown.js` -> `@finos/legend-art/markdown/test/MockedReactMarkdown.js` and `@finos/legend-art/lib/markdown/test/MockedRemarkGFM.js` -> `@finos/legend-art/markdown/test/MockedRemarkGFM.js`.

Moved all text editor logics to `@finos/legend-lego/code-editor` and renamed them to `CodeEditor` instead of `TextEditor`, e.g. `disposeEditor()` -> `disposeCodeEditor()`, `getBaseTextEditorOptions()` -> `getBaseCodeEditorOptions()`. In terms of testing, `monaco-editor` mock utils are now exposed under `@finos/legend-lego/code-editor/test` and the test mock has been exported via `@finos/legend-lego/code-editor/test/MockedMonacoEditor.js`.
