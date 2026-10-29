---
'@finos/legend-extension-dsl-persistence': patch
---

Fixed creating a persistence from the New Element dialog breaking the workspace: the persistence was created without a service, so computing its hash threw and stopped change detection. The dialog now asks for the service and a documentation, and the new persistence gets a manual trigger and an empty notifier, so it hashes, serializes and builds again on the next load.
