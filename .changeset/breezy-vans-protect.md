---
'@finos/legend-extension-dsl-data-space': major
---

**BREAKING CHANGE:** Change `DataSpaceViewer` to read from data space `analysis result` instead of a data space `metamodel`. Reading from the analysis result is an optimization we do to not have to build the full graph to view the data space ([#936](https://github.com/finos/legend-studio/issues/936)).
