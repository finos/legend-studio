# @finos/legend-application-taxonomy

## 6.2.16

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

### Patch Changes

- [#1597](https://github.com/finos/legend-studio/pull/1597) [`5b61c844`](https://github.com/finos/legend-studio/commit/5b61c844362b1ff60c4025ab9b93220e938399b0) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Disable fetching project dependencies if dataspace cache analysis is found

## 6.2.2

## 6.2.1

## 6.2.0

### Minor Changes

- [#1552](https://github.com/finos/legend-studio/pull/1552) [`683800ab`](https://github.com/finos/legend-studio/commit/683800ab3ca1752c4382f22bcf8dede42518449d) ([@akphi](https://github.com/akphi)) - Allow configuring instances of `Legend Studio` which `Legend Taxonomy` can refer to for integration (e.g. editing data space).

  ```jsonc
  {
    ... // existing config content
    "studio": {
      "url": "http://localhost:9000/studio",
      "instances": [
        {
          "sdlcProjectIDPrefix": "PROD",
          "url": "http://localhost:9000/studio"
        }
      ]
    }
  }
  ```

## 6.1.3

## 6.1.2

## 6.1.1

## 6.1.0

### Minor Changes

- [#1509](https://github.com/finos/legend-studio/pull/1509) [`8cbd17f0`](https://github.com/finos/legend-studio/commit/8cbd17f0d6b4854525adcdbb974d0c7a0fe4a564) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Use data space analytics result cached in `Depot` server whenever possible to speed up loading of data spaces

## 6.0.17

### Patch Changes

- [#1488](https://github.com/finos/legend-studio/pull/1488) [`a90b4698`](https://github.com/finos/legend-studio/commit/a90b469846363058ac7efffcbfb8cf0070582609) ([@akphi](https://github.com/akphi)) - Remove `depot.TEMPORARY__useLegacyDepotServerAPIRoutes` config flag.

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

- [#1332](https://github.com/finos/legend-studio/pull/1332) [`5f0c6f6b`](https://github.com/finos/legend-studio/commit/5f0c6f6b40ece8a3b87c32b52f15f542fe68f7d4) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Renamed package from `@finos/legend-taxonomy` to `@finos/legend-application-taxonomy`
