---
'@finos/legend-application-marketplace': patch
---

Fix the MCP server detail page's tool section, which overflowed its card and was unreadable in light mode:

- Registry tool names are long unbroken identifiers and the MUI accordion summary row neither shrinks nor wraps, so the tool list spilled outside the page grid on laptop widths. The summary content now wraps, the tool name breaks, and the service pattern pill wraps with it.
- Tool documentation is rendered by `MarkdownTextViewer`, whose global `.markdown-content` styles resolve against the legend-art semantic tokens whose defaults are the dark palette — leaving near-white body text on the light page. It is re-bound to the marketplace theme tokens so both themes read correctly.
- The version chip is dropped from both the detail header and the MCP catalog card, and every viewer pill now routes through one palette hook, since the dark theme repaints `.MuiChip-root` globally at a specificity that discarded the viewer's own colours.
