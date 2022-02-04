# @finos/legend-studio

## 2.4.1

## 2.4.0

### Minor Changes

- [#749](https://github.com/finos/legend-studio/pull/749) [`4e2eddbc`](https://github.com/finos/legend-studio/commit/4e2eddbc44760092e79bf22cbac809e6c3d11e35) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Update to workspace head revision when current revision is out of sync. Provide conflict resolution editor when conflicts exists.

* [#778](https://github.com/finos/legend-studio/pull/778) [`b8ee4134`](https://github.com/finos/legend-studio/commit/b8ee4134b62ddfde08993b9d4a327f2f2c5e0d8e) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Show `Workflow Manager` in viewer mode.

## 2.3.2

## 2.3.1

## 2.3.0

### Minor Changes

- [#755](https://github.com/finos/legend-studio/pull/755) [`61821cd6`](https://github.com/finos/legend-studio/commit/61821cd62c3b8b1a16124a092038ab963311de17) ([@akphi](https://github.com/akphi)) - Allow configuring base headers for SDLC server client to facillitate configuring private-access token for end-to-end testing.

* [#748](https://github.com/finos/legend-studio/pull/748) [`f4930597`](https://github.com/finos/legend-studio/commit/f49305970ad17c64030daa2171ec8b7c92c37472) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Support upload and load patch.

### Patch Changes

- [#767](https://github.com/finos/legend-studio/pull/767) [`a6ebbc41`](https://github.com/finos/legend-studio/commit/a6ebbc410e275c9b01b1b05a26415c50efdce76e) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Show schemas, tables and columns in alphabetical order in `database builder`.

* [#747](https://github.com/finos/legend-studio/pull/747) [`d67ae629`](https://github.com/finos/legend-studio/commit/d67ae629ca5284be03096425c9c546fcf9dfd776) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Fix relational connection editor for `UsernamePassword` AuthenticationStrategy.

- [#753](https://github.com/finos/legend-studio/pull/753) [`1bc5f698`](https://github.com/finos/legend-studio/commit/1bc5f6983c8020a9e07071cce2c901d01af53940) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Show `ProjectOverview` in viewer mode.

* [#768](https://github.com/finos/legend-studio/pull/768) [`f2927570`](https://github.com/finos/legend-studio/commit/f2927570b2afdc2954912bdbb20058606d2cf8bc) ([@gayathrir11](https://github.com/gayathrir11)) - Handle empty error messages from Engine.

## 2.2.1

## 2.2.0

### Minor Changes

- [#742](https://github.com/finos/legend-studio/pull/742) [`42ea0ed9`](https://github.com/finos/legend-studio/commit/42ea0ed977608804b41fb8272daeb2130a4f6143) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add support for `UsernamePasswordAuthenticationStrategy`.

### Patch Changes

- [#680](https://github.com/finos/legend-studio/pull/680) [`69c607e6`](https://github.com/finos/legend-studio/commit/69c607e641beb4827b2a9c17baa6b699c9384d14) ([@gayathrir11](https://github.com/gayathrir11)) - Show warning about duplicated attributes in UML editors.

## 2.1.1

## 2.1.0

### Minor Changes

- [#707](https://github.com/finos/legend-studio/pull/707) [`5d9912d9`](https://github.com/finos/legend-studio/commit/5d9912d9a2c883e23d8852325a25fe59ae7597b1) ([@akphi](https://github.com/akphi)) - The abstract plugin now has a default generic `install` method which just registers the plugin to the compatible plugin manager, this saves plugin author some time and code when implementing plugins.

* [#640](https://github.com/finos/legend-studio/pull/640) [`b5ce0f99`](https://github.com/finos/legend-studio/commit/b5ce0f995b0e512b5cc3e19aebc75654ff9c24b0) ([@CptTeddy](https://github.com/CptTeddy)) - Added extension mechanism for actions in file generation output viewer. Also added an extension mechanism for file generation type vs. element type matrix (i.e. which element types work with which generation type); \_previously, we only allow `Class` and `Enumeration`.

### Patch Changes

- [#716](https://github.com/finos/legend-studio/pull/716) [`79176bcf`](https://github.com/finos/legend-studio/commit/79176bcfd614d580e15ec1b16abfceb02a1a03e1) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Use `Join` owner as the database owner when dragging join into `RelationalPropertyMappingEditor` ([#651](https://github.com/finos/legend-studio/issues/651)).

* [#707](https://github.com/finos/legend-studio/pull/707) [`5d9912d9`](https://github.com/finos/legend-studio/commit/5d9912d9a2c883e23d8852325a25fe59ae7597b1) ([@akphi](https://github.com/akphi)) - Rework file generation scope filter: the filter will only be activated if the generation type matches. We now also show all generation types in viewer mode dropdown and disable the ones that are not applicable to the currently viewed element.

- [#706](https://github.com/finos/legend-studio/pull/706) [`1c421e43`](https://github.com/finos/legend-studio/commit/1c421e4373a2d8258ac35d0c330487f63f3e6d15) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Sort workflow `jobs` by creation date.

* [#712](https://github.com/finos/legend-studio/pull/712) [`02fbbcf8`](https://github.com/finos/legend-studio/commit/02fbbcf810554addbbc47c1d29b11af00a134db7) ([@gayathrir11](https://github.com/gayathrir11)) - Add support for role in `Snowflake` connection

## 2.0.2

### Patch Changes

- [#700](https://github.com/finos/legend-studio/pull/700) [`2063cc76`](https://github.com/finos/legend-studio/commit/2063cc76fb27d65f4e287041014ab347a80b4663) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Fix rendering generated file with no content in file generation editor.

* [#701](https://github.com/finos/legend-studio/pull/701) [`c4039cfc`](https://github.com/finos/legend-studio/commit/c4039cfc3efe33d720da040d96dbf4564b8c5a26) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Fetch depot projects for dependencies only in dependency tab in the config editor.

## 2.0.1

## 2.0.0

### Major Changes

- [#692](https://github.com/finos/legend-studio/pull/692) [`caab0e67`](https://github.com/finos/legend-studio/commit/caab0e6772181e514b246fe6030a02e7169952cc) ([@akphi](https://github.com/akphi)) - Moved `AppHeader` component to `@finos/legend-application`, renamed `AppHeaderMenu` to `LegendStudioAppHeaderMenu`.

* [#692](https://github.com/finos/legend-studio/pull/692) [`caab0e67`](https://github.com/finos/legend-studio/commit/caab0e6772181e514b246fe6030a02e7169952cc) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Rename the enum `STUDIO_LOG_EVENT` to `LEGEND_STUDIO_LOG_EVENT_TYPE`, `STUDIO_HOTKEY` to `LEGEND_STUDIO_HOTKEY`, and `STUDIO_TEST_ID` to `LEGEND_STUDIO_TEST_ID`.

### Patch Changes

- [#663](https://github.com/finos/legend-studio/pull/663) [`44115178`](https://github.com/finos/legend-studio/commit/44115178fa3bad5d3f2225aa8b1330e89f721993) ([@gayathrir11](https://github.com/gayathrir11)) - Fix bug in `FileGenerationEditor` not resetting while changing elements ([#142](https://github.com/finos/legend-studio/issues/142)]).

* [#685](https://github.com/finos/legend-studio/pull/685) [`1ae0553b`](https://github.com/finos/legend-studio/commit/1ae0553b7af88217a8642492cab2252a589ab091) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Change `StudioPlugin` to `LegendStudioPlugin`. This change applies for other extension-related classes as well, e.g. `LegendStudioPluginManager`, `*_LegendStudioPreset`, `*_LegendStudioPlugin`, etc.

## 1.0.0

### Major Changes

- [#642](https://github.com/finos/legend-studio/pull/642) [`729e248`](https://github.com/finos/legend-studio/commit/729e248634a3710d94257ead28c7a0c9307798cb) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** The handling of multiple SDLC instances has been reworked, to target a specific server option in the config, the URL must now include an additional prefix `sdlc-` to the server key, for example, `/studio/myServer/...` now becomes `/studio/sdlc-myServer/...`. On the config side, when `sdlc` field is configured with a list of option, we expect exactly one option to declare `default: true` and this would be used to the default option - _the old behavior is that the default option is the one with key of value `-`_.

* [#659](https://github.com/finos/legend-studio/pull/659) [`caf3d4aa`](https://github.com/finos/legend-studio/commit/caf3d4aa3a98ca109cabb525eeb7d8615def7343) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Generalize `Studio` plugin methods to generate `Edit Query` buttons to generate any query editor action: i.e. `MappingExecutionQueryEditorRendererConfiguration -> MappingExecutionQueryEditorActionConfiguration`, etc.

- [#642](https://github.com/finos/legend-studio/pull/642) [`729e2486`](https://github.com/finos/legend-studio/commit/729e248634a3710d94257ead28c7a0c9307798cb) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Update the shape of `ApplicationPageRenderEntry` to take a unique `key` and multiple `urlPatterns`. Also, we nolonger automatically decorate the pattern to pick up the SDLC instance anymore, so plugin authors who need this will need to manually modify their URL patterns with the function `generateRoutePatternWithSDLCServerKey()` that we now expose.

### Minor Changes

- [#654](https://github.com/finos/legend-studio/pull/654) [`c22549e8`](https://github.com/finos/legend-studio/commit/c22549e8a1cfc567669255a862449819f19894dd) ([@gayathrir11](https://github.com/gayathrir11)) - Add extension mechanism for `class mapping` decorators in form mode

* [#642](https://github.com/finos/legend-studio/pull/642) [`729e2486`](https://github.com/finos/legend-studio/commit/729e248634a3710d94257ead28c7a0c9307798cb) ([@akphi](https://github.com/akphi)) - Allow getting link to element in a particular version, revision, and project (via `SDLC` or via `Depot`) in viewer mode.

- [#639](https://github.com/finos/legend-studio/pull/639) [`62985e59`](https://github.com/finos/legend-studio/commit/62985e59627b5be2cb75e15f30c13d029014c030) ([@akphi](https://github.com/akphi)) - Allow accessing viewer mode using [GAV coordinates] (i.e. `groupId`, `artifactId`, and `versionId`). As this fetches model data from `Depot` server, in this mode, certain `SDLC` [features will not be supported](https://github.com/finos/legend-studio/issues/638). The URL pattern for this is `/view/${groupId}:${artifactId}:${versionId}`, e.g. `/view/legend.org.test:legend-test-project:latest`.

* [#642](https://github.com/finos/legend-studio/pull/642) [`729e2486`](https://github.com/finos/legend-studio/commit/729e248634a3710d94257ead28c7a0c9307798cb) ([@akphi](https://github.com/akphi)) - Introduce `EditorMode` as an extension mechanism for `EditorStore` to accomondate for differentiating behaviors between `viewer`, `review`, `conflict-resolution` modes, etc. (for more details, see [#317](https://github.com/finos/legend-studio/issues/317)).

### Patch Changes

- [#629](https://github.com/finos/legend-studio/pull/629) [`2d855dc`](https://github.com/finos/legend-studio/commit/2d855dc1e74f3d3cbfedbdf9750730ffe52d4cdd) ([@mrudula-gs](https://github.com/mrudula-gs)) - Fix a problem with escaping of single quote character which causes service tests created in Studio fail ([#586](https://github.com/finos/legend-studio/issues/586)), this can be considered a workaround until we figure out a strategy for the discrepancies in mapping test and service test runners in `Engine` (see [finos/legend-engine#429](https://github.com/finos/legend-engine/issues/429))

* [#661](https://github.com/finos/legend-studio/pull/661) [`5124f7b6`](https://github.com/finos/legend-studio/commit/5124f7b63ab9a7b7224df28b50c4f0f9fec753cd) ([@gayathrir11](https://github.com/gayathrir11)) - Add form support for proxy in `Snowflake` connection.

- [#662](https://github.com/finos/legend-studio/pull/662) [`fb8bd11c`](https://github.com/finos/legend-studio/commit/fb8bd11cb958b2d92e6f68e22db974569832bccf) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Properly process enumeration mappings in includes mapping ([#658](https://github.com/finos/legend-studio/issues/658)).

* [#632](https://github.com/finos/legend-studio/pull/632) [`a7ade917`](https://github.com/finos/legend-studio/commit/a7ade917da293d4efe062a2a8e569c6f8d4c54d7) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add workflow jobs viewer with the ability to retry/run/cancel individual jobs.

- [#642](https://github.com/finos/legend-studio/pull/642) [`729e2486`](https://github.com/finos/legend-studio/commit/729e248634a3710d94257ead28c7a0c9307798cb) ([@akphi](https://github.com/akphi)) - Allow user to select the instances of SDLC server via a dropdown menu on the header. Note that this only shows when there are multiple SDLC servers available in the config.

* [#645](https://github.com/finos/legend-studio/pull/645) [`dc50b13a`](https://github.com/finos/legend-studio/commit/dc50b13a845916b21fa3146aff730bfee9f37df1) ([@YannanGao-gs](https://github.com/YannanGao-gs)) - Replace `Table|View` with `TableAlias` as the relational mapping source, i.e `MappingElementSource`. Fixes generating mapping test with nested databases (see [#651](https://github.com/finos/legend-studio/issues/651)] for more details).

## 0.4.1

## 0.4.0

### Minor Changes

- [#580](https://github.com/finos/legend-studio/pull/580) [`7318c222`](https://github.com/finos/legend-studio/commit/7318c2223d5653be18f00a489aa00b3143a600fe) ([@gayathrir11](https://github.com/gayathrir11)) - Add extension mechanism for `class mapping` in form mode

### Patch Changes

- [#584](https://github.com/finos/legend-studio/pull/584) [`b32e834b`](https://github.com/finos/legend-studio/commit/b32e834ba037658de53632403c79aa0f0f651971) ([@akphi](https://github.com/akphi)) - Support word-wraping for text-mode.

## 0.3.4

### Patch Changes

- [#568](https://github.com/finos/legend-studio/pull/568) [`46ccd87d`](https://github.com/finos/legend-studio/commit/46ccd87d3bd7c65ab26cb5b1c58d9ed007e5cc78) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Support `group` workspaces where multiple users can collaborate.

* [#534](https://github.com/finos/legend-studio/pull/534) [`a116f644`](https://github.com/finos/legend-studio/commit/a116f6449cedf810aa13ec1e45e271b3c38fa69c) ([@gayathrir11](https://github.com/gayathrir11)) - Add extension mechanism for connection

- [#568](https://github.com/finos/legend-studio/pull/568) [`46ccd87d`](https://github.com/finos/legend-studio/commit/46ccd87d3bd7c65ab26cb5b1c58d9ed007e5cc78) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Use `Workflow API` instead of the _deprecated_ `Build API`.

* [#543](https://github.com/finos/legend-studio/pull/543) [`68f777ba`](https://github.com/finos/legend-studio/commit/68f777ba740244cb8f88f6455263316548b03cfd) ([@gs-gunjan](https://github.com/gs-gunjan)) - CSV support for input data of relational mapping tests

## 0.3.3

### Patch Changes

- [#566](https://github.com/finos/legend-studio/pull/566) [`373dcf8b`](https://github.com/finos/legend-studio/commit/373dcf8b214510ceda72212d484f179869900514) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Use maven coordinates for service registration.

## 0.3.2

### Patch Changes

- [#554](https://github.com/finos/legend-studio/pull/554) [`f1d15408`](https://github.com/finos/legend-studio/commit/f1d15408b905fb96efa8da714421a827ab396709) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Revert service registration using project coordinates.

## 0.3.1

## 0.3.0

### Minor Changes

- [#537](https://github.com/finos/legend-studio/pull/537) [`c3ee3029`](https://github.com/finos/legend-studio/commit/c3ee3029307ae0987c4346d09871cf22f6007f01) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add support for class mapping `extends`.

### Patch Changes

- [#532](https://github.com/finos/legend-studio/pull/532) [`0ec098d2`](https://github.com/finos/legend-studio/commit/0ec098d20f607fd1fc848a1ce51432791e7ec717) ([@akphi](https://github.com/akphi)) - Fix the problem with Studio change detection engine where after fixing compilation issue for a project that was never properly initialized, all elements are shown as `New` instead of `Modified` ([#533](https://github.com/finos/legend-studio/issues/533))

* [#535](https://github.com/finos/legend-studio/pull/535) [`ebe69b6a`](https://github.com/finos/legend-studio/commit/ebe69b6a8c33237fd11c3522e20130d9c4aa2026) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Use maven coordinates for service registration.

- [#537](https://github.com/finos/legend-studio/pull/537) [`c3ee3029`](https://github.com/finos/legend-studio/commit/c3ee3029307ae0987c4346d09871cf22f6007f01) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add support for `include` mappings.

## 0.2.21

### Patch Changes

- [#521](https://github.com/finos/legend-studio/pull/521) [`8d457b59`](https://github.com/finos/legend-studio/commit/8d457b59aedc72039a6f50850d1bc2ae959b0ecd) ([@umarphaarook](https://github.com/umarphaarook)) - Fix an issue with opening a particular element in viewer mode from main editor ([#503](https://github.com/finos/legend-studio/issues/503))

* [#506](https://github.com/finos/legend-studio/pull/506) [`4fd0d256`](https://github.com/finos/legend-studio/commit/4fd0d2560ef245d97f1d86a4a6ed227a9c3d2cbe) ([@akphi](https://github.com/akphi)) - Support importing `query` in `Service` editor.

- [#498](https://github.com/finos/legend-studio/pull/498) [`61f0a0bb`](https://github.com/finos/legend-studio/commit/61f0a0bb342bd838673b10d65d1e16023c450901) ([@kshradhan](https://github.com/kshradhan)) - Add form editor for Pure Instance set implementation filter.

* [#512](https://github.com/finos/legend-studio/pull/512) [`f22a375a`](https://github.com/finos/legend-studio/commit/f22a375ae14770fe3e62b2ec405fbfe728f0d0e3) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Show full `lambda` (including `parameters`) when displaying service `query` in service editor.

## 0.2.20

### Patch Changes

- [#513](https://github.com/finos/legend-studio/pull/513) [`5968c8c8`](https://github.com/finos/legend-studio/commit/5968c8c81c6079a258433bc757ced4baade4e75d) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Allow editing of `ProjectConfiguration` when a dependency graph error occurs ([#269](https://github.com/finos/legend-studio/issues/269)).

## 0.2.19

### Patch Changes

- [#460](https://github.com/finos/legend-studio/pull/460) [`c719991e`](https://github.com/finos/legend-studio/commit/c719991ea2791d8de86ca470735491318d1441fb) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Use `depot` server to query for available dependency projects. Switch to adding dependency using project coordinates consisting of `groupId` and `artifactId`.

## 0.2.18

### Patch Changes

- [#464](https://github.com/finos/legend-studio/pull/464) [`945574e7`](https://github.com/finos/legend-studio/commit/945574e725ea6103c9016554ce35ef4d6aeaf478) ([@akphi](https://github.com/akphi)) - Fix layout problem when there are many items being opened causing the tab bar to overflow and activity bar to disappear ([#462](https://github.com/finos/legend-studio/issues/462)).

* [#464](https://github.com/finos/legend-studio/pull/464) [`945574e7`](https://github.com/finos/legend-studio/commit/945574e725ea6103c9016554ce35ef4d6aeaf478) ([@akphi](https://github.com/akphi)) - Fix problem where model test data generation fails when encoutering enumeration with 0 or 1 enum value ([#463](https://github.com/finos/legend-studio/issues/463)). Also, we ensure this kind of error is handled gracefully and do not crash the application.

## 0.2.17

## 0.2.16

## 0.2.15

### Patch Changes

- [#447](https://github.com/finos/legend-studio/pull/447) [`26d4dd14`](https://github.com/finos/legend-studio/commit/26d4dd14d7010fb5141c009b494673ec97566873) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Use dependency `groupId` and `artifactId` when fetching dependency entities from the depot server.

## 0.2.14

### Patch Changes

- [#443](https://github.com/finos/legend-studio/pull/443) [`c408f16`](https://github.com/finos/legend-studio/commit/c408f16dc60474ef6c28e5e4484053b4928c2afc) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Operation class mapping editor will now help user avoid creating cycle ([#298](https://github.com/finos/legend-studio/issues/298)).

* [#444](https://github.com/finos/legend-studio/pull/444) [`9c6c7386`](https://github.com/finos/legend-studio/commit/9c6c7386bb5c884fdf0077a1dcba6b46dfa840ce) ([@akphi](https://github.com/akphi)) - Move `DSL Diagram` logic to a new separate extension package `@finos/legend-extension-dsl-diagram`.

- [#451](https://github.com/finos/legend-studio/pull/451) [`e696205c`](https://github.com/finos/legend-studio/commit/e696205c2d09722ea5d9d1d75daac24e6c279c4e) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add `workspaceType` to create review command and default to `USER` type.

## 0.2.13

## 0.2.12

## 0.2.11

### Patch Changes

- [#427](https://github.com/finos/legend-studio/pull/427) [`23b59b89`](https://github.com/finos/legend-studio/commit/23b59b8962c5049d1605bcb262c16cd3c012a1dd) ([@akphi](https://github.com/akphi)) - Rename `EditorPlugin` to `StudioPlugin`.

* [#427](https://github.com/finos/legend-studio/pull/427) [`23b59b89`](https://github.com/finos/legend-studio/commit/23b59b8962c5049d1605bcb262c16cd3c012a1dd) ([@akphi](https://github.com/akphi)) - Move `SDLC` logic out of `ApplicationStore` into `StudioStore`. Utilize the new `useSDLCServerClient()` and `useDepotServerClient()` hooks.

- [#429](https://github.com/finos/legend-studio/pull/429) [`cf0afba`](https://github.com/finos/legend-studio/commit/cf0afba6c2328b50d0ba9ebc7af312f737e88c0e) ([@akphi](https://github.com/akphi)) - Update the structure of application config file, `options` field is now replaced by `extensions`.

* [#427](https://github.com/finos/legend-studio/pull/427) [`23b59b89`](https://github.com/finos/legend-studio/commit/23b59b8962c5049d1605bcb262c16cd3c012a1dd) ([@akphi](https://github.com/akphi)) - Rename `metadata` to `depot` in Studio config file.

- [#410](https://github.com/finos/legend-studio/pull/410) [`a1dfc165`](https://github.com/finos/legend-studio/commit/a1dfc165dcf98eeea624400abc9f3c97eb2fda52) ([@akphi](https://github.com/akphi)) - No longer make engine re-authentication use SDLC authorize endpoint as this is very situational depending on the deployment context and how the servers are set up. We make this configurable instead.

* [#422](https://github.com/finos/legend-studio/pull/422) [`985eef5d`](https://github.com/finos/legend-studio/commit/985eef5def2e4c115ba2ac25dbb851e084758ddc) ([@akphi](https://github.com/akphi)) - Show committed reviews when the project has no release (https://github.com/finos/legend-studio/issues/426).

- [#422](https://github.com/finos/legend-studio/pull/422) [`985eef5d`](https://github.com/finos/legend-studio/commit/985eef5def2e4c115ba2ac25dbb851e084758ddc) ([@akphi](https://github.com/akphi)) - Move store provider and React hooks (e.g. `EditorStoreProvider`, `useEditorStore`, etc.) out of `/stores` and into `/components`.

* [#422](https://github.com/finos/legend-studio/pull/422) [`985eef5d`](https://github.com/finos/legend-studio/commit/985eef5def2e4c115ba2ac25dbb851e084758ddc) ([@akphi](https://github.com/akphi)) - Fix a bug with mock data generator sometimes not generating a value for `boolean` fields (https://github.com/finos/legend-studio/issues/425).

- [#420](https://github.com/finos/legend-studio/pull/420) [`1fe16d1`](https://github.com/finos/legend-studio/commit/1fe16d1b47969817be5eefa532653bdbeb9ef18c) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Remove `TEMPORARY__disableSDLCProjectStructureSupport` application config flag.

* [#427](https://github.com/finos/legend-studio/pull/427) [`23b59b89`](https://github.com/finos/legend-studio/commit/23b59b8962c5049d1605bcb262c16cd3c012a1dd) ([@akphi](https://github.com/akphi)) - Cleanup test utilities: Add `TEST__` and `TEST_DATA__` prefixes for test utilities and test data to avoid polluting namespace. Rename methods that supply mocked store/state to `TEST__provideMocked...`

- [#427](https://github.com/finos/legend-studio/pull/427) [`23b59b89`](https://github.com/finos/legend-studio/commit/23b59b8962c5049d1605bcb262c16cd3c012a1dd) ([@akphi](https://github.com/akphi)) - Move shared application logic and components such as `ApplicationStore`, `WebApplicationNavigator`, `LambdaEditor`, etc. to `@finos/legend-application`.

* [#379](https://github.com/finos/legend-studio/pull/379) [`19c76946`](https://github.com/finos/legend-studio/commit/19c769468f504512882fa795d38c24410460a17e) ([@umarphaarook](https://github.com/umarphaarook)) - View project configuration in viewer mode

- [#413](https://github.com/finos/legend-studio/pull/413) [`72d1da75`](https://github.com/finos/legend-studio/commit/72d1da758f6b5c9c7011470ba6f58b434c6c5a12) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Handle no user input for `PackageableElementImplicitReference`.

## 0.2.10

## 0.2.9

## 0.2.8

## 0.2.7

### Patch Changes

- [#390](https://github.com/finos/legend-studio/pull/390) [`bbba2e3`](https://github.com/finos/legend-studio/commit/bbba2e34487c32a4bd41033d485fc8dbf22d32fb) ([@akphi](https://github.com/akphi)) - Generalize `LambdaEditor` so it nolonger depends on `EditorStore` and can be used between different Legend applications.

## 0.2.6

## 0.2.5

### Patch Changes

- [#384](https://github.com/finos/legend-studio/pull/384) [`56481ff`](https://github.com/finos/legend-studio/commit/56481ffa9efceff47cfb11e3bb9a11103e6c17cc) ([@kshradhan](https://github.com/kshradhan)) - Pre-format function body grammar text in function editor.

* [#388](https://github.com/finos/legend-studio/pull/388) [`6815fcf`](https://github.com/finos/legend-studio/commit/6815fcfba58d0123dbed0e188224eeeda35d4ea9) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Fix service test parameters property name to `parametersValues`.

- [#392](https://github.com/finos/legend-studio/pull/392) [`fece600`](https://github.com/finos/legend-studio/commit/fece600d582fd4bb8185d31235d60c2d1d2e46b8) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Remove editor for review description and add default description.

* [#385](https://github.com/finos/legend-studio/pull/385) [`13fe9da`](https://github.com/finos/legend-studio/commit/13fe9dace3aa5aa54a936710e32a46a35a4971c3) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Change `HACKY_createServiceTestAssertLambda` to assert equality on json strings to avoid failure on white spaces and extra lines.

- [#391](https://github.com/finos/legend-studio/pull/391) [`f01f274`](https://github.com/finos/legend-studio/commit/f01f2741c7df7528dec8593bfb87692497b5f56b) ([@akphi](https://github.com/akphi)) - Allow specifying description when creating a new review.

## 0.2.4

### Patch Changes

- [#374](https://github.com/finos/legend-studio/pull/374) [`f0dd419`](https://github.com/finos/legend-studio/commit/f0dd4192cdb032579faebf833f78c06020055b28) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Clean up execution plan state and add execution plan viewer to service and execution mapping tab.

* [#378](https://github.com/finos/legend-studio/pull/378) [`25e8287`](https://github.com/finos/legend-studio/commit/25e8287c67375fc6d824aee679396e704c7f060f) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Fix handling of raw instance type in milestoning's infinity date.

## 0.2.3

### Patch Changes

- [#364](https://github.com/finos/legend-studio/pull/364) [`73e5fa2`](https://github.com/finos/legend-studio/commit/73e5fa241ccc3b7464bb7c767316f37cd1c08a6e) ([@varunmaddipati](https://github.com/varunmaddipati)) - Add support for `Redshift` connection.

* [#355](https://github.com/finos/legend-studio/pull/355) [`0f1c685`](https://github.com/finos/legend-studio/commit/0f1c6858b08e32447fc3bfef4a9043f0fe30a523) ([@akphi](https://github.com/akphi)) - Refactor codebase to use new syntax for `Mobx` `flow` and `flowResult` (related to [#83](https://github.com/finos/legend-studio/issues/83)).

  **BREAKING CHANGE:** A fair amount of core methods are now nolonger returning `Promise<...>`, but instead `GeneratorFn<...>` due to the new `flow` syntax. This does not affect the functionality, just the syntax.

- [#355](https://github.com/finos/legend-studio/pull/355) [`0f1c685`](https://github.com/finos/legend-studio/commit/0f1c6858b08e32447fc3bfef4a9043f0fe30a523) ([@akphi](https://github.com/akphi)) - Refactor graphs to use `ActionState` (See [#283](https://github.com/finos/legend-studio/issues/283)).

* [#355](https://github.com/finos/legend-studio/pull/355) [`0f1c685`](https://github.com/finos/legend-studio/commit/0f1c6858b08e32447fc3bfef4a9043f0fe30a523) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Renamed application class `Studio` to `LegendStudio`.

- [#368](https://github.com/finos/legend-studio/pull/368) [`f7c181d`](https://github.com/finos/legend-studio/commit/f7c181dbc779e896726be7af535006f50c082345) ([@nayanika2](https://github.com/nayanika2)) - Execution plan viewer MVP (See [#289](https://github.com/finos/legend-studio/issues/289)).

* [#355](https://github.com/finos/legend-studio/pull/355) [`0f1c685`](https://github.com/finos/legend-studio/commit/0f1c6858b08e32447fc3bfef4a9043f0fe30a523) ([@akphi](https://github.com/akphi)) - Refactor tests to use a shared method for building simple graph for testing.

## 0.2.2

## 0.2.1

### Patch Changes

- [#363](https://github.com/finos/legend-studio/pull/363) [`bce6f04`](https://github.com/finos/legend-studio/commit/bce6f04d4f90bcf0e4f7980e412e45362a15a36e) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Rename methods in `BasicModel`: add `own` to methods name to avoid confusion on when consumers are interacting with elements from the whole graph (in `PureModel`) or elements just from the graph itself.

* [#363](https://github.com/finos/legend-studio/pull/363) [`bce6f04`](https://github.com/finos/legend-studio/commit/bce6f04d4f90bcf0e4f7980e412e45362a15a36e) ([@akphi](https://github.com/akphi)) - Support filtering system elements from selection dropdown to make forms more user-friendly (see [#280](https://github.com/finos/legend-studio/issues/280)).

- [#363](https://github.com/finos/legend-studio/pull/363) [`bce6f04`](https://github.com/finos/legend-studio/commit/bce6f04d4f90bcf0e4f7980e412e45362a15a36e) ([@akphi](https://github.com/akphi)) - Remove unnecessary usage of `*ExplicitReference` in protocol building process.

* [#363](https://github.com/finos/legend-studio/pull/363) [`bce6f04`](https://github.com/finos/legend-studio/commit/bce6f04d4f90bcf0e4f7980e412e45362a15a36e) ([@akphi](https://github.com/akphi)) - Allow double-click on property holder view label in diagram to edit property inline.

## 0.2.0

### Minor Changes

- [#357](https://github.com/finos/legend-studio/pull/357) [`7fc24dc`](https://github.com/finos/legend-studio/commit/7fc24dc5b9aaf9b350ed863bc51c4e76ffc270a9) ([@pierredebelen](https://github.com/pierredebelen)) - Add support for supertype navigation in the diagram

* [#361](https://github.com/finos/legend-studio/pull/361) [`e0acc32`](https://github.com/finos/legend-studio/commit/e0acc325457a7836b6d2ca82cbad025bed39ab86) ([@pierredebelen](https://github.com/pierredebelen)) - Add support for subtype navigation in the diagram
  Improve the layout for supertype classes
  Set an UUID for new ClassView so that they properly serialize to Text in Hacker mode

### Patch Changes

- [#360](https://github.com/finos/legend-studio/pull/360) [`e568574`](https://github.com/finos/legend-studio/commit/e568574339d61035c99df0f4f29669cda73819f0) ([@akphi](https://github.com/akphi)) - Made several improvements to diagram editor:

  - Add a separate mode for pan/zoom
  - Create new basic property hotkey is not `Alt + DownArrow`
  - Fix a bug where diagram editor hotkeys not being picked up if the user hasn't clicked on the diagram editor
  - Rework class view selection behavior: single clicking a class will no-longer show classview editor; double-clicking is required instead.

* [#320](https://github.com/finos/legend-studio/pull/320) [`1feb9ce`](https://github.com/finos/legend-studio/commit/1feb9cef1408cfe8a0a98a9e0390a1f1fb004a71) ([@kshradhan](https://github.com/kshradhan)) - Fix the bug where association mappings' source keys are omitted when building the graph (https://github.com/finos/legend-studio/issues/278).

- [#350](https://github.com/finos/legend-studio/pull/350) [`56a089d`](https://github.com/finos/legend-studio/commit/56a089dca25e24d890b52f0810e2ff3219ff46e8) ([@akphi](https://github.com/akphi)) - Allow configuring class view in diagram editor side panel.

* [#350](https://github.com/finos/legend-studio/pull/350) [`56a089d`](https://github.com/finos/legend-studio/commit/56a089dca25e24d890b52f0810e2ff3219ff46e8) ([@akphi](https://github.com/akphi)) - Make diagram editor hotkeys more systematic.

- [#347](https://github.com/finos/legend-studio/pull/347) [`5106c25`](https://github.com/finos/legend-studio/commit/5106c256f598dc960a084b4367fc9e1cf842f887) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add form checks in the operation class mapping editor. Inheritance operation mapping require no parameters. Additionally add manual test with operation class mapping.

* [#360](https://github.com/finos/legend-studio/pull/360) [`e568574`](https://github.com/finos/legend-studio/commit/e568574339d61035c99df0f4f29669cda73819f0) ([@akphi](https://github.com/akphi)) - Support renaming element (https://github.com/finos/legend-studio/issues/322). User can access this funtionality via the element context menu in the explorer tree. Diagram editor now also allows renaming classes.

- [#360](https://github.com/finos/legend-studio/pull/360) [`e568574`](https://github.com/finos/legend-studio/commit/e568574339d61035c99df0f4f29669cda73819f0) ([@akphi](https://github.com/akphi)) - Fix a bug where classes coming from immutable graphs (system, generation, dependencies) are automatically removed in diagrams (a regression introduced by [#351](https://github.com/finos/legend-studio/pull/351)).

* [#359](https://github.com/finos/legend-studio/pull/359) [`cd78be6`](https://github.com/finos/legend-studio/commit/cd78be6e6669b5253c12ea9a9ceacef908a1686c) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Enable query builder for generated and dependency elements.

- [#350](https://github.com/finos/legend-studio/pull/350) [`56a089d`](https://github.com/finos/legend-studio/commit/56a089dca25e24d890b52f0810e2ff3219ff46e8) ([@akphi](https://github.com/akphi)) - Rework how zooming works in diagram editor. Now, upon scrolling, zoom will use the pointer location as the zoom center rather than using the canvas center. Also, we allow user to be able to choose the zoom level or do a zoom to fit. Also, we now disallow negative zoom level and cap at the minimum level of 5%.

* [#351](https://github.com/finos/legend-studio/pull/351) [`7561184`](https://github.com/finos/legend-studio/commit/75611843191f31d35dac51267b25de4298f48f4b) ([@pierredebelen](https://github.com/pierredebelen)) - Fixes [#335](https://github.com/finos/legend-studio/issues/335). Ensure the diagram is updated if:

  - A Class is deleted
  - A property is removed from a Class
  - A supertype is removed from a Class

- [#360](https://github.com/finos/legend-studio/pull/360) [`e568574`](https://github.com/finos/legend-studio/commit/e568574339d61035c99df0f4f29669cda73819f0) ([@akphi](https://github.com/akphi)) - Fix a regression introduced by [#350](https://github.com/finos/legend-studio/pull/350) where DnD to add class and ejecting property position in diagram editor.

* [#362](https://github.com/finos/legend-studio/pull/362) [`8df01ce`](https://github.com/finos/legend-studio/commit/8df01ceb5d45aba42ab8541ae12d01e731b0c988) ([@pierredebelen](https://github.com/pierredebelen)) - Fix the inheritance view layout by ensuring the bounding rectangle is computed for the inital class

- [#341](https://github.com/finos/legend-studio/pull/341) [`b45e1ca`](https://github.com/finos/legend-studio/commit/b45e1ca06b7b3017972607c06c099bfa9fcd640f) ([@umarphaarook](https://github.com/umarphaarook)) - Enable query builder in viewer mode.

* [#349](https://github.com/finos/legend-studio/pull/349) [`0c37922`](https://github.com/finos/legend-studio/commit/0c37922f4b848725aca3b574e55f9236e6b883c3) ([@akphi](https://github.com/akphi)) - Rework diagram editor layout and state management. Allow user to edit property in-place (see [#300](https://github.com/finos/legend-studio/issues/300)).

## 0.1.18

### Patch Changes

- [#346](https://github.com/finos/legend-studio/pull/346) [`d545580`](https://github.com/finos/legend-studio/commit/d5455804b7895947dc167834c87300267e1cdde0) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add text support for `INHERITANCE` operation class mapping.

* [#290](https://github.com/finos/legend-studio/pull/290) [`cb0ff2b`](https://github.com/finos/legend-studio/commit/cb0ff2b7aecfaf2a89d4ddc98e04854c25624ce8) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add database builder in the relational connection editor to support generating a database from a connection specification.

- [#340](https://github.com/finos/legend-studio/pull/340) [`c2d3afd`](https://github.com/finos/legend-studio/commit/c2d3afd32fad0a680169443056155235adfc96cb) ([@akphi](https://github.com/akphi)) - Improve diagram editor modelling capabilities (related to [#300](https://github.com/finos/legend-studio/issues/300)). In diagram editor, users now have can see all supported hotkeys and have the tools to create new classes, properties, inheritance relationships, etc. All of this is made possible thanks to the core diagram renderer `auto-healing` improvements made in [#338](https://github.com/finos/legend-studio/pull/338).

- [#336](https://github.com/finos/legend-studio/pull/336) [`acd7d99`](https://github.com/finos/legend-studio/commit/acd7d99c844161d16dd8e64d828d2361de06815d) ([@epsstan](https://github.com/epsstan)) - Add support for `BigQuery` connection.

## 0.1.17

### Patch Changes

- [#332](https://github.com/finos/legend-studio/pull/332) [`375a5e3`](https://github.com/finos/legend-studio/commit/375a5e3479e865baf4dffb6d77cf4c7cf3de7ba2) ([@akphi](https://github.com/akphi)) - Fix a bug where `relational mapping` source tree does not display root nodes correctly (only the last column is shown) due to faulty node ID generator.

* [#312](https://github.com/finos/legend-studio/pull/312) [`65966ef`](https://github.com/finos/legend-studio/commit/65966ef8e6fa8152fcc5c39501fda9c62646aecc) ([@umarphaarook](https://github.com/umarphaarook)) - Allow users to use text-mode while viewing project in read-only mode.

## 0.1.16

## 0.1.15

### Patch Changes

- [#311](https://github.com/finos/legend-studio/pull/311) [`49b407f`](https://github.com/finos/legend-studio/commit/49b407fafe3f4eac3a012d1815167c40a8914cdc) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Function expression builder will no-longer support building any function unless their expression builders are specified in plugins. This is adjusted to match the behavior of function handler in engine. _Also, by design, core Studio should not handle function matching at all._

* [#293](https://github.com/finos/legend-studio/pull/293) [`7aaa969`](https://github.com/finos/legend-studio/commit/7aaa969a1f2eba8a3f20cddb89455b3087907502) ([@akphi](https://github.com/akphi)) - Avoid printing out Javascript class name as these will get obfuscated and modified due to minification in production build. As such, unsupported operation error messages are resructured to print out the unsupported objects instead of their classes' names.

- [#313](https://github.com/finos/legend-studio/pull/313) [`547089b`](https://github.com/finos/legend-studio/commit/547089b71ec534be6d2362369748d08d63cd8243) ([@hardikmaheshwari](https://github.com/hardikmaheshwari)) - Add support for configuring Snowflake datasource specification `quotedIdentifiersIgnoreCase` flag in form mode.

* [#293](https://github.com/finos/legend-studio/pull/293) [`7aaa969`](https://github.com/finos/legend-studio/commit/7aaa969a1f2eba8a3f20cddb89455b3087907502) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE** Element builder for DSL now requires `elementClassName` to better print error message when loading plugins.

- [#314](https://github.com/finos/legend-studio/pull/314) [`88795fc`](https://github.com/finos/legend-studio/commit/88795fc5a36eea288b2b7ca8a659eec938aff31a) ([@akphi](https://github.com/akphi)) - Allow DnD from project explorer panel to grammar text editor to quickly add the path of the element.

## 0.1.14

### Patch Changes

- [#286](https://github.com/finos/legend-studio/pull/286) [`f08d984`](https://github.com/finos/legend-studio/commit/f08d9845ace8dbbd54a8ab228ceb23b3bca1aca3) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Include all runtimes and mappings in execution input to support connections referencing other mappings such as ModelChainConnections.

* [#255](https://github.com/finos/legend-studio/pull/255) [`713405b`](https://github.com/finos/legend-studio/commit/713405bdbcbdbb4247d6885fd2d843a30d26d693) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Remove `GraphFreezer` as we now can rely on hashing to detect unexpected changes to immutable objects. As a result, the config flag `DEV__enableGraphImmutabilityRuntimeCheck` will be removed as well.

- [#255](https://github.com/finos/legend-studio/pull/255) [`713405b`](https://github.com/finos/legend-studio/commit/713405bdbcbdbb4247d6885fd2d843a30d26d693) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Simplify element hash computation: now, the the computation should be placed in `_elementHashCode`, `hashCode` is specified at `PackageableElement` level that does some logical check for disposed and frozen objects before returning `_elementHashCode`. This way, we don't need to repeat as much code when introducing newer types of `PackageableElement` and we would output error when frozen elements are modified somehow.

* [#255](https://github.com/finos/legend-studio/pull/255) [`713405b`](https://github.com/finos/legend-studio/commit/713405bdbcbdbb4247d6885fd2d843a30d26d693) ([@akphi](https://github.com/akphi)) - Fix a bug where relational mapping editor _swallows_ embedded property mapping (https://github.com/finos/legend-studio/issues/285).

## 0.1.13

### Patch Changes

- [#252](https://github.com/finos/legend-studio/pull/252) [`cdc4c3c`](https://github.com/finos/legend-studio/commit/cdc4c3c92f9cc66a1304666429a721731c8466b0) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** `V1_GraphTransformerContextBuilder` now requires `PureProtocolProcessorPlugin` in the constructor instead of the `keepSourceInformation` boolean flag.

* [#244](https://github.com/finos/legend-studio/pull/244) [`ab15166`](https://github.com/finos/legend-studio/commit/ab15166f9f60a51d48e2c02b45a937f1dcb8f642) ([@akphi](https://github.com/akphi)) - Remove config flag `TEMPORARY__disableNonModelStoreSupports`.

- [#252](https://github.com/finos/legend-studio/pull/252) [`cdc4c3c`](https://github.com/finos/legend-studio/commit/cdc4c3c92f9cc66a1304666429a721731c8466b0) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Add context to transformers in `PureProtocolProcessorPlugin`.

* [#241](https://github.com/finos/legend-studio/pull/241) [`76092dd`](https://github.com/finos/legend-studio/commit/76092dd5f6a31a30e18ca6e711c0f0f5a9e195ef) ([@akphi](https://github.com/akphi)) - Rework mapping editor: mapping execution builder and test editor have been moved from the auxiliary panel to the screen of the mapping editor.

- [#244](https://github.com/finos/legend-studio/pull/244) [`ab15166`](https://github.com/finos/legend-studio/commit/ab15166f9f60a51d48e2c02b45a937f1dcb8f642) ([@akphi](https://github.com/akphi)) - Support `HackedClass` and `HackedUnit` which is used to support `@` syntax in PURE grammar.

* [#248](https://github.com/finos/legend-studio/pull/248) [`a35e4d2`](https://github.com/finos/legend-studio/commit/a35e4d229e113c491ef51f9ad126ead98979a32f) ([@akphi](https://github.com/akphi)) - Fix a bug that prevents graph freezer to work properly with relational property mapping (related to the changes in #207).

- [#248](https://github.com/finos/legend-studio/pull/248) [`a35e4d2`](https://github.com/finos/legend-studio/commit/a35e4d229e113c491ef51f9ad126ead98979a32f) ([@akphi](https://github.com/akphi)) - Introduce plan execution processor (#249).

## 0.1.12

### Patch Changes

- [#237](https://github.com/finos/legend-studio/pull/237) [`f66159e`](https://github.com/finos/legend-studio/commit/f66159e21a66b1224061ac3da2f7ac3e3050e341) ([@akphi](https://github.com/akphi)) - Fix a bug where model loader fail to show current graph in Pure model context data format.

* [#239](https://github.com/finos/legend-studio/pull/239) [`21e2a3f`](https://github.com/finos/legend-studio/commit/21e2a3fb4c1b950c492d17178a5f7380fd52dc66) ([@akphi](https://github.com/akphi)) - Support `PackageableElementPtr` in response to [change in engine](https://github.com/finos/legend-engine/pull/255).

- [#237](https://github.com/finos/legend-studio/pull/237) [`f66159e`](https://github.com/finos/legend-studio/commit/f66159e21a66b1224061ac3da2f7ac3e3050e341) ([@akphi](https://github.com/akphi)) - Make sure to prune source information from lambdas and relational operations before syncing workspace.

## 0.1.11

### Patch Changes

- [#227](https://github.com/finos/legend-studio/pull/227) [`df3f3b6`](https://github.com/finos/legend-studio/commit/df3f3b67aed33ad510711694e3a3f299927626a8) ([@akphi](https://github.com/akphi)) - Show all class mapping ID corresponding to the class of class properties in relational mapping editor. This would allow users to specify one property mapping per class mapping.

* [#227](https://github.com/finos/legend-studio/pull/227) [`df3f3b6`](https://github.com/finos/legend-studio/commit/df3f3b67aed33ad510711694e3a3f299927626a8) ([@akphi](https://github.com/akphi)) - Fix a bug where global compile (using F9) does not clear the compilation of each lambda editor.

- [#227](https://github.com/finos/legend-studio/pull/227) [`df3f3b6`](https://github.com/finos/legend-studio/commit/df3f3b67aed33ad510711694e3a3f299927626a8) ([@akphi](https://github.com/akphi)) - Fix a bug where compilation hotkey (F9) does not work when the focus is in lambda editor.

## 0.1.10

### Patch Changes

- [#224](https://github.com/finos/legend-studio/pull/224) [`de511da`](https://github.com/finos/legend-studio/commit/de511daf935680ce1a61a2eb85d445c2d3c5dcba) ([@hardikmaheshwari](https://github.com/hardikmaheshwari)) - Added quotedIdentifiersIgnoreCaseFlag in snowflakeDatasourceSpecification.

* [#225](https://github.com/finos/legend-studio/pull/225) [`8159c1f`](https://github.com/finos/legend-studio/commit/8159c1f02eafcd52fbbb3add7358afc718cf03d2) ([@akphi](https://github.com/akphi)) - Add support for relational mapping test.

## 0.1.9

### Patch Changes

- [#214](https://github.com/finos/legend-studio/pull/214) [`c90cfc6`](https://github.com/finos/legend-studio/commit/c90cfc6c1a1a69d97fba5336d0c1b7f9e0b63221) ([@akphi](https://github.com/akphi)) - Rework mapping execution panel to make its behavior more consistent across different types of mappings (related to #202 and #204).

* [#223](https://github.com/finos/legend-studio/pull/223) [`16696ae`](https://github.com/finos/legend-studio/commit/16696ae2513806e8128cff6a4d50c364601f0275) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Fix extension that selects additional elements for execution input from `V1_getExtraExecutionInputElements` to the function `V1_getExtraExecutionInputGetters`. This allows the extensions to be used by the plugins by implementing the function.

- [#214](https://github.com/finos/legend-studio/pull/214) [`c90cfc6`](https://github.com/finos/legend-studio/commit/c90cfc6c1a1a69d97fba5336d0c1b7f9e0b63221) ([@akphi](https://github.com/akphi)) - Fix a bug with mapping editor not properly pruning stubbed property mapping, causing compilation to fail.

## 0.1.8

### Patch Changes

- [#218](https://github.com/finos/legend-studio/pull/218) [`0bd1fd9`](https://github.com/finos/legend-studio/commit/0bd1fd96f9f4db85700df2cdf99fd6bc3bc0c524) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add `V1_getExtraExecutionInputElements` to send additional elements as part of query execution call.

## 0.1.7

### Patch Changes

- [#216](https://github.com/finos/legend-studio/pull/216) [`5c35ef1`](https://github.com/finos/legend-studio/commit/5c35ef132a1cf60a5a067895e68b54f4cb363c3a) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Use meta::legend::service::metamodel::Service for service classifierPath.

## 0.1.6

### Patch Changes

- [#211](https://github.com/finos/legend-studio/pull/211) [`86cd535`](https://github.com/finos/legend-studio/commit/86cd535e1df97f722bcd69270e84d82a6d1ff6e1) ([@akphi](https://github.com/akphi)) - Do a non-throwing processing of relational property mapping operation to make sure that paths resolved and that we can infer the main table properly.

* [#211](https://github.com/finos/legend-studio/pull/211) [`86cd535`](https://github.com/finos/legend-studio/commit/86cd535e1df97f722bcd69270e84d82a6d1ff6e1) ([@akphi](https://github.com/akphi)) - Support creating embedded relational database connection in runtime editor.

- [#211](https://github.com/finos/legend-studio/pull/211) [`86cd535`](https://github.com/finos/legend-studio/commit/86cd535e1df97f722bcd69270e84d82a6d1ff6e1) ([@akphi](https://github.com/akphi)) - Support selecting database table/view as class mapping source.

## 0.1.5

### Patch Changes

- [#207](https://github.com/finos/legend-studio/pull/207) [`6be621e`](https://github.com/finos/legend-studio/commit/6be621eb840ae2200ce791641475ee882dcbf33a) ([@akphi](https://github.com/akphi)) - Properly encode URI for query params and search params in API calls.

* [#207](https://github.com/finos/legend-studio/pull/207) [`6be621e`](https://github.com/finos/legend-studio/commit/6be621eb840ae2200ce791641475ee882dcbf33a) ([@akphi](https://github.com/akphi)) - Allow user to copy link to open element in project viewer mode via context-menu.

- [#210](https://github.com/finos/legend-studio/pull/210) [`b358e7f`](https://github.com/finos/legend-studio/commit/b358e7f212d90467b6536331b450f7234a970516) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Fix a problem with `getDependencyEntities` API url.

* [#207](https://github.com/finos/legend-studio/pull/207) [`6be621e`](https://github.com/finos/legend-studio/commit/6be621eb840ae2200ce791641475ee882dcbf33a) ([@akphi](https://github.com/akphi)) - Add a simple relational mapping editor with support for DnD from table source panel.

## 0.1.4

### Patch Changes

- [#203](https://github.com/finos/legend-studio/pull/203) [`0d8c766`](https://github.com/finos/legend-studio/commit/0d8c7660f3a70d75e7d6d5265bf894ddb7088d02) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Studio now leverages the metadata server to fetch dependency entities. This helps to simplify our logic in handling project dependency.

* [#205](https://github.com/finos/legend-studio/pull/205) [`e6b0425`](https://github.com/finos/legend-studio/commit/e6b04259c33ee8563391fd6833cd337b83b77d44) ([@hardikmaheshwari](https://github.com/hardikmaheshwari)) - Fix rootRelationalClassMapping compilation to include filter.

## 0.1.3

### Patch Changes

- [#199](https://github.com/finos/legend-studio/pull/199) [`2aab88e`](https://github.com/finos/legend-studio/commit/2aab88e797eec37760a646f7c6ee9d9f612d31cc) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Use meta::alloy::service::metamodel::Service for service classifierPath.

* [#200](https://github.com/finos/legend-studio/pull/200) [`20b4e8f`](https://github.com/finos/legend-studio/commit/20b4e8f21d4c4abc1fd8ef06e826b9b8df883bc5) ([@akphi](https://github.com/akphi)) - Improve the UX when users launch the editor with either not-found project or workspace. In particular, if the workspace is not found, we give them the option to create the workspace to start making changes or just view the project without the need to create any workspace. This will help with the case where users share URLs to a particular project/workspace; before, they are redirected back to the setup page with no clear message, which is _very confusing_.

## 0.1.2

### Patch Changes

- [#181](https://github.com/finos/legend-studio/pull/181) [`1deb5ab`](https://github.com/finos/legend-studio/commit/1deb5ab5b398c5da55bc482695457804f8407be8) ([@hardikmaheshwari](https://github.com/hardikmaheshwari)) - Add `quoteIdentifiers` support to database connection.

* [#190](https://github.com/finos/legend-studio/pull/190) [`c4ef316`](https://github.com/finos/legend-studio/commit/c4ef3165b7d344e771e1bb741ddc48ed5786cb04) ([@kshradhan](https://github.com/kshradhan)) - Fix a bug in association editor where it crashes when users attempt to modify the property type(s) of a newly created association.

- [#189](https://github.com/finos/legend-studio/pull/189) [`cf36a42`](https://github.com/finos/legend-studio/commit/cf36a42f658ac8bbab9a054010948b29707255d0) ([@akphi](https://github.com/akphi)) - Modify Pure protocol, (de)serialization, and hash computation of relational mapping to match with what grammar parser in engine yields.

* [#193](https://github.com/finos/legend-studio/pull/193) [`38a25d3`](https://github.com/finos/legend-studio/commit/38a25d3973ae771097ebfc169a21e021c24a4179) ([@hardikmaheshwari](https://github.com/hardikmaheshwari)) - Check for joins in included databases.

- [#187](https://github.com/finos/legend-studio/pull/187) [`cbccdc0`](https://github.com/finos/legend-studio/commit/cbccdc0fcb81cf873d50a9d41b04054a6efbf5fd) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Use `meta::legend::service::metamodel::Service` for service classifierPath.

* [#194](https://github.com/finos/legend-studio/pull/194) [`80bd86a`](https://github.com/finos/legend-studio/commit/80bd86a5add9011f1ce7df33d700a1c1f28d5e08) ([@akphi](https://github.com/akphi)) - Use ES module (ESM) throughout the codebase.

- [#183](https://github.com/finos/legend-studio/pull/183) [`1ace102`](https://github.com/finos/legend-studio/commit/1ace102d50364645ec5d9efdbde2d4ca778f0544) ([@akphi](https://github.com/akphi)) - Add support for Snowflake Public authentication strategy.

## 0.1.1

## 0.1.0

### Minor Changes

- [#173](https://github.com/finos/legend-studio/pull/173) [`7709ab3`](https://github.com/finos/legend-studio/commit/7709ab3b2a3e66a5d44864e1ce694e696dddba69) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - A RawLambda resolver is added to resolve element paths inside lambdas that leverage imports. This allow successful compilation of graph that contain lambdas using imports.

* [#171](https://github.com/finos/legend-studio/pull/171) [`2d1f8a7`](https://github.com/finos/legend-studio/commit/2d1f8a78c38121e96b745939b23ba5cc46c7a53c) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE** Studio router is reorganized to be more consistent and to accomondate more use cases.

  - All routes now are to be prefixed with the SDLC server key, if there is only one SDLC server specified in the config file (with legacy SDLC field config form: `sdlc: { url: string }`), then the server key is `-`, i.e. `/studio/-/...`, else the server key is the key to the SDLC instance, i.e. `/studio/sdlc1/...`
  - If the server key specified in the URL is not recognised, the user will be redirected to the setup page if there is only one SDLC server in the config or the SDLC server configuration page if there are multiple SDLC servers in the config.
  - Some basic routes are now renamed to be more consistent with others: e.g. setup page route is `/studio/-/setup/...`, editor page route is `/studio/-/edit/...`, and viewer page route is `/studio/-/view/...`

### Patch Changes

- [#172](https://github.com/finos/legend-studio/pull/172) [`e9c97c4`](https://github.com/finos/legend-studio/commit/e9c97c41b18d79d2676e48e12ae4e92d528b1819) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Fetch project versions in view mode, enabling features such as service registration in view mode.

## 0.0.17

### Patch Changes

- [#163](https://github.com/finos/legend-studio/pull/163) [`7db0623`](https://github.com/finos/legend-studio/commit/7db0623da87c55256d440744e41bd1e2f8327e08) ([@hardikmaheshwari](https://github.com/hardikmaheshwari)) - fix change detection for self-join definition

## 0.0.16

### Patch Changes

- [#158](https://github.com/finos/legend-studio/pull/158) [`5f28d8e`](https://github.com/finos/legend-studio/commit/5f28d8e653993369efb41ff91e4f7d6b7fcd76e0) ([@emilia-sokol-gs](https://github.com/emilia-sokol-gs)) - Fix setting source for PurePropertyMapping

* [#156](https://github.com/finos/legend-studio/pull/156) [`2aa9425`](https://github.com/finos/legend-studio/commit/2aa942562310702003da859d1222612fcac38a19) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - fix authentication typo

## 0.0.15

### Patch Changes

- [#153](https://github.com/finos/legend-studio/pull/153) [`09634da`](https://github.com/finos/legend-studio/commit/09634da8795744557c097725a42089384d0bafaa) ([@hardikmaheshwari](https://github.com/hardikmaheshwari)) - fix studio change detection for self-join

## 0.0.14

### Patch Changes

- [#150](https://github.com/finos/legend-studio/pull/150) [`58433f5`](https://github.com/finos/legend-studio/commit/58433f5e9f65571a6ca57da60dfb264fb7ef051a) ([@emilia-sokol-gs](https://github.com/emilia-sokol-gs)) - Add support for aggregartion aware mapping in studio. Done by adding missing implementation e.g. in V1_ProtocolToMetaModel visitor for class mapping and property mapping. Added roundtrip test to test flow.

## 0.0.13

### Patch Changes

- [#147](https://github.com/finos/legend-studio/pull/147) [`c1e3047`](https://github.com/finos/legend-studio/commit/c1e3047300b1be93c27059b8bf570a76698c5970) ([@akphi](https://github.com/akphi)) - Allow configuring SDLC server when multiple SDLC servers are available in Studio config file.

## 0.0.12

### Patch Changes

- [#144](https://github.com/finos/legend-studio/pull/144) [`288523d`](https://github.com/finos/legend-studio/commit/288523ddf3d37b146f6229189b7174f9e4bd6da8) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Initialize engine in review and viewer store

## 0.0.11

### Patch Changes

- [#140](https://github.com/finos/legend-studio/pull/140) [`3b5fb01`](https://github.com/finos/legend-studio/commit/3b5fb01dce4ffa2081c016369f6b8ee715fb5245) ([@akphi](https://github.com/akphi)) - Make sure expected test result JSON for mapping test does not store with formatting to not break text mode.

* [#140](https://github.com/finos/legend-studio/pull/140) [`3b5fb01`](https://github.com/finos/legend-studio/commit/3b5fb01dce4ffa2081c016369f6b8ee715fb5245) ([@akphi](https://github.com/akphi)) - Make JSON property field sort consistent with Java Jackson

## 0.0.10

### Patch Changes

- [#134](https://github.com/finos/legend-studio/pull/134) [`c3b31f7`](https://github.com/finos/legend-studio/commit/c3b31f7d385ada299be92b3716d6a2a64c179eed) ([@aziemchawdhary-gs](https://github.com/aziemchawdhary-gs)) - Ensure that test data is stored with no formatting

## 0.0.9

## 0.0.8

### Patch Changes

- [#124](https://github.com/finos/legend-studio/pull/124) [`2ea6867`](https://github.com/finos/legend-studio/commit/2ea6867695a0a00e02b08eadd5ec7db3d384ec6f) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Change label for enum options in file generation editor: for element-path-like values we will show only the element name.

* [#123](https://github.com/finos/legend-studio/pull/123) [`2a2acce`](https://github.com/finos/legend-studio/commit/2a2acced59e9dea97706dd6dcb25332862231f40) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add support for cross store (xStore) association mapping in studio. Done by adding a new type of AssociationImplementation called 'XStoreAssociationImplementation' and a new type of PropertyMapping called 'XStorePropertyMapping'. Add roundtrip tests to test flow.

- [#114](https://github.com/finos/legend-studio/pull/114) [`e01d74f`](https://github.com/finos/legend-studio/commit/e01d74fac0a0befd01621c285244cf5732bb3a39) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Change schemaMapper to schema in tableNameMapper to be align with protocol

## 0.0.7

### Patch Changes

- [#108](https://github.com/finos/legend-studio/pull/108) [`35119b3`](https://github.com/finos/legend-studio/commit/35119b3421f949da32be5884ace73ab94b010a54) ([@akphi](https://github.com/akphi)) - Move @types/\* dependencies from devDependencies in order to ensure NPM consumers properly install these typings.

## 0.0.6

### Patch Changes

- [#106](https://github.com/finos/legend-studio/pull/106) [`ce630c7`](https://github.com/finos/legend-studio/commit/ce630c7c13b7b52a67d14189d42400cabfd13868) ([@akphi](https://github.com/akphi)) - Fix dev-utils for Webpack and Jest to make consumer projects work with published packages from NPM.

## 0.0.5

### Patch Changes

- [#104](https://github.com/finos/legend-studio/pull/104) [`10e8f9f`](https://github.com/finos/legend-studio/commit/10e8f9f714d9376600ae8c4260405573372a24b4) ([@akphi](https://github.com/akphi)) - Add `@testing-library/react` as dependencies for `@finos/legend-studio`

## 0.0.4

## 0.0.3

## 0.0.2

## 0.0.1

### Patch Changes

- [`050b4ba`](https://github.com/finos/legend-studio/commit/050b4ba205d63abbc0c92d01e7538817c2ad4e42) [#50](https://github.com/finos/legend-studio/pull/50) ([@aziemchawdhary-gs](https://github.com/aziemchawdhary-gs)) - Minify test data when creating JSON model connection data URL for test to reduce traffic load.

* [`b030ce6`](https://github.com/finos/legend-studio/commit/b030ce6d789bd564709c9d0d8d88e41fc7d3060a) [#73](https://github.com/finos/legend-studio/pull/73) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Scanned extra authenication strategy builders when building authenication strategy in relational connection.

- [`9fc7d5c`](https://github.com/finos/legend-studio/commit/9fc7d5c26ddb441b2c6d1f9759132cb7d33f0c8d) [#59](https://github.com/finos/legend-studio/pull/59) ([@akphi](https://github.com/akphi)) - Change V1 engine client to not prefix the urls with `/api`, that should be moved to the config.

* [`68d35b5`](https://github.com/finos/legend-studio/commit/68d35b5a03797dabc7ef3315952cc38d0b55ad25) [#72](https://github.com/finos/legend-studio/pull/72) ([@akphi](https://github.com/akphi)) - Change how `setupEngine()` is being called: now, it initializes the engine instance of graph manager instead of just configuring it.

- [`68d35b5`](https://github.com/finos/legend-studio/commit/68d35b5a03797dabc7ef3315952cc38d0b55ad25) [#72](https://github.com/finos/legend-studio/pull/72) ([@akphi](https://github.com/akphi)) - Use a workaround when handling JSON test data and expected result to not break grammar in text mode (see [#68](https://github.com/finos/legend-studio/issues/68)).
