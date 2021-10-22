---
'@finos/legend-extension-dsl-diagram': minor
---

Support context menu for class views. Cleanup diagram renderer event handlers: they now align with the events that trigger them, not their purpose, e.g. we changed `handleEditClassView` to `onClassViewDoubleClick`.
