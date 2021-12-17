---
'@finos/legend-extension-dsl-diagram': patch
---

Make the `onDoubleClick` event handlers optional: when they are not set, we nolonger call `noop()` but actually will ignore the events.
