---
'@finos/legend-studio': patch
'@finos/legend-studio-app': patch
'@finos/legend-studio-components': patch
'@finos/legend-studio-plugin-management': patch
'@finos/legend-studio-plugin-tracer-zipkin': patch
'@finos/legend-studio-preset-dsl-text': patch
'@finos/legend-studio-shared': patch
'@finos/legend-studio-dev-utils': patch
---

Move @types/\* dependencies from devDependencies in order to ensure NPM consumers properly install these typings
