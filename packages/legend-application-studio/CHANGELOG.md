# @finos/legend-application-studio

## 16.0.0

### Major Changes

- [#1476](https://github.com/finos/legend-studio/pull/1476) [`293f2345`](https://github.com/finos/legend-studio/commit/293f2345cd7dcc7e97fc4b6b21c7d274a1407176) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** For `LegendStudioApplicationPlugin`, renamed `getExtraElementProjectExplorerDnDTypeGetters()` to `getExtraDragElementClassifiers()` and `getExtraPureGrammarTextEditorDnDTypes()` to `getExtraPureGrammarTextEditorDragElementTypes()`. For `StoreRelational_LegendStudioApplicationPlugin_Extension`, renamed `getExtraDatasourceSpecificationTypeGetters()` to `getExtraDatasourceSpecificationClassifiers()` and `getExtraAuthenticationStrategyTypeGetters()` to `getExtraAuthenticationStrategyClassifiers()`.

- [#1476](https://github.com/finos/legend-studio/pull/1476) [`293f2345`](https://github.com/finos/legend-studio/commit/293f2345cd7dcc7e97fc4b6b21c7d274a1407176) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Removed `getExtraMappingExecutionQueryEditorActionConfigurations()`, `getExtraMappingTestQueryEditorActionConfigurations()`, and `getExtraServiceQueryEditorActionConfigurations()`;

### Minor Changes

- [#1481](https://github.com/finos/legend-studio/pull/1481) [`4fd88c58`](https://github.com/finos/legend-studio/commit/4fd88c58b66dd3033db1f2f45e4cbedd0420b57e) ([@xannem](https://github.com/xannem)) - Add suggestion code snippet for relational database connection post-processor.

## 15.2.0

### Minor Changes

- [#1434](https://github.com/finos/legend-studio/pull/1434) [`138d9989`](https://github.com/finos/legend-studio/commit/138d9989b59ae3e816e19a149f842f24754ec9d9) ([@xannem](https://github.com/xannem)) - Add form editor for post-processor ([#945](https://github.com/finos/legend-studio/issues/945)).

## 15.1.0

### Minor Changes

- [#1464](https://github.com/finos/legend-studio/pull/1464) [`c8208ca6`](https://github.com/finos/legend-studio/commit/c8208ca63e3c4fefb5fc744e58d42c1715a51245) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add use `TEMPORARY__storeModel` option to `FULL_INTERACTIVE` service execution mode.

- [#1454](https://github.com/finos/legend-studio/pull/1454) [`579ab722`](https://github.com/finos/legend-studio/commit/579ab722b80baf8f59725bd42eb97302fd2663cf) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add `FULL_INTERACTIVE_LIGHT` as a service registration mode.

## 15.0.1

## 15.0.0

### Major Changes

- [#1445](https://github.com/finos/legend-studio/pull/1445) [`a66230e9`](https://github.com/finos/legend-studio/commit/a66230e9ce6e391572e0224cfe48ad4f411baf17) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - **BREAKING CHANGE:** Add `ExtensionModelImportRendererState` to `ModelImporterExtensionConfiguration`

## 14.0.0

### Major Changes

- [#1432](https://github.com/finos/legend-studio/pull/1432) [`10475f94`](https://github.com/finos/legend-studio/commit/10475f94fceddb4c70d370f1ea7a3e02fc67efd2) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - **BREAKING CHANGE:** Rename `ModelLoaderExtensionConfiguration` to `ModelImporterExtensionConfiguration`

### Minor Changes

- [#1432](https://github.com/finos/legend-studio/pull/1432) [`10475f94`](https://github.com/finos/legend-studio/commit/10475f94fceddb4c70d370f1ea7a3e02fc67efd2) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Leverage external format apis for model importing.

## 13.1.2

### Patch Changes

- [#1238](https://github.com/finos/legend-studio/pull/1238) [`650f85bd`](https://github.com/finos/legend-studio/commit/650f85bd22010b07d95d46648a5d9e2802e2f5c5) ([@jinanisha](https://github.com/jinanisha)) - Add support for middle Tier Authentication Strategy

* [#1425](https://github.com/finos/legend-studio/pull/1425) [`3fc5ab8f`](https://github.com/finos/legend-studio/commit/3fc5ab8f4b28529e096000337691c1cafb98c38f) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Support creation of self-referenced associations in form mode ([#1398](https://github.com/finos/legend-studio/issues/1398)).

## 13.1.1

## 13.1.0

### Minor Changes

- [#1388](https://github.com/finos/legend-studio/pull/1388) [`f30a591e`](https://github.com/finos/legend-studio/commit/f30a591e75687a52e93faa577731c2f7f372f8bf) ([@akphi](https://github.com/akphi)) - Improve project search command to show full element package path; we also allow searching for elements from dependencies and generated elements.

* [#1395](https://github.com/finos/legend-studio/pull/1395) [`4c81ab5a`](https://github.com/finos/legend-studio/commit/4c81ab5aba69220fb5c2a4ac1ea97e05492ea110) ([@xannem](https://github.com/xannem)) - Allow re-arranging sub-elements (class properties, tagged values, etc.) in UML editors ([#303](https://github.com/finos/legend-studio/pull/303)).

## 13.0.3

## 13.0.2

### Patch Changes

- [#1377](https://github.com/finos/legend-studio/pull/1377) [`4c7169e3`](https://github.com/finos/legend-studio/commit/4c7169e348887bf462830cb64812ef4b1792875c) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Support execution cancellation for `mapping editor` and `service editor` ([#1376](https://github.com/finos/legend-studio/issues/1376)).

## 13.0.1

### Patch Changes

- [#1343](https://github.com/finos/legend-studio/pull/1343) [`c7d8f47e`](https://github.com/finos/legend-studio/commit/c7d8f47ed439ee782c32fd1a85f72ab9c08ab81d) ([@akphi](https://github.com/akphi)) - Use `Run Query` instead of `Execute` as button labels to be more user-friendly.

## 13.0.0

### Major Changes

- [#1332](https://github.com/finos/legend-studio/pull/1332) [`5f0c6f6b`](https://github.com/finos/legend-studio/commit/5f0c6f6b40ece8a3b87c32b52f15f542fe68f7d4) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Renamed package from `@finos/legend-studio` to `@finos/legend-application-studio`
