---
'@finos/legend-lego': patch
'@finos/legend-extension-dsl-data-product': patch
---

Keep the Legend AI metadata prompt bounded on data products with hundreds of access points, where it previously assembled a prompt the LLM gateway rejected.

Access point and service relationships are paired through an inverted column index that skips near-universal columns, metadata questions carry only the access points ranked most relevant, and conversation history is capped so prompt size no longer grows with the conversation.
