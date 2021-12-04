---
'@finos/legend-shared': patch
---

Add `NullphobicSerializationFactory` which only differs to `SerializationFactory` in its deserialization helper method: it will prune all `null` values found in the JSON before deserializing. This is to accommodate for use case where some server (e.g. Java using Jackson) returns `null` for fields whose values are not set (technically, the server should return `undefined`, but this is unfortunately, not always the case).
