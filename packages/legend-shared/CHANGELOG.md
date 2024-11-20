# @finos/legend-shared

## 10.0.61

## 10.0.60

## 10.0.59

## 10.0.58

## 10.0.57

## 10.0.56

## 10.0.55

## 10.0.54

## 10.0.53

## 10.0.52

## 10.0.51

### Patch Changes

- [#3389](https://github.com/finos/legend-studio/pull/3389) [`496be89`](https://github.com/finos/legend-studio/commit/496be891d1716f3e016c09012e07fa116fd9e0ae) ([@travisstebbins](https://github.com/travisstebbins)) - Export new FuzzySearchEngineSortFunctionArg type

## 10.0.50

## 10.0.49

## 10.0.48

## 10.0.47

## 10.0.46

## 10.0.45

## 10.0.44

## 10.0.43

## 10.0.42

## 10.0.41

## 10.0.40

## 10.0.39

## 10.0.38

### Patch Changes

- [#3198](https://github.com/finos/legend-studio/pull/3198) [`b60c5cf`](https://github.com/finos/legend-studio/commit/b60c5cf844d34d26e9d5f5421020907afaf061bc) ([@travisstebbins](https://github.com/travisstebbins)) - Add isNonEmptyString function

## 10.0.37

## 10.0.36

### Patch Changes

- [#3197](https://github.com/finos/legend-studio/pull/3197) [`aa65b0f`](https://github.com/finos/legend-studio/commit/aa65b0f4f58569484b215926974f916a712e1f56) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Move semver util to legend-shared

## 10.0.35

## 10.0.34

### Patch Changes

- [#3032](https://github.com/finos/legend-studio/pull/3032) [`61a95131c`](https://github.com/finos/legend-studio/commit/61a95131c5842445933785bbeb2167db127a0551) ([@travisstebbins](https://github.com/travisstebbins)) - Export lodash clone function

## 10.0.33

## 10.0.32

## 10.0.31

## 10.0.30

### Patch Changes

- [#2882](https://github.com/finos/legend-studio/pull/2882) [`b98f72496`](https://github.com/finos/legend-studio/commit/b98f724965369a675ce436906e4a930814381964) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Fix parsing bug in sortObjectKeys CommonUtils

## 10.0.29

## 10.0.28

## 10.0.27

## 10.0.26

## 10.0.25

## 10.0.24

## 10.0.23

## 10.0.22

## 10.0.21

## 10.0.20

## 10.0.19

## 10.0.18

## 10.0.17

## 10.0.16

## 10.0.15

## 10.0.14

## 10.0.13

## 10.0.12

## 10.0.11

## 10.0.10

## 10.0.9

## 10.0.8

## 10.0.7

## 10.0.6

## 10.0.5

## 10.0.4

## 10.0.3

## 10.0.2

## 10.0.1

## 10.0.0

### Major Changes

- [#2134](https://github.com/finos/legend-studio/pull/2134) [`94d7a16bc`](https://github.com/finos/legend-studio/commit/94d7a16bcdde97cb57c027dd16ab2408d8a59f67) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Renamed `getNullableFirstElement()` to `getNullableFirstEntry()` and `getNullableLastElement()` to `getNullableLastEntry()`.

## 9.0.0

### Major Changes

- [#2113](https://github.com/finos/legend-studio/pull/2113) [`4e7b750ee`](https://github.com/finos/legend-studio/commit/4e7b750ee649033b66c87b84b4ff242ad3829580) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Moved all test utils to a separate export path `@finos/legend-shared/test`.

## 8.2.0

## 8.1.0

### Minor Changes

- [#2094](https://github.com/finos/legend-studio/pull/2094) [`7d8035415`](https://github.com/finos/legend-studio/commit/7d803541596f7dab018fae833eba01fdc7bbfcdb) ([@akphi](https://github.com/akphi)) - Add `FuzzySearch` engine.

## 8.0.5

## 8.0.4

## 8.0.3

## 8.0.2

### Patch Changes

- [#2036](https://github.com/finos/legend-studio/pull/2036) [`06248e48f`](https://github.com/finos/legend-studio/commit/06248e48f346b074b5fdf9795d5bd903a2c82070) ([@xannem](https://github.com/xannem)) - Prettify const names with acronyms

## 8.0.1

## 8.0.0

### Major Changes

- [#1987](https://github.com/finos/legend-studio/pull/1987) [`28ca8adae`](https://github.com/finos/legend-studio/commit/28ca8adaec6eb5e2cd850d247685489b21a5bfbb) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Renamed `Log` to `LogService`.

## 7.0.0

### Major Changes

- [#1973](https://github.com/finos/legend-studio/pull/1973) [`830934048`](https://github.com/finos/legend-studio/commit/8309340482c7a1aa21fedbd90063cd0c521a5ddf) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Moved `EventNotifierService` and `TelemetryService` to `@finos/legend-application` and reshaped `TelemetryService` as well as `TelemetryServicePlugin` to take a `setup()` method for instead of just allowing setting the user ID via `setUserId()`.

### Patch Changes

- [#1973](https://github.com/finos/legend-studio/pull/1973) [`830934048`](https://github.com/finos/legend-studio/commit/8309340482c7a1aa21fedbd90063cd0c521a5ddf) ([@akphi](https://github.com/akphi)) - Fix a bug with `StopWatch` elapsed is not properly calculated.

## 6.2.23

### Patch Changes

- [#1960](https://github.com/finos/legend-studio/pull/1960) [`52c944f93`](https://github.com/finos/legend-studio/commit/52c944f93815d790263711c261ca5514d74b6b28) ([@xannem](https://github.com/xannem)) - Fix pretty const name.

## 6.2.22

## 6.2.21

## 6.2.20

## 6.2.19

### Patch Changes

- [#1909](https://github.com/finos/legend-studio/pull/1909) [`130d068d0`](https://github.com/finos/legend-studio/commit/130d068d0932dde5786ecf8de6dacf2bffcc6143) ([@xannem](https://github.com/xannem)) - Humanize 'ID' and 'Id' names.

## 6.2.18

## 6.2.17

## 6.2.16

### Patch Changes

- [#1873](https://github.com/finos/legend-studio/pull/1873) [`1a5080f89`](https://github.com/finos/legend-studio/commit/1a5080f8914b1827e2f360379f5170f5683453e3) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add `prettyDuaration` to display time interval.

## 6.2.15

## 6.2.14

## 6.2.13

## 6.2.12

## 6.2.11

## 6.2.10

## 6.2.9

## 6.2.8

## 6.2.7

## 6.2.6

## 6.2.5

## 6.2.4

## 6.2.3

## 6.2.2

## 6.2.1

## 6.2.0

### Minor Changes

- [#1592](https://github.com/finos/legend-studio/pull/1592) [`6f8aa5ce`](https://github.com/finos/legend-studio/commit/6f8aa5ce7c485dffd55f29d3ac7e4bf01f91b7ae) ([@akphi](https://github.com/akphi)) - Add `sanitizeURL` utility.

## 6.1.5

## 6.1.4

## 6.1.3

## 6.1.2

## 6.1.1

## 6.1.0

## 6.0.4

## 6.0.3

## 6.0.2

## 6.0.1

## 6.0.0

### Major Changes

- [#1388](https://github.com/finos/legend-studio/pull/1388) [`f30a591e`](https://github.com/finos/legend-studio/commit/f30a591e75687a52e93faa577731c2f7f372f8bf) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** `hashString()` has been replaced by a more generic version `hashValue()` which accepts `string`, `boolean`, and `number` values.

## 5.0.3

## 5.0.2

## 5.0.1

## 5.0.0

### Major Changes

- [#1323](https://github.com/finos/legend-studio/pull/1323) [`dbbbd63b`](https://github.com/finos/legend-studio/commit/dbbbd63b3dda4229e7bf36fb59a0c7b3d525d775) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Renamed `TEMPORARRY__JestMatcher` to `TEMPORARY__JestMatcher` to fix the typo.

## 4.0.3

## 4.0.2

## 4.0.1

## 4.0.0

### Major Changes

- [#1239](https://github.com/finos/legend-studio/pull/1239) [`4dacea12`](https://github.com/finos/legend-studio/commit/4dacea12f53e93eab6e53f29febe94c7693109e2) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** `recursiveOmit()` utility now takes a checker function instead of a list of property keys to prune.

## 3.0.2

## 3.0.1

## 3.0.0

### Major Changes

- [#1190](https://github.com/finos/legend-studio/pull/1190) [`4c076c98`](https://github.com/finos/legend-studio/commit/4c076c985b5efd0da3ec2f141ddc9cd53f0ba8f6) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Use `NodeNext` (`ESM` module resolution strategy for `Typescript`). Read more about this [here](https://devblogs.microsoft.com/typescript/announcing-typescript-4-7/#esm-nodejs). This transition would be relatively smooth, except that we must use `ESM`-styled import (with extensions) for relative path. For example:

  ```ts
  // before
  import { someFunction } from './Utils';
  // after
  import { someFunction } from './Utils.js';
  ```

* [#1190](https://github.com/finos/legend-studio/pull/1190) [`4c076c98`](https://github.com/finos/legend-studio/commit/4c076c985b5efd0da3ec2f141ddc9cd53f0ba8f6) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Use `@jest/globals` to import `jest` constructs, such as, `expect`, `test`, etc. We bumped into some problem when trying to disable `injectGlobals` in `Jest` config, so that would be left on as default for now, but at least with this change, we restrict usage of `jest` globals in the codebase.

- [#1166](https://github.com/finos/legend-studio/pull/1166) [`41805dba`](https://github.com/finos/legend-studio/commit/41805dbaf92d7dfca14f954d1bc00ff5f5acaa5a) ([@akphi](https://github.com/akphi)) - Removed `EventNotifierService`.

### Patch Changes

- [#1189](https://github.com/finos/legend-studio/pull/1189) [`997ef375`](https://github.com/finos/legend-studio/commit/997ef3750229417d442058a2d6480e6324277d7a) ([@akphi](https://github.com/akphi)) - Make sure network client overide `Content-Type` header properly when compression is enabled.

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
