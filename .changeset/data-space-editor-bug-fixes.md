---
'@finos/legend-extension-dsl-data-space-studio': patch
---

Fix two bugs in the data space editor: the Mapping / Mapping Provider toggle now switches the execution context's source, asking before it removes the one already set; and a second click on a stale remove button no longer deletes the last element or executable in the list.
