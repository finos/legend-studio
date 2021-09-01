# Changelog

This is the changelog for Legend applications: Legend Studio, Legend Query, etc. For respective libraries changelogs, please navigate to their respective directory in the codebase, e.g. [@finos/legend-shared](https://github.com/finos/legend-studio/tree/master/packages/legend-shared).

> This changelog will eventually be moved to http://github.com/finos/legend

# 0.0.1 (August 2021)

**Update 0.0.2**: For more details, check out this [pull request](https://github.com/finos/legend-studio/pull/433)

**Update 0.0.3**: For more details, check out this [pull request](https://github.com/finos/legend-studio/pull/438)

---

This marks the official release of the stand-alone version of query builder, also known as `Legend Query`. Thanks to this, we took the time to re-organize our codebase to make it easier to introduce even more Legend applications in the future.

> For more details, check out pull request https://github.com/finos/legend-studio/pull/414

## Deployment

### Studio config

- Renamed `metadata` to `depot`
- Renamed `options` to `extensions`
- Removed `TEMPORARY__disableSDLCProjectStructureSupport` as SDLC pipeline has now been supported as part of https://github.com/finos/legend-sdlc/pull/223
- Added a new config for the base URL of `Query API` in engine server client via the settings `engine: { queryUrl?: string }`. _This is the start of an effort to break `Legend Engine` server to multiple pieces for better monitoring and performance_

## Extension authoring

- Renamed `EditorPlugin` to `StudioPlugin`
- Renamed `getExtraNewElementDriverEditorCreators()` to `getExtraNewElementDriverEditorRenderers()` and `getExtraElementEditorCreators()` to `getExtraElementEditorRenderers()` in `StudioPlugin`
- Moved `getExtraPureGrammarParserNames()`, `getExtraPureGrammarKeywords()`, `getExtraPureGrammarElementLabelers()`, and `getExtraExposedSystemElementPath()` to `PureGraphManagerPlugin`
- We made a decision to change the prefix of extensions package names to `@finos/legend-extension-*` to make it more simple extension maintainers. _Prior to this, we considered an option to split each plugin by the layers they serve, for example, `@finos/legend-studio-preset-dsl-text` is meant for holding Studio components extension for `DSL Text`, whereas `@finos/legend-graph-preset-dsl-text` holds the metamodels, graph manager extension of `DSL Text`. However, doing this way will make the codebase hard to maintain._
- We also added documentation to each extension methods to help with the extension development process.

## Engineering

### Studio codebase restructure

Since the introduction of `Legend Query` in the codebase, we realize the need to restructure the codebase in order to reuse shared parts between Legend applications. This restructuring directly translate to the merging, splitting, and renaming of some of our existing `NPM` packages:

- [@finos/legend-studio-components](https://www.npmjs.com/package/@finos/legend-studio-components): Renamed to [@finos/legend-art](https://www.npmjs.com/package/@finos/legend-art)
- [@finos/legend-studio-dev-utils](https://www.npmjs.com/package/@finos/legend-studio-dev-utils): Renamed to [@finos/legend-dev-utils](https://www.npmjs.com/package/@finos/legend-dev-utils)
- [@finos/legend-studio-shared](https://www.npmjs.com/package/@finos/legend-studio-shared): Renamed to [@finos/legend-shared](https://www.npmjs.com/package/@finos/legend-shared)
- [@finos/legend-studio-network](https://www.npmjs.com/package/@finos/legend-studio-network): Merged into [@finos/legend-shared](https://www.npmjs.com/package/@finos/legend-shared)
- [@finos/legend-studio-preset-external-format-json-schema](https://www.npmjs.com/package/@finos/legend-studio-preset-external-format-json-schema): Renamed to [@finos/legend-extension-external-format-json-schema](https://www.npmjs.com/package/@finos/legend-extension-external-format-json-schema)
- [@finos/legend-studio-preset-dsl-text](https://www.npmjs.com/package/@finos/legend-studio-preset-dsl-text): Renamed to [@finos/legend-extension-dsl-text](https://www.npmjs.com/package/@finos/legend-extension-dsl-text)
- [@finos/legend-studio-plugin-tracer-zipkin](https://www.npmjs.com/package/@finos/legend-studio-plugin-tracer-zipkin): Renamed to [@finos/legend-tracer-plugin-zipkin](https://www.npmjs.com/package/@finos/legend-tracer-plugin-zipkin)

Some new essential packages are introduced in an effort to make core more modularized and compact:

- [@finos/legend-server-sdlc](https://www.npmjs.com/package/@finos/legend-server-sdlc): Models and client for server backend for [Legend SDLC](https://github.com/finos/legend-sdlc)
- [@finos/legend-server-depot](https://www.npmjs.com/package/@finos/legend-server-depot): Models and client for server backend for [Legend Depot](https://github.com/finos/legend-depot)
- [@finos/legend-model-storage](https://www.npmjs.com/package/@finos/legend-model-storage): Storage models (e.g. `Entity`) shared by [@finos/legend-server-sdlc](https://www.npmjs.com/package/@finos/legend-server-sdlc) and [@finos/legend-server-depot](https://www.npmjs.com/package/@finos/legend-server-depot)
- [@finos/legend-graph](https://www.npmjs.com/package/@finos/legend-graph): PURE graph, metamodels as well as graph manager including protocol models and server backend for [Legend Engine](https://github.com/finos/legend-engine)
- [@finos/legend-application](https://www.npmjs.com/package/@finos/legend-application): Common framework for Legend application creation, including components, styling, config, state manager, etc.
- [@finos/legend-query](https://www.npmjs.com/package/@finos/legend-query): Core components of `Legend Query`
- [@finos/legend-studio-app](https://www.npmjs.com/package/@finos/studio-app): `Legend Studio` application with default set of extensions. **This library's version will be considered the main release version**
- [@finos/legend-query-app](https://www.npmjs.com/package/@finos/legend-query-app): `Legend Query` application with default set of extensions

### Legend application testing improvements

Grammar roundtrip test runner will now also check for compilation issues using [Legend Engine](https://github.com/finos/legend-engine) server. Also, before, when there is a test case that fails at some testing phase (grammar roundtrip check, hashing, etc.), we need to disable it entirely; now, we can pick the check to exclude for each test case.

### Adopt Typescript 4.4

We now use [Typescript 4.4](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-4.html) in the codebase. This means that we can now simplify `try/catch` expression as `unknown` is now the [default type in catch variables](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-4.html#defaulting-to-the-unknown-type-in-catch-variables---useunknownincatchvariables), as well as re-writing type definition of [optional properties in models to be more accurate](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-4.html#exact-optional-property-types---exactoptionalpropertytypes) thanks to the new flag `--exactOptionalPropertyTypes`. We also benefit from other improvements which do not require code changes, such as better declaration emit and incremental build performance, and particularly the better control flow analysis.

## Notable fixes

- [442](https://github.com/finos/legend-studio/issues/442) `meta::pure::profiles::doc` is hidden from profile selector in Studio model editors
- [425](https://github.com/finos/legend-studio/issues/425) Mock data generator for models sometimes fail to generate for properties of type `Boolean`
- [426](https://github.com/finos/legend-studio/issues/426) Committed reviews are not shown when there is no previous releases
- [399](https://github.com/finos/legend-studio/issues/399) Multiple mapped properties disappear in mapping editor
- [354](https://github.com/finos/legend-studio/issues/354) Viewer mode does not allow viewing project configuration
- [298](https://github.com/finos/legend-studio/issues/298) Operation class mapping editor allows cycle
