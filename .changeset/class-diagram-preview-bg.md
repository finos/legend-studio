---
'@finos/legend-extension-dsl-diagram': patch
---

Fix the class editor's diagram preview showing the themed app background (white in light theme, near-black in dark theme) in areas the diagram canvas hasn't covered yet — e.g. while resizing the editor panel. The preview container now uses the same fixed gray as the diagram canvas so uncovered areas blend with the diagram.
