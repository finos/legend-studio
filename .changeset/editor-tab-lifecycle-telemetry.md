---
'@finos/legend-application-studio': patch
---

Add editor tab lifecycle telemetry (`editor.tab.open` / `editor.tab.close`). Fires on every open (including cache-restore after graph rebuild) and every close (single, close-others, close-all, cache-and-close). Close events carry cumulative active-tab dwell time. Payloads bucket tabs by `tabKind` (`element`, `entity-diff`, `artifact-generation`, `model-importer`, `project-configuration`, `end-to-end-workflow`, `other`) and, for element tabs, further by `elementKind` (`class`, `mapping`, `service`, ...). See [studio-telemetry.md](docs/technical/studio-telemetry.md#editor-tabs) for the full shape.
