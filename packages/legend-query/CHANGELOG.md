# @finos/legend-query

## 0.1.2

### Patch Changes

- [#646](https://github.com/finos/legend-studio/pull/646) [`51dfc555`](https://github.com/finos/legend-studio/commit/51dfc55599c25650f4d17587cf87b180271be676) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Fix class explorer not showing properties from a class mapped using an operational set implementation ([#647](https://github.com/finos/legend-studio/issues/647)).

* [#639](https://github.com/finos/legend-studio/pull/639) [`62985e5`](https://github.com/finos/legend-studio/commit/62985e59627b5be2cb75e15f30c13d029014c030) ([@akphi](https://github.com/akphi)) - Allow viewing the project of a query in Studio.

## 0.1.1

### Patch Changes

- [#620](https://github.com/finos/legend-studio/pull/620) [`efe01d92`](https://github.com/finos/legend-studio/commit/efe01d9218034dc358420b65f20da9715eb55589) ([@akphi](https://github.com/akphi)) - Add a temporary flag `TEMP__useLegacyDepotServerAPIRoutes` in `depot` server config to allow pointing certain APIs at old endpoint. This is expected to be removed soon but provided as a workaround for older infrastructure.

## 0.1.0

### Minor Changes

- [#584](https://github.com/finos/legend-studio/pull/584) [`b32e834b`](https://github.com/finos/legend-studio/commit/b32e834ba037658de53632403c79aa0f0f651971) ([@akphi](https://github.com/akphi)) - Created an extension mechanism for query setup.

### Patch Changes

- [#588](https://github.com/finos/legend-studio/pull/588) [`83c05ada`](https://github.com/finos/legend-studio/commit/83c05ada3f309766cc7e4ec59f2ef0cba02d9ee6) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - List possible `mappings` and `runtimes` from dependency projects in query setup.

## 0.0.15

## 0.0.14

## 0.0.13

## 0.0.12

## 0.0.11

### Patch Changes

- [#532](https://github.com/finos/legend-studio/pull/532) [`0ec098d2`](https://github.com/finos/legend-studio/commit/0ec098d20f607fd1fc848a1ce51432791e7ec717) ([@akphi](https://github.com/akphi)) - Fix a problem where recursive removal of graph fetch tree node leaves orphan nodes ([#476](https://github.com/finos/legend-studio/issues/476)).

* [#508](https://github.com/finos/legend-studio/pull/508) [`f30e5046`](https://github.com/finos/legend-studio/commit/f30e504623d53f5234a6a5290c95f01099afa672) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Allow specifying and editing `parameters` in query builder.

- [#535](https://github.com/finos/legend-studio/pull/535) [`ebe69b6a`](https://github.com/finos/legend-studio/commit/ebe69b6a8c33237fd11c3522e20130d9c4aa2026) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Initializes query builder properly when pre-compilation fails ([#477](https://github.com/finos/legend-studio/issues/477))

* [#532](https://github.com/finos/legend-studio/pull/532) [`0ec098d2`](https://github.com/finos/legend-studio/commit/0ec098d20f607fd1fc848a1ce51432791e7ec717) ([@akphi](https://github.com/akphi)) - Allow adding properties of unopened nodes to fetch structure ([#471](https://github.com/finos/legend-studio/issues/471))

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

- [#427](https://github.com/finos/legend-studio/pull/427) [`23b59b89`](https://github.com/finos/legend-studio/commit/23b59b8962c5049d1605bcb262c16cd3c012a1dd) ([@akphi](https://github.com/akphi)) - Move `@finos/legend-studio-extension-query-builder` core logic into `@finos/legend-query`, hence sever the dependency of `Legend Query` core on `@finos/legend-studio`.
