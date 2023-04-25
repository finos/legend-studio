# @finos/legend-application-taxonomy

## 8.0.7

## 8.0.6

## 8.0.5

## 8.0.4

## 8.0.3

## 8.0.2

## 8.0.1

## 8.0.0

### Major Changes

- [#2113](https://github.com/finos/legend-studio/pull/2113) [`4e7b750ee`](https://github.com/finos/legend-studio/commit/4e7b750ee649033b66c87b84b4ff242ad3829580) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE**: Adapted to use new `LegendApplication` platform injection mechanism; testing utilities have been adjusted accordingly.

## 7.0.17

## 7.0.16

## 7.0.15

## 7.0.14

## 7.0.13

## 7.0.12

## 7.0.11

## 7.0.10

## 7.0.9

## 7.0.8

### Patch Changes

- [#2063](https://github.com/finos/legend-studio/pull/2063) [`7bd0dc79d`](https://github.com/finos/legend-studio/commit/7bd0dc79d5e803c0eb677b884f2f1ac48fb32b77) ([@akphi](https://github.com/akphi)) - Support relative URLs in application configuration.

## 7.0.7

## 7.0.6

## 7.0.5

## 7.0.4

## 7.0.3

## 7.0.2

## 7.0.1

## 7.0.0

### Major Changes

- [#2019](https://github.com/finos/legend-studio/pull/2019) [`e31cc1bcb`](https://github.com/finos/legend-studio/commit/e31cc1bcbb61306b4b127788854775a8325bfa57) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Renamed `*Telemetry` and `*EventService` wrappers around `TelemetryService` and `EventService` respectively to `*TelemetryHelper` and `*EventHelper` respectively.

## 6.2.48

## 6.2.47

## 6.2.46

## 6.2.45

## 6.2.44

## 6.2.43

## 6.2.42

## 6.2.41

## 6.2.40

## 6.2.39

## 6.2.38

## 6.2.37

## 6.2.36

## 6.2.35

## 6.2.34

## 6.2.33

## 6.2.32

## 6.2.31

## 6.2.30

## 6.2.29

## 6.2.28

## 6.2.27

## 6.2.26

## 6.2.25

## 6.2.24

## 6.2.23

## 6.2.22

## 6.2.21

## 6.2.20

## 6.2.19

## 6.2.18

## 6.2.17

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
