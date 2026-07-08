---
'@finos/legend-extension-dsl-data-product': patch
'@finos/legend-application-marketplace': patch
---

Refactor `UserRenderer`: `userId` is now required, and the presentation props (`className`, `appendComma`, `disableOnClick`, `onFinishedLoadingCallback`) have been grouped under a new `options` prop of type `UserRendererOptions`. Add a new `hideIfNotFound` option to render nothing when the user cannot be resolved via `getOrFetchUser`.
