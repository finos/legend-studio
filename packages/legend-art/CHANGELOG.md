# @finos/legend-art

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
