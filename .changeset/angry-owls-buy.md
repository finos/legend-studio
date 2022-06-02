---
'@finos/eslint-plugin-legend-studio': major
'@finos/legend-application': major
'@finos/legend-art': major
'@finos/legend-dev-utils': major
'@finos/legend-extension-dsl-data-space': major
'@finos/legend-extension-dsl-diagram': major
'@finos/legend-extension-dsl-persistence': major
'@finos/legend-extension-dsl-text': major
'@finos/legend-extension-external-format-json-schema': major
'@finos/legend-extension-external-language-morphir': major
'@finos/legend-extension-external-store-service': major
'@finos/legend-extension-mapping-generation': major
'@finos/legend-graph': major
'@finos/legend-graph-extension-collection': major
'@finos/legend-manual-tests': major
'@finos/legend-model-storage': major
'@finos/legend-query': major
'@finos/legend-server-depot': major
'@finos/legend-server-sdlc': major
'@finos/legend-shared': major
'@finos/legend-studio': major
'@finos/legend-studio-extension-management-toolkit': major
'@finos/legend-studio-extension-query-builder': major
'@finos/legend-taxonomy': major
'@finos/legend-tracer-extension-zipkin': major
---

**BREAKING CHANGE:** Use `NodeNext` (`ESM` module resolution strategy for `Typescript`). Read more about this [here](https://devblogs.microsoft.com/typescript/announcing-typescript-4-7/#esm-nodejs). This transition would be relatively smooth, except that we must use `ESM`-styled import (with extensions) for relative path. For example:

```ts
// before
import { someFunction } from './Utils';
// after
import { someFunction } from './Utils.js';
```
