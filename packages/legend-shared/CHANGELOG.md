# @finos/legend-shared

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
