# @finos/legend-extension-external-store-service

## 3.0.6

## 3.0.5

## 3.0.4

## 3.0.3

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

* [#1105](https://github.com/finos/legend-studio/pull/1105) [`436264af`](https://github.com/finos/legend-studio/commit/436264aff85224f45e14d6b5970879911d4afd3c) ([@hardikmaheshwari](https://github.com/hardikmaheshwari)) - Remove deprecated service-store protocols.

## 2.1.0

### Minor Changes

- [#1171](https://github.com/finos/legend-studio/pull/1171) [`190e3857`](https://github.com/finos/legend-studio/commit/190e3857ee7ec23cb57401ef67686ddacc7cfbc1) ([@gayathrir11](https://github.com/gayathrir11)) - Add form support for Service store embedded data

### Patch Changes

- [#1174](https://github.com/finos/legend-studio/pull/1174) [`81b132a2`](https://github.com/finos/legend-studio/commit/81b132a2fff4a5d6b1a03e68d3192a742a602105) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Fix hashing of service mapping with param definitions ([#1175](https://github.com/finos/legend-studio/issues/1175)).

## 2.0.2

## 2.0.1

## 2.0.0

### Major Changes

- [#1113](https://github.com/finos/legend-studio/pull/1113) [`e35042ba`](https://github.com/finos/legend-studio/commit/e35042bacf7999e8a5d9836fa6b31cf89cc66237) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Adopt `ESM` styled exports: i.e. we now make use of `exports` field (and removed `main` field) in `package.json`.

### Minor Changes

- [#1076](https://github.com/finos/legend-studio/pull/1076) [`c6d0c1da`](https://github.com/finos/legend-studio/commit/c6d0c1dae779973e932f18c70cba503ebcc1d3f3) ([@gayathrir11](https://github.com/gayathrir11)) - Add graph support for embedded data

## 1.2.10

## 1.2.9

## 1.2.8

## 1.2.7

## 1.2.6

## 1.2.5

## 1.2.4

## 1.2.3

## 1.2.2

### Patch Changes

- [#1017](https://github.com/finos/legend-studio/pull/1017) [`0dd7cc2e`](https://github.com/finos/legend-studio/commit/0dd7cc2ebf1ee068b394d052003c3442e298ff63) ([@gayathrir11](https://github.com/gayathrir11)) - Fix `ServiceStore` element appearing multiple times in explorer tree.

## 1.2.1

## 1.2.0

### Minor Changes

- [#998](https://github.com/finos/legend-studio/pull/998) [`d6423ea6`](https://github.com/finos/legend-studio/commit/d6423ea69e00ddbba91cc57a427ef583762c211e) ([@akphi](https://github.com/akphi)) - Add support for header parameters in service store.

* [#900](https://github.com/finos/legend-studio/pull/900) [`906b102`](https://github.com/finos/legend-studio/commit/906b102d361be7bba43f8755e6e5d467e1584b99) ([@hardikmaheshwari](https://github.com/hardikmaheshwari)) - Add support for `POST` requests and refactor service store mapping. Deprecated `PropertyIndexedParameterMapping`, `ParameterIndexedParameterMapping`, `ServiceParameterMapping` and the field `parameterMappings` of `ServiceMapping`. They will be removed in a future release.

## 1.1.7

## 1.1.6

## 1.1.5

## 1.1.4

## 1.1.3

## 1.1.2

## 1.1.1

## 1.1.0

### Minor Changes

- [#892](https://github.com/finos/legend-studio/pull/892) [`5991a60c`](https://github.com/finos/legend-studio/commit/5991a60ce523a5d917c55e53fea5b4f4f71ce16d) ([@hardikmaheshwari](https://github.com/hardikmaheshwari)) - Add support for modeling `optional/required` service parameters.

## 1.0.17

## 1.0.16

## 1.0.15

## 1.0.14

### Patch Changes

- [#854](https://github.com/finos/legend-studio/pull/854) [`da8de4e9`](https://github.com/finos/legend-studio/commit/da8de4e9073c6f42c96cf807fab2354c79f11782) ([@hardikmaheshwari](https://github.com/hardikmaheshwari)) - Add allowReserved config for service store parameters.

## 1.0.13

## 1.0.12

## 1.0.11

## 1.0.10

## 1.0.9

## 1.0.8

### Patch Changes

- [#790](https://github.com/finos/legend-studio/pull/790) [`37dda241`](https://github.com/finos/legend-studio/commit/37dda2415330b7488d7309cb0ea38c9b748bc544) ([@hardikmaheshwari](https://github.com/hardikmaheshwari)) - Added support for specifying pathOffset for service store mapping.

## 1.0.7

## 1.0.6

## 1.0.5

## 1.0.4

## 1.0.3

## 1.0.2

## 1.0.1

## 1.0.0

### Major Changes

- [#692](https://github.com/finos/legend-studio/pull/692) [`caab0e67`](https://github.com/finos/legend-studio/commit/caab0e6772181e514b246fe6030a02e7169952cc) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Remove `LegendStudioPreset` and `LegendQueryPreset` and expose `LegendStudioPlugin` and `LegendQueryPlugin` respectively as we now prefer the usage of `@finos/legend-graph-extension-collection` to better manage graph presets.

## 0.1.3

## 0.1.2

## 0.1.1

## 0.1.0

### Minor Changes

- [#580](https://github.com/finos/legend-studio/pull/580) [`7318c222`](https://github.com/finos/legend-studio/commit/7318c2223d5653be18f00a489aa00b3143a600fe) ([@gayathrir11](https://github.com/gayathrir11)) - Add graph support for `Service Store`
