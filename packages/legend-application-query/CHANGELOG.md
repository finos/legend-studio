# @finos/legend-application-query

## 13.0.29

## 13.0.28

### Patch Changes

- [#2355](https://github.com/finos/legend-studio/pull/2355) [`da96b9922`](https://github.com/finos/legend-studio/commit/da96b99223e9bcac566bcb5e3f7b9840109998ae) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Use existing query metadata when saving over (save as) to new query.

## 13.0.27

## 13.0.26

## 13.0.25

## 13.0.24

## 13.0.23

## 13.0.22

## 13.0.21

## 13.0.20

## 13.0.19

## 13.0.18

### Patch Changes

- [#2213](https://github.com/finos/legend-studio/pull/2213) [`be6268234`](https://github.com/finos/legend-studio/commit/be62682340e48aa1420e75f743ff6f5471d95c34) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add support for default parameter values to saved query.

## 13.0.17

## 13.0.16

## 13.0.15

## 13.0.14

## 13.0.13

## 13.0.12

## 13.0.11

## 13.0.10

## 13.0.9

## 13.0.8

## 13.0.7

## 13.0.6

## 13.0.5

## 13.0.4

## 13.0.3

## 13.0.2

## 13.0.1

## 13.0.0

### Major Changes

- [#2058](https://github.com/finos/legend-studio/pull/2058) [`b407f6d66`](https://github.com/finos/legend-studio/commit/b407f6d66aff1a38f3f31df122101ad9d753b3cf) ([@gayathrir11](https://github.com/gayathrir11)) - **BREAKING CHANGE:** renamed `LegendQueryApplicationPlugin.getExtraQueryEditorHelpMenuEntries()` to `getExtraQueryEditorHelpMenuActionConfigurations().`

### Patch Changes

- [#2058](https://github.com/finos/legend-studio/pull/2058) [`b407f6d66`](https://github.com/finos/legend-studio/commit/b407f6d66aff1a38f3f31df122101ad9d753b3cf) ([@gayathrir11](https://github.com/gayathrir11)) - Make query loader interface consistent for various query workflows

## 12.0.9

## 12.0.8

### Patch Changes

- [#1994](https://github.com/finos/legend-studio/pull/1994) [`33e05b833`](https://github.com/finos/legend-studio/commit/33e05b833318df21cc9a8d51f71b5d83e021e03c) ([@xannem](https://github.com/xannem)) - Consolidate filter operations and track usage

## 12.0.7

## 12.0.6

## 12.0.5

## 12.0.4

## 12.0.3

## 12.0.2

## 12.0.1

## 12.0.0

### Major Changes

- [#2113](https://github.com/finos/legend-studio/pull/2113) [`4e7b750ee`](https://github.com/finos/legend-studio/commit/4e7b750ee649033b66c87b84b4ff242ad3829580) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE**: Adapted to use new `LegendApplication` platform injection mechanism; testing utilities have been adjusted accordingly.

## 11.0.16

## 11.0.15

## 11.0.14

## 11.0.13

## 11.0.12

## 11.0.11

## 11.0.10

## 11.0.9

## 11.0.8

## 11.0.7

### Patch Changes

- [#2063](https://github.com/finos/legend-studio/pull/2063) [`7bd0dc79d`](https://github.com/finos/legend-studio/commit/7bd0dc79d5e803c0eb677b884f2f1ac48fb32b77) ([@akphi](https://github.com/akphi)) - Support relative URLs in application configuration.

## 11.0.6

## 11.0.5

## 11.0.4

## 11.0.3

## 11.0.2

## 11.0.1

## 11.0.0

### Major Changes

- [#2019](https://github.com/finos/legend-studio/pull/2019) [`e31cc1bcb`](https://github.com/finos/legend-studio/commit/e31cc1bcbb61306b4b127788854775a8325bfa57) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Renamed `*Telemetry` and `*EventService` wrappers around `TelemetryService` and `EventService` respectively to `*TelemetryHelper` and `*EventHelper` respectively.

- [#2019](https://github.com/finos/legend-studio/pull/2019) [`e31cc1bcb`](https://github.com/finos/legend-studio/commit/e31cc1bcbb61306b4b127788854775a8325bfa57) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Removed `TEMPORARY__enableThemeSwitcher` application config, as now support different theming option (though only partial support for light themes).

## 10.0.5

## 10.0.4

## 10.0.3

## 10.0.2

## 10.0.1

## 10.0.0

### Major Changes

- [#1937](https://github.com/finos/legend-studio/pull/1937) [`176371264`](https://github.com/finos/legend-studio/commit/176371264c6b3af8a14cbe4ce6d2d75a50691173) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Renamed event `query-editor.view-query -> query-editor.view-query.success`.

### Patch Changes

- [#1939](https://github.com/finos/legend-studio/pull/1939) [`a6cb0d1c7`](https://github.com/finos/legend-studio/commit/a6cb0d1c7b35ac0b71fd29473d3e84d0bf2161e6) ([@xannem](https://github.com/xannem)) - Increase readability of query builder icon option buttons

## 9.1.0

### Minor Changes

- [#1940](https://github.com/finos/legend-studio/pull/1940) [`5febc1969`](https://github.com/finos/legend-studio/commit/5febc19692f6a766cc0b85615b8f98b440ff3d1c) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Set `sdlc` to `PureModel` when building graph to avoid unnecessary calls.

### Patch Changes

- [#1916](https://github.com/finos/legend-studio/pull/1916) [`66aebc576`](https://github.com/finos/legend-studio/commit/66aebc57678dd65024ade037932dc9b0fd3b402a) ([@xannem](https://github.com/xannem)) - Display name of query upon loading query builder.

## 9.0.37

## 9.0.36

## 9.0.35

## 9.0.34

## 9.0.33

## 9.0.32

## 9.0.31

## 9.0.30

## 9.0.29

## 9.0.28

## 9.0.27

## 9.0.26

## 9.0.25

## 9.0.24

## 9.0.23

## 9.0.22

## 9.0.21

## 9.0.20

## 9.0.19

## 9.0.18

## 9.0.17

## 9.0.16

## 9.0.15

## 9.0.14

## 9.0.13

## 9.0.12

## 9.0.11

## 9.0.10

## 9.0.9

## 9.0.8

## 9.0.7

## 9.0.6

## 9.0.5

## 9.0.4

## 9.0.3

## 9.0.2

## 9.0.1

## 9.0.0

### Major Changes

- [#1565](https://github.com/finos/legend-studio/pull/1565) [`ebe9acf9`](https://github.com/finos/legend-studio/commit/ebe9acf9bc01234849e64df792693e493c95cb8f) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Reworked query setup page, the list of option is not partitioned based on various dimensions: is it create/edit action? is it advanced mode, who is the target audience, etc. In particular, we replaced `QuerySetupOptionRendererConfiguration` by `QuerySetupActionConfiguration`

  ```ts
  type QuerySetupActionConfiguration = {
    key: string;
    isCreateAction: boolean;
    isAdvanced: boolean;
    tag?: string;
    label: string;
    icon: React.ReactNode;
    className?: string | undefined;
    action: (setupStore: QuerySetupStore) => Promise<void>;
  };
  ```

### Minor Changes

- [#1565](https://github.com/finos/legend-studio/pull/1565) [`ebe9acf9`](https://github.com/finos/legend-studio/commit/ebe9acf9bc01234849e64df792693e493c95cb8f) ([@akphi](https://github.com/akphi)) - Add a new query setup mode from `taxonomy`, this requires modification to `Legend Query` config to also include `url` of `Legend Taxonomy`.

## 8.1.3

## 8.1.2

### Patch Changes

- [#1554](https://github.com/finos/legend-studio/pull/1554) [`bbf54fb1`](https://github.com/finos/legend-studio/commit/bbf54fb13ff5957cf8f9a1391388782e1a308501) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Reset query loader state on closing.

## 8.1.1

## 8.1.0

### Minor Changes

- [#1509](https://github.com/finos/legend-studio/pull/1509) [`8cbd17f0`](https://github.com/finos/legend-studio/commit/8cbd17f0d6b4854525adcdbb974d0c7a0fe4a564) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Use data space analytics result cached in `Depot` server whenever possible to speed up loading of data spaces

## 8.0.0

### Major Changes

- [#1488](https://github.com/finos/legend-studio/pull/1488) [`a90b4698`](https://github.com/finos/legend-studio/commit/a90b469846363058ac7efffcbfb8cf0070582609) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** `Legend Query` application config now requires `SDLC` entries configuration to enable the app to reason about the `SLDC` and `Studio` project/instance corresponding to a versioned project from the `Depot` server, this enables more seamless integration between `Legend Query` and `Legend Studio`, opening up avenues for new query edition modes. The new config looks like this:

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

### Minor Changes

- [#1488](https://github.com/finos/legend-studio/pull/1488) [`a90b4698`](https://github.com/finos/legend-studio/commit/a90b469846363058ac7efffcbfb8cf0070582609) ([@akphi](https://github.com/akphi)) - Add a new query setup mode `Edit existing service query` which will allow editing query of a service which is currently in `SDLC` via `Legend Studio`. Improve existing `Load query service` mode to allow loading a service in `Legend Studio`

### Patch Changes

- [#1497](https://github.com/finos/legend-studio/pull/1497) [`f10a68e`](https://github.com/finos/legend-studio/commit/f10a68e15185b58fc9d90fb55ad2a83263aa13b7) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Correct the generated `url` and the `mine-only` filter of query editor's query loader.

- [#1497](https://github.com/finos/legend-studio/pull/1497) [`f10a68e1`](https://github.com/finos/legend-studio/commit/f10a68e15185b58fc9d90fb55ad2a83263aa13b7) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Minor Query Loader improvements: Correct the url for loading a new query and improve the logic for searching `mine` queries.

- [#1488](https://github.com/finos/legend-studio/pull/1488) [`a90b4698`](https://github.com/finos/legend-studio/commit/a90b469846363058ac7efffcbfb8cf0070582609) ([@akphi](https://github.com/akphi)) - Remove `depot.TEMPORARY__useLegacyDepotServerAPIRoutes` config flag.

## 7.0.1

## 7.0.0

### Major Changes

- [#1476](https://github.com/finos/legend-studio/pull/1476) [`293f2345`](https://github.com/finos/legend-studio/commit/293f2345cd7dcc7e97fc4b6b21c7d274a1407176) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Move core `query-builder` logic out to `@finos/legend-query-builder`.

### Minor Changes

- [#1436](https://github.com/finos/legend-studio/pull/1436) [`df810467`](https://github.com/finos/legend-studio/commit/df810467d81f7317b78f12aa69c52df8f72fe5ea) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Allow loading existing queries from within of query editor ([#1435](https://github.com/finos/legend-studio/issues/1435)).

## 6.0.0

### Major Changes

- [#1457](https://github.com/finos/legend-studio/pull/1457) [`ddc2a034`](https://github.com/finos/legend-studio/commit/ddc2a034d8fe25d1eaf52058353d644f29c3da23) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Update route patterns for query editor modes: `/query/create/...` -> `/query/create/manual/...`, `/query/service/...` -> `/query/create/create-from-service`.

## 5.2.8

### Patch Changes

- [#1468](https://github.com/finos/legend-studio/pull/1468) [`d837cb7a`](https://github.com/finos/legend-studio/commit/d837cb7ae67e4de1deae98b46a4d22a298f887b9) ([@gayathrir11](https://github.com/gayathrir11)) - Propagate default milestoning dates for aggregate operations in projection

## 5.2.7

## 5.2.6

### Patch Changes

- [#1367](https://github.com/finos/legend-studio/pull/1367) [`0504cca7`](https://github.com/finos/legend-studio/commit/0504cca78844e74915cb74de045f4eed608af249) ([@gayathrir11](https://github.com/gayathrir11)) - Highlight already used properties in the explorer tree of query builder ([#1344](https://github.com/finos/legend-studio/issues/1344)).

## 5.2.5

## 5.2.4

### Patch Changes

- [#1439](https://github.com/finos/legend-studio/pull/1439) [`376a0bd5`](https://github.com/finos/legend-studio/commit/376a0bd58961b92101a401d07d5d24eb86f04106) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Fix a bug that fails to display subtypes if a propertyMapping of type parent directly points to a child classMapping ([#1437](https://github.com/finos/legend-studio/issues/1437)).

## 5.2.3

### Patch Changes

- [#1423](https://github.com/finos/legend-studio/pull/1423) [`4dacd372`](https://github.com/finos/legend-studio/commit/4dacd372db55f0998a8852855871d693b1d08374) ([@gayathrir11](https://github.com/gayathrir11)) - Fix propagating of default date for milestoned properties from association ([#1422](https://github.com/finos/legend-studio/issues/1422)).

## 5.2.2

## 5.2.1

### Patch Changes

- [#1392](https://github.com/finos/legend-studio/pull/1392) [`8be89c97`](https://github.com/finos/legend-studio/commit/8be89c970ac30f551842fc96f901900c7475016c) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Fix a bug where default value of `date` type will throw a cast error ([#1391](https://github.com/finos/legend-studio/issues/1391)).

## 5.2.0

### Minor Changes

- [#1388](https://github.com/finos/legend-studio/pull/1388) [`f30a591e`](https://github.com/finos/legend-studio/commit/f30a591e75687a52e93faa577731c2f7f372f8bf) ([@akphi](https://github.com/akphi)) - Add basic support for a light-themed mode for query editor. This will be available only to standalone mode (i.e. `Legend Query`) instead of embedded query builder since we want the embedded builder to have consistent look and field with the host app ([#1374](https://github.com/finos/legend-studio/issues/1374)). By the default, this mode will not be available in query editor, to enable it, configure the core option of query builder `extensions: { core: { TEMPORARY__enableThemeSwitcher: true }}` in `Legend Query` application config.

### Patch Changes

- [#1408](https://github.com/finos/legend-studio/pull/1408) [`823d16f8`](https://github.com/finos/legend-studio/commit/823d16f848da1bd90f7d8572762320d6a9a58dd4) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Disable options to hide parameter/post filter panel when they are not empty and deletion of aggregation projection columns if they are used in post filters. ([#1314](https://github.com/finos/legend-studio/pull/1314)).

## 5.1.0

### Minor Changes

- [#1386](https://github.com/finos/legend-studio/pull/1386) [`b73263b9`](https://github.com/finos/legend-studio/commit/b73263b9866624cbf184261603001caeb2d13685) ([@xannem](https://github.com/xannem)) - Warn when there are no projections in query-builder ([#1385](https://github.com/finos/legend-studio/issues/1385)).

* [#1381](https://github.com/finos/legend-studio/pull/1381) [`7a892e6b`](https://github.com/finos/legend-studio/commit/7a892e6b3906b7429ee89ee0fe573e4215553fbf) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add typeahead search for filter and post filter string values ([#1382](https://github.com/finos/legend-studio/issues/1382)).

## 5.0.2

### Patch Changes

- [#1350](https://github.com/finos/legend-studio/pull/1350) [`4e50f73c`](https://github.com/finos/legend-studio/commit/4e50f73cd3baa6707e776b833ca3facfff88c31d) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Allow DnD columns from projection to filter panel ([#1349](https://github.com/finos/legend-studio/issues/1349)).

* [#1359](https://github.com/finos/legend-studio/pull/1359) [`91274e40`](https://github.com/finos/legend-studio/commit/91274e40ab236f4f3898a30df9f6b817e4119778) ([@gayathrir11](https://github.com/gayathrir11)) - Block certain actions when query is not valid([#1345](https://github.com/finos/legend-studio/issues/1345)).

- [#1336](https://github.com/finos/legend-studio/pull/1336) [`de50c294`](https://github.com/finos/legend-studio/commit/de50c29416214de49b16f208bbc11925b496ea43) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Check type compatibility when dragging and dropping parameters into `filter/post-filter` panel ([#1335](https://github.com/finos/legend-studio/issues/1335)).

* [#1383](https://github.com/finos/legend-studio/pull/1383) [`846953d5`](https://github.com/finos/legend-studio/commit/846953d59c5df8136d4d516be3fba5087936671d) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Alert user about changing fetch-structure would cause a query builder state reset ([#1380](https://github.com/finos/legend-studio/issues/1380)).

- [#1358](https://github.com/finos/legend-studio/pull/1358) [`1119c45b`](https://github.com/finos/legend-studio/commit/1119c45bb8616de9d655da4fef62b8b2b7b65445) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Allow cancelling query execution ([#1357](https://github.com/finos/legend-studio/issues/1357)).

* [#1180](https://github.com/finos/legend-studio/pull/1180) [`c2c308a4`](https://github.com/finos/legend-studio/commit/c2c308a470f92bb0dfcce55d823d3da3da25b2ea) ([@gayathrir11](https://github.com/gayathrir11)) - Fix recursive viewing of parent class in explorer tree for associations ([#1172](https://github.com/finos/legend-studio/issues/1172)).

## 5.0.1

### Patch Changes

- [#1327](https://github.com/finos/legend-studio/pull/1327) [`f278124`](https://github.com/finos/legend-studio/commit/f278124133d77345ba06a1d67a664b957a475d6b) ([@gayathrir11](https://github.com/gayathrir11)) - Fix creating new milestoned query from dataspace ([#1315](https://github.com/finos/legend-studio/pull/1325)).

* [#1338](https://github.com/finos/legend-studio/pull/1338) [`72362d50`](https://github.com/finos/legend-studio/commit/72362d500dd62d529b4fd493dd6adb09a729f94e) ([@gayathrir11](https://github.com/gayathrir11)) - Mute node actions for a property node when not hovering over them

- [#1343](https://github.com/finos/legend-studio/pull/1343) [`c7d8f47e`](https://github.com/finos/legend-studio/commit/c7d8f47ed439ee782c32fd1a85f72ab9c08ab81d) ([@akphi](https://github.com/akphi)) - Use `Run Query` instead of `Execute` as button labels to be more user-friendly.

## 5.0.0

### Major Changes

- [#1332](https://github.com/finos/legend-studio/pull/1332) [`5f0c6f6b`](https://github.com/finos/legend-studio/commit/5f0c6f6b40ece8a3b87c32b52f15f542fe68f7d4) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Renamed package from `@finos/legend-query` to `@finos/legend-application-query`
