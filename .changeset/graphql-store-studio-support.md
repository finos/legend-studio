---
'@finos/legend-extension-store-graphql': minor
---

Add initial Legend Studio support for the GraphQL store (`@finos/legend-extension-store-graphql`): grammar-text element/mapping editing, a connection form for picking the store and endpoint URL, and a "Generate from Schema" wizard that asks the engine to introspect the endpoint and adds the generated classes, binding and mapping (and the store's schema) to the project. Store schema and connection `authenticationSpecification` round-trip opaquely, since auth is resolved server-side.
