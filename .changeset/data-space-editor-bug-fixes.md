---
'@finos/legend-extension-dsl-data-space-studio': patch
---

Fix four bugs in the data space editor: show a Support URL field for combined support info; keep the support info type selector visible so combined support info can be cleared with None; make the Mapping / Mapping Provider toggle switch the execution context's source, asking before it removes the one already set; and stop a second click on a stale remove button from deleting the last element or executable in the list.
