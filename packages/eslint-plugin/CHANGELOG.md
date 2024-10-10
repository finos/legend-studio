# @finos/eslint-plugin-legend-studio

## 3.0.1

## 3.0.0

## 2.0.87

## 2.0.86

## 2.0.85

## 2.0.84

## 2.0.83

## 2.0.82

## 2.0.81

## 2.0.80

## 2.0.79

## 2.0.78

## 2.0.77

## 2.0.76

## 2.0.75

## 2.0.74

## 2.0.73

## 2.0.72

### Patch Changes

- [#3236](https://github.com/finos/legend-studio/pull/3236) [`b1bb8f7`](https://github.com/finos/legend-studio/commit/b1bb8f79cc605916dc9014bf436acdbefa85eeaa) ([@akphi](https://github.com/akphi)) - Disable `@typescript-eslint/explicit-function-return-type` for simpler code.

## 2.0.71

## 2.0.70

## 2.0.69

## 2.0.68

## 2.0.67

## 2.0.66

## 2.0.65

## 2.0.64

## 2.0.63

## 2.0.62

## 2.0.61

## 2.0.60

## 2.0.59

## 2.0.58

## 2.0.57

## 2.0.56

## 2.0.55

## 2.0.54

## 2.0.53

## 2.0.52

## 2.0.51

## 2.0.50

## 2.0.49

## 2.0.48

## 2.0.47

## 2.0.46

## 2.0.45

## 2.0.44

## 2.0.43

## 2.0.42

## 2.0.41

## 2.0.40

## 2.0.39

## 2.0.38

## 2.0.37

## 2.0.36

## 2.0.35

## 2.0.34

## 2.0.33

## 2.0.32

## 2.0.31

## 2.0.30

## 2.0.29

## 2.0.28

## 2.0.27

## 2.0.26

## 2.0.25

## 2.0.24

## 2.0.23

## 2.0.22

## 2.0.21

## 2.0.20

## 2.0.19

## 2.0.18

## 2.0.17

## 2.0.16

## 2.0.15

## 2.0.14

## 2.0.13

## 2.0.12

## 2.0.11

## 2.0.10

## 2.0.9

## 2.0.8

### Patch Changes

- [#1388](https://github.com/finos/legend-studio/pull/1388) [`f30a591e`](https://github.com/finos/legend-studio/commit/f30a591e75687a52e93faa577731c2f7f372f8bf) ([@akphi](https://github.com/akphi)) - Relax `@typescript-eslint/explicit-function-return-type` by allowing expressions; now this check will only validate for function/constant declarations.

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

## 1.1.0

### Minor Changes

- [#1159](https://github.com/finos/legend-studio/pull/1159) [`f6abe87a`](https://github.com/finos/legend-studio/commit/f6abe87a27ec3f2604caf25e38df17344b31ef9f) ([@akphi](https://github.com/akphi)) - Support `Typscript` [declaration merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html), by using `@typescript-eslint/no-redeclare` instead of `no-redeclare`

## 1.0.0

### Major Changes

- [#1113](https://github.com/finos/legend-studio/pull/1113) [`e35042ba`](https://github.com/finos/legend-studio/commit/e35042bacf7999e8a5d9836fa6b31cf89cc66237) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Adopt `ESM` styled exports: i.e. we now make use of `exports` field (and removed `main` field) in `package.json`.

## 0.2.10

## 0.2.9

## 0.2.8

## 0.2.7

## 0.2.6

## 0.2.5

## 0.2.4

## 0.2.3

## 0.2.2

## 0.2.1

## 0.2.0

### Minor Changes

- [#821](https://github.com/finos/legend-studio/pull/821) [`9af3076d`](https://github.com/finos/legend-studio/commit/9af3076dee533f55b459cd8698df26f58d7f2309) ([@akphi](https://github.com/akphi)) - Remove rule `no-duplicate-exports` in favor of setting option `includeExports` for rule `no-duplicate-imports`.

## 0.1.9

## 0.1.8

### Patch Changes

- [#751](https://github.com/finos/legend-studio/pull/751) [`017f9c60`](https://github.com/finos/legend-studio/commit/017f9c60fef1426521c8feca5d314a9880d1a1a2) ([@akphi](https://github.com/akphi)) - Prefer usage of inline type import `import { type ... }` over `import type`; as a result, we have enabled `no-duplicate-imports` rule. Also, we created rule `no-duplicate-exports` to enforce the usage on export side.

## 0.1.7

## 0.1.6

## 0.1.5

## 0.1.4

## 0.1.3

## 0.1.2

## 0.1.1

## 0.1.0

### Minor Changes

- [#569](https://github.com/finos/legend-studio/pull/569) [`67a95bd0`](https://github.com/finos/legend-studio/commit/67a95bd0dadd00b486c2f7884e7d9a10cb91b03c) ([@akphi](https://github.com/akphi)) - Ugrade to `eslint@8` and `typescript-eslint@5` and update rule set to comply with new recommended rule list.

## 0.0.32

## 0.0.31

## 0.0.30

## 0.0.29

## 0.0.28

## 0.0.27

## 0.0.26

## 0.0.25

### Patch Changes

- [#427](https://github.com/finos/legend-studio/pull/427) [`23b59b8`](https://github.com/finos/legend-studio/commit/23b59b8962c5049d1605bcb262c16cd3c012a1dd) ([@akphi](https://github.com/akphi)) - Fix a problem with rules incorrectly scanning the protocol version due to the _overly_ loose regex pattern.

* [#427](https://github.com/finos/legend-studio/pull/427) [`23b59b89`](https://github.com/finos/legend-studio/commit/23b59b8962c5049d1605bcb262c16cd3c012a1dd) ([@akphi](https://github.com/akphi)) - Update custom rules to also include `exports` and add rule to prevent importing from the same workspace using absolute imports, e.g. a file in `legend-shared` with an import from `@finos/legend-shared` is a violation.

- [#410](https://github.com/finos/legend-studio/pull/410) [`a1dfc165`](https://github.com/finos/legend-studio/commit/a1dfc165dcf98eeea624400abc9f3c97eb2fda52) ([@akphi](https://github.com/akphi)) - Enforce new lint rule to disallow importing hidden/unexposed exports from other modules.

## 0.0.24

## 0.0.23

## 0.0.22

## 0.0.21

## 0.0.20

## 0.0.19

## 0.0.18

## 0.0.17

## 0.0.16

## 0.0.15

## 0.0.14

## 0.0.13

## 0.0.12

## 0.0.11

### Patch Changes

- [#211](https://github.com/finos/legend-studio/pull/211) [`86cd535`](https://github.com/finos/legend-studio/commit/86cd535e1df97f722bcd69270e84d82a6d1ff6e1) ([@akphi](https://github.com/akphi)) - As we upgraded to `prettier@2.3.0` we will disable `eslint(brace-style)` rule due to conflict and let `prettier` manage this.

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
