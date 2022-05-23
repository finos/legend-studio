# @finos/legend-application

## 3.0.3

## 3.0.2

### Patch Changes

- [#1145](https://github.com/finos/legend-studio/pull/1145) [`b5c835f7`](https://github.com/finos/legend-studio/commit/b5c835f7d4fa4b7b0aa98b5f3cb7f12cd110dfcb) ([@akphi](https://github.com/akphi)) - Fix a regression introduced in `5.0.0` where the link to the documentation page does not work.

## 3.0.1

## 3.0.0

### Major Changes

- [#962](https://github.com/finos/legend-studio/pull/962) [`9ba53bc7`](https://github.com/finos/legend-studio/commit/9ba53bc7f2fead23efb1fe061dff94d4f4c73beb) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Moved definition of Pure grammar tokens to `@finos/legend-graph`.

* [#1113](https://github.com/finos/legend-studio/pull/1113) [`e35042ba`](https://github.com/finos/legend-studio/commit/e35042bacf7999e8a5d9836fa6b31cf89cc66237) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Adopt `ESM` styled exports: i.e. we now make use of `exports` field (and removed `main` field) in `package.json`.

### Minor Changes

- [#962](https://github.com/finos/legend-studio/pull/962) [`9ba53bc7`](https://github.com/finos/legend-studio/commit/9ba53bc7f2fead23efb1fe061dff94d4f4c73beb) ([@akphi](https://github.com/akphi)) - Create `LegendApplicationPlugin` and make other application plugins extend this abstract plugin. Also modify the mechanism to load documentation config so that doc entries from the config will override entries defined natively in the applications.

## 2.0.14

## 2.0.13

## 2.0.12

### Patch Changes

- [#1064](https://github.com/finos/legend-studio/pull/1064) [`3db857d1`](https://github.com/finos/legend-studio/commit/3db857d15a4953d2753aa76abe0f8f2dc4ee8688) ([@gayathrir11](https://github.com/gayathrir11)) - Fix a regression where applications are not showing notification by bringing back `<NotificationManager />` to `<LegendApplicationComponentFrameworkProvider/>`.

## 2.0.11

## 2.0.10

## 2.0.9

## 2.0.8

## 2.0.7

## 2.0.6

## 2.0.5

## 2.0.4

## 2.0.3

## 2.0.2

## 2.0.1

## 2.0.0

### Major Changes

- [#981](https://github.com/finos/legend-studio/pull/981) [`e3efb96f`](https://github.com/finos/legend-studio/commit/e3efb96feb2bcd5e0b9578bafd90a586ad65ed7e) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Renamed `APPLICATION_LOG_EVENT` to `APPLICATION_EVENT` which is meant to be used for more than just logging.

## 1.2.2

## 1.2.1

## 1.2.0

### Minor Changes

- [#899](https://github.com/finos/legend-studio/pull/899) [`d4f0aec5`](https://github.com/finos/legend-studio/commit/d4f0aec5d536b3ad167ac702cc5c2070c265ed51) ([@akphi](https://github.com/akphi)) - Create `LegendApplicationDocumentationRegistry` with shape `documentation: { url: string, entries: Record<string, string>}` to store links/references for documentation.

## 1.1.9

## 1.1.8

## 1.1.7

## 1.1.6

## 1.1.5

## 1.1.4

## 1.1.3

## 1.1.2

## 1.1.1

## 1.1.0

### Minor Changes

- [#788](https://github.com/finos/legend-studio/pull/788) [`ca293f83`](https://github.com/finos/legend-studio/commit/ca293f83e554f488f58ee77249838b6b87a3e3da) ([@akphi](https://github.com/akphi)) - Rename `notification snackbar` to `notification manager`. Bundle `notification manager`, `blocking alert`, and `action alert` as well as `LegendStyleProvider` into `LegendApplicationComponentFrameworkProvider`.

### Patch Changes

- [#768](https://github.com/finos/legend-studio/pull/768) [`f2927570`](https://github.com/finos/legend-studio/commit/f2927570b2afdc2954912bdbb20058606d2cf8bc) ([@gayathrir11](https://github.com/gayathrir11)) - Handle empty error messages from Engine.

## 1.0.3

## 1.0.2

## 1.0.1

## 1.0.0

### Major Changes

- [#707](https://github.com/finos/legend-studio/pull/707) [`5d9912d9`](https://github.com/finos/legend-studio/commit/5d9912d9a2c883e23d8852325a25fe59ae7597b1) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Loggers are now considered as plugins, as such, we nolonger expose `.withLoggers()` when booting the application.

* [#707](https://github.com/finos/legend-studio/pull/707) [`5d9912d9`](https://github.com/finos/legend-studio/commit/5d9912d9a2c883e23d8852325a25fe59ae7597b1) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Create a new abstract class `LegendApplicationPluginManager` that contains plugins that is relevant at application level, such as `telemetry`, `tracer`, `logger`, etc. Now all specific Legend applications plugin manager must extend this class, e.g. `LegendStudioPluginManager extends LegendApplicationPluginManager`.

## 0.2.2

## 0.2.1

## 0.2.0

### Minor Changes

- [#692](https://github.com/finos/legend-studio/pull/692) [`caab0e67`](https://github.com/finos/legend-studio/commit/caab0e6772181e514b246fe6030a02e7169952cc) ([@akphi](https://github.com/akphi)) - Add `AppHeader` component.

## 0.1.2

## 0.1.1

### Patch Changes

- [#618](https://github.com/finos/legend-studio/pull/618) [`dcf06d09`](https://github.com/finos/legend-studio/commit/dcf06d09bc82d84e05a3d1e6af0d7f445c3d0b39) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Avoid auto-hiding error notification.
  Fix the width of expanded notification window.

## 0.1.0

### Minor Changes

- [#587](https://github.com/finos/legend-studio/pull/587) [`a6a0329`](https://github.com/finos/legend-studio/commit/a6a03290a2c78071bb53549b88f5fa075321afdb) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Improves the display of notifications with a long message by allowing users to copy message content and toggle to `expand` to see the full message.

### Patch Changes

- [#584](https://github.com/finos/legend-studio/pull/584) [`b32e834b`](https://github.com/finos/legend-studio/commit/b32e834ba037658de53632403c79aa0f0f651971) ([@akphi](https://github.com/akphi)) - `notifyError()` now will only take `Error | string`. This will help Typescript catches cases where we pass non-error objects to the notification dispatcher.

## 0.0.13

## 0.0.12

## 0.0.11

## 0.0.10

## 0.0.9

## 0.0.8

### Patch Changes

- [#506](https://github.com/finos/legend-studio/pull/506) [`4fd0d256`](https://github.com/finos/legend-studio/commit/4fd0d2560ef245d97f1d86a4a6ed227a9c3d2cbe) ([@akphi](https://github.com/akphi)) - Add popup mode for `LambdaEditor` to allow more spaces for users to work with big lambdas. Also, document `LambdaEditor` props and add 2 new flags to disable `expansion` mode and `popup` mode.

## 0.0.7

## 0.0.6

## 0.0.5

## 0.0.4

## 0.0.3

## 0.0.2

## 0.0.1
