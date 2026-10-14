---
'@finos/legend-art': patch
'@finos/legend-lego': patch
---

Add an opt-in `rehypePlugins` prop to `MarkdownTextViewer` (`legend-art`); default behavior is unchanged when it is omitted.
Add `HtmlBlockRenderer` to `legend-lego` (exported from `@finos/legend-lego/html-renderer`), which renders raw HTML payloads in a sandboxed iframe with auto-sizing height.
