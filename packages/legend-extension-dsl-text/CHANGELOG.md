# @finos/legend-extension-dsl-text

## 6.0.32

## 6.0.31

## 6.0.30

## 6.0.29

## 6.0.28

## 6.0.27

## 6.0.26

## 6.0.25

## 6.0.24

## 6.0.23

## 6.0.22

## 6.0.21

## 6.0.20

## 6.0.19

## 6.0.18

## 6.0.17

## 6.0.16

## 6.0.15

## 6.0.14

## 6.0.13

## 6.0.12

## 6.0.11

## 6.0.10

## 6.0.9

## 6.0.8

## 6.0.7

## 6.0.6

## 6.0.5

## 6.0.4

## 6.0.3

## 6.0.2

## 6.0.1

## 6.0.0

### Major Changes

- [#2113](https://github.com/finos/legend-studio/pull/2113) [`4e7b750ee`](https://github.com/finos/legend-studio/commit/4e7b750ee649033b66c87b84b4ff242ad3829580) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Partition exports into separate paths, `/graph` for graph and graph manager extensions, `/application` for generic application extensions, `/application-studio` for `Legend Studio` specific application extensions, and `/application-query` for `Legend Query` specific application extensions.

## 5.0.69

## 5.0.68

## 5.0.67

## 5.0.66

## 5.0.65

## 5.0.64

## 5.0.63

## 5.0.62

## 5.0.61

## 5.0.60

## 5.0.59

## 5.0.58

## 5.0.57

## 5.0.56

## 5.0.55

## 5.0.54

## 5.0.53

## 5.0.52

## 5.0.51

## 5.0.50

## 5.0.49

## 5.0.48

## 5.0.47

## 5.0.46

## 5.0.45

## 5.0.44

## 5.0.43

## 5.0.42

## 5.0.41

## 5.0.40

## 5.0.39

## 5.0.38

## 5.0.37

## 5.0.36

## 5.0.35

## 5.0.34

## 5.0.33

## 5.0.32

## 5.0.31

## 5.0.30

## 5.0.29

## 5.0.28

## 5.0.27

## 5.0.26

## 5.0.25

## 5.0.24

## 5.0.23

## 5.0.22

## 5.0.21

## 5.0.20

## 5.0.19

## 5.0.18

## 5.0.17

## 5.0.16

## 5.0.15

## 5.0.14

## 5.0.13

## 5.0.12

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

- [#1519](https://github.com/finos/legend-studio/pull/1519) [`b2e14b15`](https://github.com/finos/legend-studio/commit/b2e14b15379eef36e39d906d315fd4fb96472cd6) ([@gayathrir11](https://github.com/gayathrir11)) - **BREAKING CHANGE:** Renamed plugins and presets to use the prefix `DSL_Text` instead of `DSLText`

## 4.0.15

## 4.0.14

## 4.0.13

## 4.0.12

## 4.0.11

## 4.0.10

## 4.0.9

## 4.0.8

## 4.0.7

## 4.0.6

## 4.0.5

## 4.0.4

## 4.0.3

## 4.0.2

## 4.0.1

## 4.0.0

### Major Changes

- [#1332](https://github.com/finos/legend-studio/pull/1332) [`5f0c6f6b`](https://github.com/finos/legend-studio/commit/5f0c6f6b40ece8a3b87c32b52f15f542fe68f7d4) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Renamed `*_GraphPreset` to `*_GraphManagerPreset`

## 3.1.2

## 3.1.1

## 3.1.0

### Minor Changes

- [#1282](https://github.com/finos/legend-studio/pull/1282) [`280b6bbe`](https://github.com/finos/legend-studio/commit/280b6bbe9ba88006f245fc36c2baa4179a72937d) ([@ijeh-i](https://github.com/ijeh-i)) - Support previewing `Markdown` in editor.

## 3.0.8

## 3.0.7

## 3.0.6

## 3.0.5

## 3.0.4

### Patch Changes

- [#1236](https://github.com/finos/legend-studio/pull/1236) [`ed3da137`](https://github.com/finos/legend-studio/commit/ed3da13775cb37560dea814fc665bd1ff16c998d) ([@akphi](https://github.com/akphi)) - `Test.type` is now optional, when not provided, we will render the content as plain text.

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

## 2.0.3

## 2.0.2

## 2.0.1

## 2.0.0

### Major Changes

- [#1113](https://github.com/finos/legend-studio/pull/1113) [`e35042ba`](https://github.com/finos/legend-studio/commit/e35042bacf7999e8a5d9836fa6b31cf89cc66237) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Adopt `ESM` styled exports: i.e. we now make use of `exports` field (and removed `main` field) in `package.json`.

## 1.0.36

## 1.0.35

## 1.0.34

## 1.0.33

## 1.0.32

## 1.0.31

## 1.0.30

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

## 1.0.5

## 1.0.4

## 1.0.3

## 1.0.2

## 1.0.1

## 1.0.0

### Major Changes

- [#692](https://github.com/finos/legend-studio/pull/692) [`caab0e67`](https://github.com/finos/legend-studio/commit/caab0e6772181e514b246fe6030a02e7169952cc) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Remove `LegendStudioPreset` and `LegendQueryPreset` and expose `LegendStudioPlugin` and `LegendQueryPlugin` respectively as we now prefer the usage of `@finos/legend-graph-extension-collection` to better manage graph presets.

## 0.0.17

## 0.0.16

## 0.0.15

## 0.0.14

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

- [#436](https://github.com/finos/legend-studio/pull/436) [`356eda33`](https://github.com/finos/legend-studio/commit/356eda33c4efd9345ea48ae2e81dda4ad0029a09) ([@akphi](https://github.com/akphi)) - Merge `@finos/legend-graph-preset-dsl-text` and `@finos/legend-studio-preset-dsl-text` to become `@finos/legend-extension-dsl-text`.
