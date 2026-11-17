# @finos/legend-extension-store-graphql

## 0.1.0

### Minor Changes

- [#5900](https://github.com/finos/legend-studio/pull/5900) [`655b368`](https://github.com/finos/legend-studio/commit/655b3686eaef0706de076d9ca55b8812d8cc88f5) ([@marsah-gs](https://github.com/marsah-gs)) - Add initial Legend Studio support for the GraphQL store (`@finos/legend-extension-store-graphql`): grammar-text element/mapping editing, a connection form for picking the store and endpoint URL, and a "Generate from Schema" wizard that asks the engine to introspect the endpoint and adds the generated classes, binding and mapping (and the store's schema) to the project. Store schema and connection `authenticationSpecification` round-trip opaquely, since auth is resolved server-side.
