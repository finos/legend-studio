---
'@finos/legend-art': patch
---

Make the default for `material-ui` `<Dialog>` component to [ignore `maxWidth`](https://mui.com/api/dialog/#props) so that our dialogs with fixed width that exceeds the default max-width value are centered properly.
