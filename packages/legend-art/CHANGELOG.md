# @finos/legend-art

## 2.0.5

## 2.0.4

## 2.0.3

## 2.0.2

## 2.0.1

## 2.0.0

### Major Changes

- [#1190](https://github.com/finos/legend-studio/pull/1190) [`4c076c98`](https://github.com/finos/legend-studio/commit/4c076c985b5efd0da3ec2f141ddc9cd53f0ba8f6) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Use `NodeNext` (`ESM` module resolution strategy for `Typescript`). Read more about this [here](https://devblogs.microsoft.com/typescript/announcing-typescript-4-7/#esm-nodejs). This transition would be relatively smooth, except that we must use `ESM`-styled import (with extensions) for relative path. For example:

  ```ts
  // before
  import { someFunction } from './Utils';
  // after
  import { someFunction } from './Utils.js';
  ```

### Minor Changes

- [#1166](https://github.com/finos/legend-studio/pull/1166) [`41805dba`](https://github.com/finos/legend-studio/commit/41805dbaf92d7dfca14f954d1bc00ff5f5acaa5a) ([@akphi](https://github.com/akphi)) - Add `BasePopper` component, `popper` is similar to `popover`, except that it does not come with a `backdrop`.

## 1.0.1

## 1.0.0

### Major Changes

- [#1113](https://github.com/finos/legend-studio/pull/1113) [`e35042ba`](https://github.com/finos/legend-studio/commit/e35042bacf7999e8a5d9836fa6b31cf89cc66237) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Adopt `ESM` styled exports: i.e. we now make use of `exports` field (and removed `main` field) in `package.json`.

### Minor Changes

- [#1131](https://github.com/finos/legend-studio/pull/1131) [`d194cce7`](https://github.com/finos/legend-studio/commit/d194cce765ebc68d5494a9a645431a37bb88725e) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Introduced `radio group` component.

## 0.3.18

## 0.3.17

## 0.3.16

## 0.3.15

## 0.3.14

## 0.3.13

## 0.3.12

## 0.3.11

## 0.3.10

## 0.3.9

## 0.3.8

## 0.3.7

## 0.3.6

## 0.3.5

## 0.3.4

## 0.3.3

## 0.3.2

## 0.3.1

## 0.3.0

### Minor Changes

- [#788](https://github.com/finos/legend-studio/pull/788) [`ca293f83`](https://github.com/finos/legend-studio/commit/ca293f83e554f488f58ee77249838b6b87a3e3da) ([@akphi](https://github.com/akphi)) - Consolidate all `react-icons` icons used in other packages. Rename all `Pure`-related icons to include prefix `PURE_`.

* [#788](https://github.com/finos/legend-studio/pull/788) [`ca293f83`](https://github.com/finos/legend-studio/commit/ca293f83e554f488f58ee77249838b6b87a3e3da) ([@akphi](https://github.com/akphi)) - Consolidate all `@mui/material` components used in other packages.

- [#777](https://github.com/finos/legend-studio/pull/777) [`d54fe6f5`](https://github.com/finos/legend-studio/commit/d54fe6f51d826bec7902971841244d89ac035723) ([@akphi](https://github.com/akphi)) - Upgrade to `Material UI (mui)` to version 5 following their [migration guide](https://mui.com/guides/migration-v4/#menu).

### Patch Changes

- [#769](https://github.com/finos/legend-studio/pull/769) [`57b9d9c9`](https://github.com/finos/legend-studio/commit/57b9d9c9915b7d7707c7f15568ee3620a1e309d7) ([@akphi](https://github.com/akphi)) - Fix `ApplicationError` to have message default to `non-empty` (i.e. `(no error message)`).

## 0.2.3

## 0.2.2

## 0.2.1

## 0.2.0

## 0.1.2

### Patch Changes

- [#692](https://github.com/finos/legend-studio/pull/692) [`caab0e67`](https://github.com/finos/legend-studio/commit/caab0e6772181e514b246fe6030a02e7169952cc) ([@akphi](https://github.com/akphi)) - Add `HotkeyConfiguration` utilities and builders to setup `react-hotkeys` in Legend applications.

## 0.1.1

## 0.1.0

### Minor Changes

- [#620](https://github.com/finos/legend-studio/pull/620) [`efe01d92`](https://github.com/finos/legend-studio/commit/efe01d9218034dc358420b65f20da9715eb55589) ([@akphi](https://github.com/akphi)) - Make the text value we get from all `monaco-editor` instances more consistent by exposing the method `getEditorValue()` that returns the text value with line-ending option `LF` and `normalizeLineEnding()` to remove `CR` characters `\r` in the input value, see example usage of `TextInputEditor.tsx` for example ([#608](https://github.com/finos/legend-studio/issues/608)).

### Patch Changes

- [#620](https://github.com/finos/legend-studio/pull/620) [`efe01d92`](https://github.com/finos/legend-studio/commit/efe01d9218034dc358420b65f20da9715eb55589) ([@akphi](https://github.com/akphi)) - Make the default for `material-ui` `<Dialog>` component to [ignore `maxWidth`](https://mui.com/api/dialog/#props) so that our dialogs with fixed width that exceeds the default max-width value are centered properly.

## 0.0.9

## 0.0.8

## 0.0.7

## 0.0.6

## 0.0.5

## 0.0.4

## 0.0.3

## 0.0.2

## 0.0.1

### Patch Changes

- [#422](https://github.com/finos/legend-studio/pull/422) [`985eef5d`](https://github.com/finos/legend-studio/commit/985eef5def2e4c115ba2ac25dbb851e084758ddc) ([@akphi](https://github.com/akphi)) - Rename package from `@finos/legend-studio-components` to `@finos/legend-art`.
