---
'@finos/legend-art': patch
---

Add `CopyableId`: an ID shown in monospace that copies itself to the clipboard when clicked, or when Enter or Space is pressed on it. The tooltip says "Copy {label}" with the full value, then "Copied" (or "Copy failed"); long values end in an ellipsis. The click, the key press and the mousedown stop at the button, so it can sit inside a clickable card, list row or accordion header without opening it. Optional callbacks, e.g. for telemetry: `onCopy` runs once the value is on the clipboard, and `onCopyError` when it couldn't be copied (with the browser's error). `iconVisibility` (`CopyableIdIconVisibility`) shows the copy icon on hover (default), always or never.
