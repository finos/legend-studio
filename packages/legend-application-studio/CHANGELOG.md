# @finos/legend-application-studio

## 20.0.8

## 20.0.7

### Patch Changes

- [#1658](https://github.com/finos/legend-studio/pull/1658) [`b4bbdb774`](https://github.com/finos/legend-studio/commit/b4bbdb7742d3ae3b7952cecedeee4694840c4345) ([@xannem](https://github.com/xannem)) - fix: toogle text mode shortcut in viewer mode

- [#1676](https://github.com/finos/legend-studio/pull/1676) [`eb12c94ae`](https://github.com/finos/legend-studio/commit/eb12c94ae243c01c9ee86d563caa081349c3a771) ([@gayathrir11](https://github.com/gayathrir11)) - Add project configuration panel shortcut to project explorer action panel.

## 20.0.6

### Patch Changes

- [#1673](https://github.com/finos/legend-studio/pull/1673) [`8f2ad24a`](https://github.com/finos/legend-studio/commit/8f2ad24a458365a55f69b6189de304c9a3107f50) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Move building execution lambdas and parameter values to `legend-query-builder`.

- [#1668](https://github.com/finos/legend-studio/pull/1668) [`e63ee326`](https://github.com/finos/legend-studio/commit/e63ee3268aab39cb123b4c16d6e3d43320695b5d) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Fixed a regression introduced by #1572 where query execution with parameters of type `SimpleFunctionExpression` failed.
  Fixed a regression introduced by #1628 where failed to update mocked value after parameter's multiplicity is changed.

- [#1662](https://github.com/finos/legend-studio/pull/1662) [`8e084dd0`](https://github.com/finos/legend-studio/commit/8e084dd0b98c9fad7c9b6f8591df16ec4081b462) ([@xannem](https://github.com/xannem)) - Add field descriptions and element paths to create model connection modal

- [#1663](https://github.com/finos/legend-studio/pull/1663) [`e50a97ae`](https://github.com/finos/legend-studio/commit/e50a97aea214c4e5153c157c6e6269eec45286f3) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Add an icon to open service test doc ([#1621](https://github.com/finos/legend-studio/issues/1621)).

## 20.0.5

## 20.0.4

### Patch Changes

- [#1572](https://github.com/finos/legend-studio/pull/1572) [`cb6451c3`](https://github.com/finos/legend-studio/commit/cb6451c33e0e747ced31b631c6f5e3ba0ac6c53a) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Leverage engine to execute queries with parameters ([#1535](https://github.com/finos/legend-studio/issues/1535)).

## 20.0.3

## 20.0.2

## 20.0.1

## 20.0.0

### Major Changes

- [#1540](https://github.com/finos/legend-studio/pull/1540) [`d41811eb`](https://github.com/finos/legend-studio/commit/d41811ebff8177905ad37de45945bb12d8a8926d) ([@xannem](https://github.com/xannem)) - **BREAKING CHANGE:** Removed `ElementEditorState.hasCompilationError()`, we now have the graph compilation error at a single place in `EditorGraphState.error`.

### Minor Changes

- [#1540](https://github.com/finos/legend-studio/pull/1540) [`d41811eb`](https://github.com/finos/legend-studio/commit/d41811ebff8177905ad37de45945bb12d8a8926d) ([@xannem](https://github.com/xannem)) - Show compilation warnings in the auxiliary panel ([#941](https://github.com/finos/legend-studio/issues/941)).

- [#1540](https://github.com/finos/legend-studio/pull/1540) [`d41811eb`](https://github.com/finos/legend-studio/commit/d41811ebff8177905ad37de45945bb12d8a8926d) ([@xannem](https://github.com/xannem)) - Add a new core config option `enableGraphBuilderStrictMode` to enable strict-mode in graph builder ([#941](https://github.com/finos/legend-studio/issues/941)).

### Patch Changes

- [#1573](https://github.com/finos/legend-studio/pull/1573) [`6689b219`](https://github.com/finos/legend-studio/commit/6689b219d04cabd48a5ef59b8b52767737a9bde7) ([@akphi](https://github.com/akphi)) - Service editor: the default lambda created is now the basic lambda `|''` instead of the stubbed empty lambda ([#1588](https://github.com/finos/legend-studio/issues/1588)).

## 19.1.0

### Minor Changes

- [#1339](https://github.com/finos/legend-studio/pull/1339) [`a7b1479b`](https://github.com/finos/legend-studio/commit/a7b1479b615d65af273f3e08aefadf3be24dc1c5) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Support function overloading ([#1211](https://github.com/finos/legend-studio/issues/1211)).

## 19.0.0

### Major Changes

- [#1552](https://github.com/finos/legend-studio/pull/1552) [`683800ab`](https://github.com/finos/legend-studio/commit/683800ab3ca1752c4382f22bcf8dede42518449d) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Removed `StudioLambdaEditor` and `StudioTextInputEditor` since there is no longer need to have these components as we have generalized our keyboard handling in the parent components. Migrate to `LambaEditor` and `TextInputEditor` instead.

### Patch Changes

- [#1552](https://github.com/finos/legend-studio/pull/1552) [`683800ab`](https://github.com/finos/legend-studio/commit/683800ab3ca1752c4382f22bcf8dede42518449d) ([@akphi](https://github.com/akphi)) - Fix a problem with element renamer where we mistakenly disallow users to rename the package to have the same name as a package from another spaces (system, dependencies, generation, etc.)

- [#1567](https://github.com/finos/legend-studio/pull/1567) [`6ff83758`](https://github.com/finos/legend-studio/commit/6ff8375811246defd3ce811bf4e22e313d16d642) ([@akphi](https://github.com/akphi)) - Fix a regression introduced by #1552 where the `Edit Workspace` button in setup screen does not result in proper navigation.

## 18.1.0

### Minor Changes

- [#1514](https://github.com/finos/legend-studio/pull/1514) [`34c29c4e`](https://github.com/finos/legend-studio/commit/34c29c4e6d0f04d3f57c42528a8cb16d05261434) ([@xannem](https://github.com/xannem)) - Support configuring project platforms [#1505](https://github.com/finos/legend-studio/issues/1505)

## 18.0.2

## 18.0.1

### Patch Changes

- [#1504](https://github.com/finos/legend-studio/pull/1504) [`02703feb`](https://github.com/finos/legend-studio/commit/02703febd5f0f1f44174baf984162a305444c546) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Support showing duplicated property mappings for properties of type other than `class` (i.e. `primitive`, `enumeration`, etc.) ([#1461](https://github.com/finos/legend-studio/issues/1461)).

- [#1538](https://github.com/finos/legend-studio/pull/1538) [`34d6f9dd`](https://github.com/finos/legend-studio/commit/34d6f9dd933db20056f2e1b6ec483aafc13eb8aa) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Add service parameter multiplicity validation during service registration ([#1539](https://github.com/finos/legend-studio/issues/1539)).

## 18.0.0

### Major Changes

- [#1502](https://github.com/finos/legend-studio/pull/1502) [`81757c5c`](https://github.com/finos/legend-studio/commit/81757c5c3ff514adcc532d118ec58e830938109b) ([@xannem](https://github.com/xannem)) - **BREAKING CHANGE:** Renamed `ConnectionEditor_BooleanEditor` to `PanelFormBooleanEditor`, `PanelTextEditor` to `PanelFormTextEditor`

### Minor Changes

- [#1508](https://github.com/finos/legend-studio/pull/1508) [`10b9bc4e`](https://github.com/finos/legend-studio/commit/10b9bc4e617e1f48dfad7571523394b9103dc7f6) ([@chloeminkyung](https://github.com/chloeminkyung)) - Add `TestBatch` to Testable model and incorporate into GlobalTestRunner.

- [#1506](https://github.com/finos/legend-studio/pull/1506) [`6b299d55`](https://github.com/finos/legend-studio/commit/6b299d55c603521ffdd61d9bd17d6fa58589beb7) ([@akphi](https://github.com/akphi)) - Add a new screen to support productionizing `query` into `service`.

## 17.0.0

### Major Changes

- [#1488](https://github.com/finos/legend-studio/pull/1488) [`a90b4698`](https://github.com/finos/legend-studio/commit/a90b469846363058ac7efffcbfb8cf0070582609) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** No longer export `WorkspaceSetup` component and store-provider.

- [#1488](https://github.com/finos/legend-studio/pull/1488) [`a90b4698`](https://github.com/finos/legend-studio/commit/a90b469846363058ac7efffcbfb8cf0070582609) ([@akphi](https://github.com/akphi)) - Renamed `DSLGenerationSpecification_*` plugin extension to `DSLGeneration_*`

### Minor Changes

- [#1488](https://github.com/finos/legend-studio/pull/1488) [`a90b4698`](https://github.com/finos/legend-studio/commit/a90b469846363058ac7efffcbfb8cf0070582609) ([@akphi](https://github.com/akphi)) - Rework `workspace setup` screen to use `typeahead` instead of loading all available projects, which can be expensive to load. Also remove project selector from workspace creator modal dialog.

- [#1488](https://github.com/finos/legend-studio/pull/1488) [`a90b4698`](https://github.com/finos/legend-studio/commit/a90b469846363058ac7efffcbfb8cf0070582609) ([@akphi](https://github.com/akphi)) - Allow configuring the suggested `group ID` during projection creation via the config field `extensions.core.projectCreationGroupIdSuggestion`.

### Patch Changes

- [#1488](https://github.com/finos/legend-studio/pull/1488) [`a90b4698`](https://github.com/finos/legend-studio/commit/a90b469846363058ac7efffcbfb8cf0070582609) ([@akphi](https://github.com/akphi)) - Fix a bug where `Measure` element cannot be created from explorer panel dropdown action and context-menu.

## 16.0.2

## 16.0.1

### Patch Changes

- [#1485](https://github.com/finos/legend-studio/pull/1485) [`b2d2281c`](https://github.com/finos/legend-studio/commit/b2d2281c40ef04724951ebac78eae940eddc290c) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add viewer for dependency tree and dependency conflict in configuration editor.

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
