# @finos/legend-extension-dsl-diagram

## 7.1.18

## 7.1.17

## 7.1.16

## 7.1.15

## 7.1.14

## 7.1.13

## 7.1.12

## 7.1.11

## 7.1.10

### Patch Changes

- [#1747](https://github.com/finos/legend-studio/pull/1747) [`65cae8687`](https://github.com/finos/legend-studio/commit/65cae8687c5a35371438d372f18a41f4c7df549f) ([@akphi](https://github.com/akphi)) - Handle touch-pad zoom and horizontal scrolling in diagram renderer.

## 7.1.9

## 7.1.8

## 7.1.7

## 7.1.6

## 7.1.5

## 7.1.4

## 7.1.3

## 7.1.2

## 7.1.1

## 7.1.0

### Minor Changes

- [#1677](https://github.com/finos/legend-studio/pull/1677) [`45962dcc8`](https://github.com/finos/legend-studio/commit/45962dcc8dedbc72af1bb9f598e2380d6d1c037c) ([@akphi](https://github.com/akphi)) - Support rendering property aggregation kind (composite, shared, none) in diagram.

### Patch Changes

- [#1684](https://github.com/finos/legend-studio/pull/1684) [`0135a9d0f`](https://github.com/finos/legend-studio/commit/0135a9d0f6ccb223e9f8a531ac2509d6702fe5e9) ([@gayathrir11](https://github.com/gayathrir11)) - Fix a bug with diagram property view referencing association ([#1593](https://github.com/finos/legend-studio/issues/1593)).

## 7.0.12

## 7.0.11

## 7.0.10

## 7.0.9

## 7.0.8

## 7.0.7

## 7.0.6

## 7.0.5

## 7.0.4

## 7.0.3

## 7.0.2

## 7.0.1

## 7.0.0

### Major Changes

- [#1519](https://github.com/finos/legend-studio/pull/1519) [`b2e14b15`](https://github.com/finos/legend-studio/commit/b2e14b15379eef36e39d906d315fd4fb96472cd6) ([@gayathrir11](https://github.com/gayathrir11)) - **BREAKING CHANGE:** Renamed plugins and presets to use the prefix `DSL_Diagram` instead of `DSLDiagram`

## 6.0.3

## 6.0.2

## 6.0.1

## 6.0.0

### Major Changes

- [#1476](https://github.com/finos/legend-studio/pull/1476) [`293f2345`](https://github.com/finos/legend-studio/commit/293f2345cd7dcc7e97fc4b6b21c7d274a1407176) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Removed `DSLDiagram_LegendStudioApplicationPlugin_Extension`.

## 5.0.11

## 5.0.10

## 5.0.9

## 5.0.8

## 5.0.7

## 5.0.6

## 5.0.5

## 5.0.4

## 5.0.3

## 5.0.2

## 5.0.1

## 5.0.0

### Major Changes

- [#1332](https://github.com/finos/legend-studio/pull/1332) [`5f0c6f6b`](https://github.com/finos/legend-studio/commit/5f0c6f6b40ece8a3b87c32b52f15f542fe68f7d4) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Renamed `*_GraphPreset` to `*_GraphManagerPreset`

## 4.1.7

## 4.1.6

## 4.1.5

## 4.1.4

## 4.1.3

## 4.1.2

## 4.1.1

## 4.1.0

### Minor Changes

- [#1239](https://github.com/finos/legend-studio/pull/1239) [`4dacea12`](https://github.com/finos/legend-studio/commit/4dacea12f53e93eab6e53f29febe94c7693109e2) ([@akphi](https://github.com/akphi)) - Support `align` and `distribute spacing` operators (e.g. align left, align right, distribute spacing horizontally etc.) when selecting multiple class views.

## 4.0.2

## 4.0.1

## 4.0.0

### Major Changes

- [#1223](https://github.com/finos/legend-studio/pull/1223) [`f5f72a2d`](https://github.com/finos/legend-studio/commit/f5f72a2de0a1bacd1d614ea1e3ecb782fce15bf8) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Renamed `RelationshipEdgeView` to `RelationshipViewEnd`.

## 3.0.0

### Major Changes

- [#1190](https://github.com/finos/legend-studio/pull/1190) [`4c076c98`](https://github.com/finos/legend-studio/commit/4c076c985b5efd0da3ec2f141ddc9cd53f0ba8f6) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Use `NodeNext` (`ESM` module resolution strategy for `Typescript`). Read more about this [here](https://devblogs.microsoft.com/typescript/announcing-typescript-4-7/#esm-nodejs). This transition would be relatively smooth, except that we must use `ESM`-styled import (with extensions) for relative path. For example:

  ```ts
  // before
  import { someFunction } from './Utils';
  // after
  import { someFunction } from './Utils.js';
  ```

### Patch Changes

- [#1201](https://github.com/finos/legend-studio/pull/1201) [`b700e876`](https://github.com/finos/legend-studio/commit/b700e8765b4a7411b751dba3bb3a7f8df533d527) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Fix class's association property edges getting dropped when cleaning up the diagram. ([#1200](https://github.com/finos/legend-studio/issues/1200)).

## 2.0.3

## 2.0.2

## 2.0.1

## 2.0.0

### Major Changes

- [#1113](https://github.com/finos/legend-studio/pull/1113) [`e35042ba`](https://github.com/finos/legend-studio/commit/e35042bacf7999e8a5d9836fa6b31cf89cc66237) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Adopt `ESM` styled exports: i.e. we now make use of `exports` field (and removed `main` field) in `package.json`.

### Minor Changes

- [#962](https://github.com/finos/legend-studio/pull/962) [`9ba53bc7`](https://github.com/finos/legend-studio/commit/9ba53bc7f2fead23efb1fe061dff94d4f4c73beb) ([@akphi](https://github.com/akphi)) - Add documentation and example code snippets when creating diagram in text-mode

## 1.0.36

## 1.0.35

## 1.0.34

## 1.0.33

## 1.0.32

## 1.0.31

## 1.0.30

### Patch Changes

- [#1000](https://github.com/finos/legend-studio/pull/1000) [`4f7d04c5`](https://github.com/finos/legend-studio/commit/4f7d04c52fc8d52b87251bcf04ec971afe8d3218) ([@akphi](https://github.com/akphi)) - Improve document around the logic of diagram relationship views' path management.

## 1.0.29

## 1.0.28

## 1.0.27

## 1.0.26

## 1.0.25

## 1.0.24

## 1.0.23

## 1.0.22

## 1.0.21

## 1.0.20

## 1.0.19

## 1.0.18

## 1.0.17

## 1.0.16

## 1.0.15

## 1.0.14

## 1.0.13

## 1.0.12

## 1.0.11

## 1.0.10

## 1.0.9

## 1.0.8

## 1.0.7

## 1.0.6

### Patch Changes

- [#738](https://github.com/finos/legend-studio/pull/738) [`2f239197`](https://github.com/finos/legend-studio/commit/2f23919725f3b103ab2208f26bdbb482ef40186b) ([@akphi](https://github.com/akphi)) - Make the `onDoubleClick` event handlers optional: when they are not set, we nolonger call `noop()` but actually will ignore the events.

## 1.0.5

## 1.0.4

## 1.0.3

## 1.0.2

## 1.0.1

## 1.0.0

### Major Changes

- [#692](https://github.com/finos/legend-studio/pull/692) [`caab0e67`](https://github.com/finos/legend-studio/commit/caab0e6772181e514b246fe6030a02e7169952cc) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Remove `LegendStudioPreset` and `LegendQueryPreset` and expose `LegendStudioPlugin` and `LegendQueryPlugin` respectively as we now prefer the usage of `@finos/legend-graph-extension-collection` to better manage graph presets.

## 0.1.2

## 0.1.1

## 0.1.0

### Minor Changes

- [#584](https://github.com/finos/legend-studio/pull/584) [`b32e834b`](https://github.com/finos/legend-studio/commit/b32e834ba037658de53632403c79aa0f0f651971) ([@akphi](https://github.com/akphi)) - Support context menu for class views. Cleanup diagram renderer event handlers: they now align with the events that trigger them, not their purpose, e.g. we changed `handleEditClassView` to `onClassViewDoubleClick`.

## 0.0.13

## 0.0.12

## 0.0.11

## 0.0.10

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

- [#444](https://github.com/finos/legend-studio/pull/444) [`9c6c7386`](https://github.com/finos/legend-studio/commit/9c6c7386bb5c884fdf0077a1dcba6b46dfa840ce) ([@akphi](https://github.com/akphi)) - Move `DSL Diagram` logic to a new separate extension package `@finos/legend-extension-dsl-diagram`.
