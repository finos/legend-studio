---
'@finos/legend-graph': patch
---

Display the full error stack trace for the execution error to help users debug the root cause by creating a new class ExecutionError that extends from ApplicationError and deserializing/serializing the NetworkClientError into ExecutionError.
