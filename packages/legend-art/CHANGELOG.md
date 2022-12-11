# @finos/legend-art

## 5.0.14

## 5.0.13

## 5.0.12

## 5.0.11

## 5.0.10

## 5.0.9

## 5.0.8

### Patch Changes

- [#1714](https://github.com/finos/legend-studio/pull/1714) [`59fc8c4aa`](https://github.com/finos/legend-studio/commit/59fc8c4aae608dcc7b64be59762ab248dd4666c8) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Fixed a regression introduced in #1705 by enabling edit of the selected tag.

## 5.0.7

## 5.0.6

### Patch Changes

- [#1678](https://github.com/finos/legend-studio/pull/1678) [`a146b94f3`](https://github.com/finos/legend-studio/commit/a146b94f31d990c4f7b4dcfc4367c71c1f46b7cc) ([@xannem](https://github.com/xannem)) - fix: create workspace group toggle

## 5.0.5

### Patch Changes

- [#1667](https://github.com/finos/legend-studio/pull/1667) [`0fb1e7c6`](https://github.com/finos/legend-studio/commit/0fb1e7c6f3edb35ddb4783bd21159f581c367976) ([@xannem](https://github.com/xannem)) - make scrollbar color lighter in dark mode selector

## 5.0.4

## 5.0.3

## 5.0.2

## 5.0.1

## 5.0.0

### Major Changes

- [#1540](https://github.com/finos/legend-studio/pull/1540) [`d41811eb`](https://github.com/finos/legend-studio/commit/d41811ebff8177905ad37de45945bb12d8a8926d) ([@xannem](https://github.com/xannem)) - **BREAKING CHANGE:** Renamed `PanelSection` to `PanelFormSection`, `PanelFormTextEditor` and `PanelFormBooleanEditor` are not renamed to `PanelFormTextField` and `PanelFormBooleanField` respectively and are now wrapped with a `PanelFormSection`.

## 4.1.0

### Minor Changes

- [#1565](https://github.com/finos/legend-studio/pull/1565) [`ebe9acf9`](https://github.com/finos/legend-studio/commit/ebe9acf9bc01234849e64df792693e493c95cb8f) ([@akphi](https://github.com/akphi)) - Change the wrapping component for `DropdownMenu` from `<div>` to `<button>`

## 4.0.1

### Patch Changes

- [#1514](https://github.com/finos/legend-studio/pull/1514) [`34c29c4e`](https://github.com/finos/legend-studio/commit/34c29c4e6d0f04d3f57c42528a8cb16d05261434) ([@xannem](https://github.com/xannem)) - Support displaying (validation) error message with `PanelFormTextEditor`

## 4.0.0

### Major Changes

- [#1520](https://github.com/finos/legend-studio/pull/1520) [`240875e8`](https://github.com/finos/legend-studio/commit/240875e869c95d7d228756a66eec1e82a45b8884) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Removed `ReactMarkdownMocker.jsx` setup script, instead, add mocks `MockedReactMarkdown.js` and `MockedRemarkGFM.js` which can be use in `Jest` config `moduleNameMapper`.

## 3.3.0

### Minor Changes

- [#1502](https://github.com/finos/legend-studio/pull/1502) [`81757c5c`](https://github.com/finos/legend-studio/commit/81757c5c3ff514adcc532d118ec58e830938109b) ([@xannem](https://github.com/xannem)) - Add `PanelSection` and `PanelFormBooleanEditor` components

## 3.2.2

### Patch Changes

- [#1500](https://github.com/finos/legend-studio/pull/1500) [`bed2c111`](https://github.com/finos/legend-studio/commit/bed2c11115bdeafe1a769363922bce13428d9433) ([@xannem](https://github.com/xannem)) - Add badge component and panel list selector item label component

## 3.2.1

## 3.2.0

### Minor Changes

- [#1481](https://github.com/finos/legend-studio/pull/1481) [`4fd88c58`](https://github.com/finos/legend-studio/commit/4fd88c58b66dd3033db1f2f45e4cbedd0420b57e) ([@xannem](https://github.com/xannem)) - Add PanelList and PanelListItem components

## 3.1.0

### Minor Changes

- [#1434](https://github.com/finos/legend-studio/pull/1434) [`138d9989`](https://github.com/finos/legend-studio/commit/138d9989b59ae3e816e19a149f842f24754ec9d9) ([@xannem](https://github.com/xannem)) - Add basic `Panel` component.

## 3.0.4

## 3.0.3

## 3.0.2

## 3.0.1

## 3.0.0

### Major Changes

- [#1388](https://github.com/finos/legend-studio/pull/1388) [`f30a591e`](https://github.com/finos/legend-studio/commit/f30a591e75687a52e93faa577731c2f7f372f8bf) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Cleanup and simplify `BlankPanelPlaceholder` props: (1) `placeholderText` is now renamed to `text`, (2) replaced `dndProps` by `isDropZoneActive` which when defined as a boolean will indicate if the drop zone should be animated when dropable item is dragged over, and (3) removed `readonlyProps` and added `disabled` props and `previewText` which will be shown when `disabled=true`.

### Minor Changes

- [#1388](https://github.com/finos/legend-studio/pull/1388) [`f30a591e`](https://github.com/finos/legend-studio/commit/f30a591e75687a52e93faa577731c2f7f372f8bf) ([@akphi](https://github.com/akphi)) - Added component `PanelDropZone` which will show the drag-and-drop overlay when dropable item is dragged over the panel.

## 2.1.0

### Minor Changes

- [#1370](https://github.com/finos/legend-studio/pull/1370) [`a5a547d9`](https://github.com/finos/legend-studio/commit/a5a547d9b19376a62bbdefd0e3cf658a0fe7cac0) ([@xannem](https://github.com/xannem)) - Add indicator for `PackageableElementOption` to show the graph the elements belong to (i.e. `system`, `dependencies`, etc.) ([#457](https://github.com/finos/legend-studio/issues/457)).

## 2.0.12

## 2.0.11

## 2.0.10

## 2.0.9

## 2.0.8

### Patch Changes

- [#1317](https://github.com/finos/legend-studio/pull/1317) [`0cb01807`](https://github.com/finos/legend-studio/commit/0cb0180776bf772001357674d5845b10edbf6b13) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Fix a bug where the class property editor panel is hidden when switching between class editors ([#1316](https://github.com/finos/legend-studio/issues/1316)).

## 2.0.7

## 2.0.6

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
