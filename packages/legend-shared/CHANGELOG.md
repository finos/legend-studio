# @finos/legend-shared

## 2.0.1

## 2.0.0

### Major Changes

- [#1115](https://github.com/finos/legend-studio/pull/1115) [`4623d5c1`](https://github.com/finos/legend-studio/commit/4623d5c1970823151de2f820d79662b560641c67) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Rework `serializeArray` and `deserializeArray`: these methods now take an `options` object instead of just the `skipIfEmpty: boolean` flag. This options object has the original `skipIfEmpty?: boolean | undefined` and a new flag called `INTERNAL__forceReturnEmptyInTest?: boolean | undefined` to make exception for grammar roundtrip test.

* [#1115](https://github.com/finos/legend-studio/pull/1115) [`4623d5c1`](https://github.com/finos/legend-studio/commit/4623d5c1970823151de2f820d79662b560641c67) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Remove `BasicSerializationFactory` as now `SerializationFactory` allows overriding. `NullphobicSerializationFactory` has also been removed in favor of the new options `deserializeNullAsUndefined` one can pass when constructing `SerializationFactory`.

- [#1113](https://github.com/finos/legend-studio/pull/1113) [`e35042ba`](https://github.com/finos/legend-studio/commit/e35042bacf7999e8a5d9836fa6b31cf89cc66237) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Adopt `ESM` styled exports: i.e. we now make use of `exports` field (and removed `main` field) in `package.json`.

## 1.3.1

## 1.3.0

### Minor Changes

- [#1041](https://github.com/finos/legend-studio/pull/1041) [`5a76b228`](https://github.com/finos/legend-studio/commit/5a76b2289cb88569e9a1acb2287960de3e593d25) ([@akphi](https://github.com/akphi)) - Expose utilities to render `MarkdownText`. This will make documentation in our app more convenient.

## 1.2.9

## 1.2.8

## 1.2.7

## 1.2.6

## 1.2.5

## 1.2.4

## 1.2.3

## 1.2.2

## 1.2.1

## 1.2.0

### Minor Changes

- [#836](https://github.com/finos/legend-studio/pull/836) [`4e08df9a`](https://github.com/finos/legend-studio/commit/4e08df9ae59e50cd5400d5d9bdcf43f1c7d2b423) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add `text/csv` as a `ContentType`.

## 1.1.2

## 1.1.1

## 1.1.0

### Minor Changes

- [#755](https://github.com/finos/legend-studio/pull/755) [`61821cd6`](https://github.com/finos/legend-studio/commit/61821cd62c3b8b1a16124a092038ab963311de17) ([@akphi](https://github.com/akphi)) - Allow configuring base headers for `AbstractServerClient`.

### Patch Changes

- [#769](https://github.com/finos/legend-studio/pull/769) [`57b9d9c9`](https://github.com/finos/legend-studio/commit/57b9d9c9915b7d7707c7f15568ee3620a1e309d7) ([@akphi](https://github.com/akphi)) - Fix a problem with text-editor not showing tooltip for error with empty message ([#708](https://github.com/finos/legend-studio/issues/708)).

## 1.0.2

## 1.0.1

### Patch Changes

- [#723](https://github.com/finos/legend-studio/pull/723) [`856e11e0`](https://github.com/finos/legend-studio/commit/856e11e047d1530c263f8e01f5f8bbaac262038e) ([@akphi](https://github.com/akphi)) - Add `NullphobicSerializationFactory` which only differs to `SerializationFactory` in its deserialization helper method: it will prune all `null` values found in the JSON before deserializing. This is to accommodate for use case where some server (e.g. Java using Jackson) returns `null` for fields whose values are not set (technically, the server should return `undefined`, but this is unfortunately, not always the case).

## 1.0.0

### Major Changes

- [#707](https://github.com/finos/legend-studio/pull/707) [`5d9912d9`](https://github.com/finos/legend-studio/commit/5d9912d9a2c883e23d8852325a25fe59ae7597b1) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** `Logger` now conforms to plugin structure, the new class to use is `LoggerPlugin`. Create the interface `PluginConsumer` with method `registerPlugins(plugins: AbstractPluginManager[]): void` to make plugin consumers like `Log`, `TelemetryService`, and `TracerService` more similar and systematic.

### Minor Changes

- [#707](https://github.com/finos/legend-studio/pull/707) [`5d9912d9`](https://github.com/finos/legend-studio/commit/5d9912d9a2c883e23d8852325a25fe59ae7597b1) ([@akphi](https://github.com/akphi)) - The abstract plugin now has a default generic `install` method which just registers the plugin to the compatible plugin manager, this saves plugin author some time and code when implementing plugins.

* [#707](https://github.com/finos/legend-studio/pull/707) [`5d9912d9`](https://github.com/finos/legend-studio/commit/5d9912d9a2c883e23d8852325a25fe59ae7597b1) ([@akphi](https://github.com/akphi)) - Introduce `EventNotifierService` which is very similar to telemetry service but will help creating event hook for cross-application integration (e.g. `Github web-hooks`); also implemented `IframeEventNotifierPlugin` to help with communication between Legend applications and applications that embedded them in `iframe`s.

### Patch Changes

- [#707](https://github.com/finos/legend-studio/pull/707) [`5d9912d9`](https://github.com/finos/legend-studio/commit/5d9912d9a2c883e23d8852325a25fe59ae7597b1) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** `AbstractServerClient` nolonger allows registering `TracerServicePlugin`s for the internal `TracerService` instance, but now requires explicitly registering an instance of `TracerService` instead.

## 0.0.9

## 0.0.8

## 0.0.7

## 0.0.6

## 0.0.5

## 0.0.4

## 0.0.3

### Patch Changes

- [#464](https://github.com/finos/legend-studio/pull/464) [`945574e7`](https://github.com/finos/legend-studio/commit/945574e725ea6103c9016554ce35ef4d6aeaf478) ([@akphi](https://github.com/akphi)) - Document and fix `Randomizer` bug with `getRandomItemInCollection()` and `getRandomPositiveInteger()` methods (related to [#463](https://github.com/finos/legend-studio/issues/463)). Rename `getRandomPositiveInteger()` to `getRandomWholeNumber()`.

## 0.0.2

### Patch Changes

- [#439](https://github.com/finos/legend-studio/pull/439) [`4bcb2af5`](https://github.com/finos/legend-studio/commit/4bcb2af5ea2ddc0bfa77b24582b8cf504456ee97) ([@akphi](https://github.com/akphi)) - Fix a potential circular-dependency issue with the package that could mess up usage with `Webpack`.

## 0.0.1

### Patch Changes

- [#410](https://github.com/finos/legend-studio/pull/410) [`a1dfc165`](https://github.com/finos/legend-studio/commit/a1dfc165dcf98eeea624400abc9f3c97eb2fda52) ([@akphi](https://github.com/akphi)) - Improve error message in URL builder for case where base URL is not specified and a non-absolute URL is provided.

- [#410](https://github.com/finos/legend-studio/pull/410) [`a1dfc165`](https://github.com/finos/legend-studio/commit/a1dfc165dcf98eeea624400abc9f3c97eb2fda52) ([@akphi](https://github.com/akphi)) - Make `Logger` requires `LogEvent` instead of log event name as the first argument. This will make logger implementation more extensible as we can support features like `channel`, `timestamp`, etc.

- [#422](https://github.com/finos/legend-studio/pull/422) [`985eef5d`](https://github.com/finos/legend-studio/commit/985eef5def2e4c115ba2ac25dbb851e084758ddc) ([@akphi](https://github.com/akphi)) - `Randomizer` now exports a class instead of a collection of functions.

- [#422](https://github.com/finos/legend-studio/pull/422) [`985eef5d`](https://github.com/finos/legend-studio/commit/985eef5def2e4c115ba2ac25dbb851e084758ddc) ([@akphi](https://github.com/akphi)) - Rename package from `@finos/legend-studio-shared` to `@finos/legend-shared`.

- [#418](https://github.com/finos/legend-studio/pull/418) [`bb8cd369`](https://github.com/finos/legend-studio/commit/bb8cd369da33fe58523d8eddf6bb0991da72edf1) ([@akphi](https://github.com/akphi)) - Document the auto re-authentication feature using `<iframe>` in `AbstractServerClient`. Due to its situational usage, we realise that we should also rename the config for it.

  Merge `@finos/legend-studio-network` into `@finos/legend-shared`.
