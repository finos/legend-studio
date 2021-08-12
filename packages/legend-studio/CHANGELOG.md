# @finos/legend-studio

## 0.2.10

## 0.2.9

### Patch Changes

- [#400](https://github.com/finos/legend-studio/pull/400) [`8303f1b`](https://github.com/finos/legend-studio/commit/8303f1bdfed2d46bd0425b45d727a9b203cec229) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! -

- Updated dependencies [[`3175301`](https://github.com/finos/legend-studio/commit/3175301a3919d25557a2d975df75f95886d11a53)]:
  - @finos/legend-studio-shared@0.0.26
  - @finos/legend-studio-components@0.0.30
  - @finos/legend-studio-network@0.0.28

## 0.2.8

### Patch Changes

- Updated dependencies []:
  - @finos/legend-studio-components@0.0.29
  - @finos/legend-studio-network@0.0.27
  - @finos/legend-studio-shared@0.0.25

## 0.2.7

### Patch Changes

- [#390](https://github.com/finos/legend-studio/pull/390) [`bbba2e3`](https://github.com/finos/legend-studio/commit/bbba2e34487c32a4bd41033d485fc8dbf22d32fb) Thanks [@akphi](https://github.com/akphi)! - Genericize `LambdaEditor` so it nolonger depends on `EditorStore` and can be used between different Legend applications.

- Updated dependencies [[`bbba2e3`](https://github.com/finos/legend-studio/commit/bbba2e34487c32a4bd41033d485fc8dbf22d32fb), [`bbba2e3`](https://github.com/finos/legend-studio/commit/bbba2e34487c32a4bd41033d485fc8dbf22d32fb)]:
  - @finos/legend-studio-components@0.0.29
  - @finos/legend-studio-network@0.0.27
  - @finos/legend-studio-shared@0.0.25

## 0.2.6

### Patch Changes

- [#383](https://github.com/finos/legend-studio/pull/383) [`19274f5`](https://github.com/finos/legend-studio/commit/19274f50c5bcb7aec5e2a94c35be3c74f5b3c5e1) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Add processing support for filters in database views.

## 0.2.5

### Patch Changes

- [#384](https://github.com/finos/legend-studio/pull/384) [`56481ff`](https://github.com/finos/legend-studio/commit/56481ffa9efceff47cfb11e3bb9a11103e6c17cc) Thanks [@kshradhan](https://github.com/kshradhan)! - Pre-format function body grammar text in function editor.

* [#388](https://github.com/finos/legend-studio/pull/388) [`6815fcf`](https://github.com/finos/legend-studio/commit/6815fcfba58d0123dbed0e188224eeeda35d4ea9) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Fix service test parameters property name to `parametersValues`.

- [#392](https://github.com/finos/legend-studio/pull/392) [`fece600`](https://github.com/finos/legend-studio/commit/fece600d582fd4bb8185d31235d60c2d1d2e46b8) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Remove editor for review description and add default description.

* [#385](https://github.com/finos/legend-studio/pull/385) [`13fe9da`](https://github.com/finos/legend-studio/commit/13fe9dace3aa5aa54a936710e32a46a35a4971c3) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Change `HACKY_createServiceTestAssertLambda` to assert equality on json strings to avoid failure on white spaces and extra lines.

- [#391](https://github.com/finos/legend-studio/pull/391) [`f01f274`](https://github.com/finos/legend-studio/commit/f01f2741c7df7528dec8593bfb87692497b5f56b) Thanks [@akphi](https://github.com/akphi)! - Allow specifying description when creating a new review.

## 0.2.4

### Patch Changes

- [#374](https://github.com/finos/legend-studio/pull/374) [`f0dd419`](https://github.com/finos/legend-studio/commit/f0dd4192cdb032579faebf833f78c06020055b28) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Clean up execution plan state and add execution plan viewer to service and execution mapping tab.

* [#378](https://github.com/finos/legend-studio/pull/378) [`25e8287`](https://github.com/finos/legend-studio/commit/25e8287c67375fc6d824aee679396e704c7f060f) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Fix handling of raw instance type in milestoning's infinity date.

## 0.2.3

### Patch Changes

- [#364](https://github.com/finos/legend-studio/pull/364) [`73e5fa2`](https://github.com/finos/legend-studio/commit/73e5fa241ccc3b7464bb7c767316f37cd1c08a6e) Thanks [@varunmaddipati](https://github.com/varunmaddipati)! - Add support for `Redshift` connection.

* [#355](https://github.com/finos/legend-studio/pull/355) [`0f1c685`](https://github.com/finos/legend-studio/commit/0f1c6858b08e32447fc3bfef4a9043f0fe30a523) Thanks [@akphi](https://github.com/akphi)! - Refactor codebase to use new syntax for `Mobx` `flow` and `flowResult` (related to https://github.com/finos/legend-studio/issues/83).

  **BREAKING CHANGE:** A fair amount of core methods are now nolonger returning `Promise<...>`, but instead `GeneratorFn<...>` due to the new `flow` syntax. This does not affect the functionality, just the syntax.

- [#355](https://github.com/finos/legend-studio/pull/355) [`0f1c685`](https://github.com/finos/legend-studio/commit/0f1c6858b08e32447fc3bfef4a9043f0fe30a523) Thanks [@akphi](https://github.com/akphi)! - Refactor graphs to use `ActionState` (See https://github.com/finos/legend-studio/issues/283).

* [#355](https://github.com/finos/legend-studio/pull/355) [`0f1c685`](https://github.com/finos/legend-studio/commit/0f1c6858b08e32447fc3bfef4a9043f0fe30a523) Thanks [@akphi](https://github.com/akphi)! - **BREAKING CHANGE:** Renamed application class `Studio` to `LegendStudio`.

- [#368](https://github.com/finos/legend-studio/pull/368) [`f7c181d`](https://github.com/finos/legend-studio/commit/f7c181dbc779e896726be7af535006f50c082345) Thanks [@nayanika2](https://github.com/nayanika2)! - Execution plan viewer MVP (See https://github.com/finos/legend-studio/issues/289).

* [#355](https://github.com/finos/legend-studio/pull/355) [`0f1c685`](https://github.com/finos/legend-studio/commit/0f1c6858b08e32447fc3bfef4a9043f0fe30a523) Thanks [@akphi](https://github.com/akphi)! - Refactor tests to use a shared method for building simple graph for testing.

* Updated dependencies [[`0f1c685`](https://github.com/finos/legend-studio/commit/0f1c6858b08e32447fc3bfef4a9043f0fe30a523), [`0f1c685`](https://github.com/finos/legend-studio/commit/0f1c6858b08e32447fc3bfef4a9043f0fe30a523)]:
  - @finos/legend-studio-components@0.0.28
  - @finos/legend-studio-shared@0.0.24
  - @finos/legend-studio-network@0.0.26

## 0.2.2

### Patch Changes

- Updated dependencies [[`7f9fbbe`](https://github.com/finos/legend-studio/commit/7f9fbbe72dee6cb8fd2c9a7d128cc117ce8ba5eb)]:
  - @finos/legend-studio-components@0.0.27
  - @finos/legend-studio-network@0.0.25
  - @finos/legend-studio-shared@0.0.23

## 0.2.1

### Patch Changes

- [#363](https://github.com/finos/legend-studio/pull/363) [`bce6f04`](https://github.com/finos/legend-studio/commit/bce6f04d4f90bcf0e4f7980e412e45362a15a36e) Thanks [@akphi](https://github.com/akphi)! - **BREAKING CHANGE:** Rename methods in `BasicModel`: add `own` to methods name to avoid confusion on when consumers are interacting with elements from the whole graph (in `PureModel`) or elements just from the graph itself.

* [#363](https://github.com/finos/legend-studio/pull/363) [`bce6f04`](https://github.com/finos/legend-studio/commit/bce6f04d4f90bcf0e4f7980e412e45362a15a36e) Thanks [@akphi](https://github.com/akphi)! - Support filtering system elements from selection dropdown to make forms more user-friendly (see https://github.com/finos/legend-studio/issues/280).

- [#363](https://github.com/finos/legend-studio/pull/363) [`bce6f04`](https://github.com/finos/legend-studio/commit/bce6f04d4f90bcf0e4f7980e412e45362a15a36e) Thanks [@akphi](https://github.com/akphi)! - Remove unnecessary usage of `*ExplicitReference` in protocol building process.

* [#363](https://github.com/finos/legend-studio/pull/363) [`bce6f04`](https://github.com/finos/legend-studio/commit/bce6f04d4f90bcf0e4f7980e412e45362a15a36e) Thanks [@akphi](https://github.com/akphi)! - Allow double-click on property holder view label in diagram to edit property inline.

* Updated dependencies [[`bce6f04`](https://github.com/finos/legend-studio/commit/bce6f04d4f90bcf0e4f7980e412e45362a15a36e), [`bce6f04`](https://github.com/finos/legend-studio/commit/bce6f04d4f90bcf0e4f7980e412e45362a15a36e)]:
  - @finos/legend-studio-components@0.0.26
  - @finos/legend-studio-network@0.0.24
  - @finos/legend-studio-shared@0.0.22

## 0.2.0

### Minor Changes

- [#357](https://github.com/finos/legend-studio/pull/357) [`7fc24dc`](https://github.com/finos/legend-studio/commit/7fc24dc5b9aaf9b350ed863bc51c4e76ffc270a9) Thanks [@pierredebelen](https://github.com/pierredebelen)! - Add support for supertype navigation in the diagram

* [#361](https://github.com/finos/legend-studio/pull/361) [`e0acc32`](https://github.com/finos/legend-studio/commit/e0acc325457a7836b6d2ca82cbad025bed39ab86) Thanks [@pierredebelen](https://github.com/pierredebelen)! - Add support for subtype navigation in the diagram
  Improve the layout for supertype classes
  Set an UUID for new ClassView so that they properly serialize to Text in Hacker mode

### Patch Changes

- [#360](https://github.com/finos/legend-studio/pull/360) [`e568574`](https://github.com/finos/legend-studio/commit/e568574339d61035c99df0f4f29669cda73819f0) Thanks [@akphi](https://github.com/akphi)! - Made several improvements to diagram editor:

  - Add a separate mode for pan/zoom
  - Create new basic property hotkey is not `Alt + DownArrow`
  - Fix a bug where diagram editor hotkeys not being picked up if the user hasn't clicked on the diagram editor
  - Rework class view selection behavior: single clicking a class will no-longer show classview editor; double-clicking is required instead.

* [#320](https://github.com/finos/legend-studio/pull/320) [`1feb9ce`](https://github.com/finos/legend-studio/commit/1feb9cef1408cfe8a0a98a9e0390a1f1fb004a71) Thanks [@kshradhan](https://github.com/kshradhan)! - Fix the bug where association mappings' source keys are omitted when building the graph (https://github.com/finos/legend-studio/issues/278).

- [#350](https://github.com/finos/legend-studio/pull/350) [`56a089d`](https://github.com/finos/legend-studio/commit/56a089dca25e24d890b52f0810e2ff3219ff46e8) Thanks [@akphi](https://github.com/akphi)! - Allow configuring class view in diagram editor side panel.

* [#350](https://github.com/finos/legend-studio/pull/350) [`56a089d`](https://github.com/finos/legend-studio/commit/56a089dca25e24d890b52f0810e2ff3219ff46e8) Thanks [@akphi](https://github.com/akphi)! - Make diagram editor hotkeys more systematic.

- [#347](https://github.com/finos/legend-studio/pull/347) [`5106c25`](https://github.com/finos/legend-studio/commit/5106c256f598dc960a084b4367fc9e1cf842f887) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Add form checks in the operation class mapping editor. Inheritance operation mapping require no parameters. Additionally add manual test with operation class mapping.

* [#360](https://github.com/finos/legend-studio/pull/360) [`e568574`](https://github.com/finos/legend-studio/commit/e568574339d61035c99df0f4f29669cda73819f0) Thanks [@akphi](https://github.com/akphi)! - Support renaming element (https://github.com/finos/legend-studio/issues/322). User can access this funtionality via the element context menu in the explorer tree. Diagram editor now also allows renaming classes.

- [#360](https://github.com/finos/legend-studio/pull/360) [`e568574`](https://github.com/finos/legend-studio/commit/e568574339d61035c99df0f4f29669cda73819f0) Thanks [@akphi](https://github.com/akphi)! - Fix a bug where classes coming from immutable graphs (system, generation, dependencies) are automatically removed in diagrams (a regrssion introduced by https://github.com/finos/legend-studio/pull/351).

* [#359](https://github.com/finos/legend-studio/pull/359) [`cd78be6`](https://github.com/finos/legend-studio/commit/cd78be6e6669b5253c12ea9a9ceacef908a1686c) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Enable query builder for generated and dependency elements.

- [#350](https://github.com/finos/legend-studio/pull/350) [`56a089d`](https://github.com/finos/legend-studio/commit/56a089dca25e24d890b52f0810e2ff3219ff46e8) Thanks [@akphi](https://github.com/akphi)! - Rework how zooming works in diagram editor. Now, upon scrolling, zoom will use the pointer location as the zoom center rather than using the canvas center. Also, we allow user to be able to choose the zoom level or do a zoom to fit. Also, we now disallow negative zoom level and cap at the minimum level of 5%.

* [#351](https://github.com/finos/legend-studio/pull/351) [`7561184`](https://github.com/finos/legend-studio/commit/75611843191f31d35dac51267b25de4298f48f4b) Thanks [@pierredebelen](https://github.com/pierredebelen)! - Fix issue: https://github.com/finos/legend-studio/issues/335
  Ensure the diagram is updated if:

  - A Class is deleted
  - A property is removed from a Class
  - A supertype is removed from a Class

- [#360](https://github.com/finos/legend-studio/pull/360) [`e568574`](https://github.com/finos/legend-studio/commit/e568574339d61035c99df0f4f29669cda73819f0) Thanks [@akphi](https://github.com/akphi)! - Fix a regression (introduced by https://github.com/finos/legend-studio/pull/350) with DnD to add class and ejecting property position in diagram editor.

* [#362](https://github.com/finos/legend-studio/pull/362) [`8df01ce`](https://github.com/finos/legend-studio/commit/8df01ceb5d45aba42ab8541ae12d01e731b0c988) Thanks [@pierredebelen](https://github.com/pierredebelen)! - Fix the inheritance view layout by ensuring the bounding rectangle is computed for the inital class

- [#341](https://github.com/finos/legend-studio/pull/341) [`b45e1ca`](https://github.com/finos/legend-studio/commit/b45e1ca06b7b3017972607c06c099bfa9fcd640f) Thanks [@umarphaarook](https://github.com/umarphaarook)! - Enable query builder in viewer mode.

* [#349](https://github.com/finos/legend-studio/pull/349) [`0c37922`](https://github.com/finos/legend-studio/commit/0c37922f4b848725aca3b574e55f9236e6b883c3) Thanks [@akphi](https://github.com/akphi)! - Rework diagram editor layout and state management. Allow user to edit property in-place (see https://github.com/finos/legend-studio/issues/300).

* Updated dependencies [[`0c37922`](https://github.com/finos/legend-studio/commit/0c37922f4b848725aca3b574e55f9236e6b883c3), [`0c37922`](https://github.com/finos/legend-studio/commit/0c37922f4b848725aca3b574e55f9236e6b883c3), [`0c37922`](https://github.com/finos/legend-studio/commit/0c37922f4b848725aca3b574e55f9236e6b883c3), [`e568574`](https://github.com/finos/legend-studio/commit/e568574339d61035c99df0f4f29669cda73819f0), [`56a089d`](https://github.com/finos/legend-studio/commit/56a089dca25e24d890b52f0810e2ff3219ff46e8), [`56a089d`](https://github.com/finos/legend-studio/commit/56a089dca25e24d890b52f0810e2ff3219ff46e8)]:
  - @finos/legend-studio-components@0.0.25
  - @finos/legend-studio-network@0.0.23
  - @finos/legend-studio-shared@0.0.21

## 0.1.18

### Patch Changes

- [#346](https://github.com/finos/legend-studio/pull/346) [`d545580`](https://github.com/finos/legend-studio/commit/d5455804b7895947dc167834c87300267e1cdde0) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Add text support for `INHERITANCE` operation class mapping.

* [#290](https://github.com/finos/legend-studio/pull/290) [`cb0ff2b`](https://github.com/finos/legend-studio/commit/cb0ff2b7aecfaf2a89d4ddc98e04854c25624ce8) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Add database builder in the relational connection editor to support generating a database from a connection specification.

- [#340](https://github.com/finos/legend-studio/pull/340) [`c2d3afd`](https://github.com/finos/legend-studio/commit/c2d3afd32fad0a680169443056155235adfc96cb) Thanks [@akphi](https://github.com/akphi)! - Improve diagram editor modelling capabilities (related to https://github.com/finos/legend-studio/issues/300). In diagram editor, users now have can see all supported hotkeys and have the tools to create new classes, properties, inheritance relationships, etc. All of this is made possible thanks to @pierredebelen for contributing to the core diagram renderer in https://github.com/finos/legend-studio/pull/338.

* [#336](https://github.com/finos/legend-studio/pull/336) [`acd7d99`](https://github.com/finos/legend-studio/commit/acd7d99c844161d16dd8e64d828d2361de06815d) Thanks [@epsstan](https://github.com/epsstan)! -

- [#336](https://github.com/finos/legend-studio/pull/336) [`acd7d99`](https://github.com/finos/legend-studio/commit/acd7d99c844161d16dd8e64d828d2361de06815d) Thanks [@epsstan](https://github.com/epsstan)! - Add support for `BigQuery` connection.

- Updated dependencies [[`c2d3afd`](https://github.com/finos/legend-studio/commit/c2d3afd32fad0a680169443056155235adfc96cb), [`c2d3afd`](https://github.com/finos/legend-studio/commit/c2d3afd32fad0a680169443056155235adfc96cb)]:
  - @finos/legend-studio-components@0.0.24
  - @finos/legend-studio-network@0.0.22
  - @finos/legend-studio-shared@0.0.20

## 0.1.17

### Patch Changes

- [#332](https://github.com/finos/legend-studio/pull/332) [`375a5e3`](https://github.com/finos/legend-studio/commit/375a5e3479e865baf4dffb6d77cf4c7cf3de7ba2) Thanks [@akphi](https://github.com/akphi)! - Fix a bug where `relational mapping` source tree does not display root nodes correctly (only the last column is shown) due to faulty node ID generator.

* [#312](https://github.com/finos/legend-studio/pull/312) [`65966ef`](https://github.com/finos/legend-studio/commit/65966ef8e6fa8152fcc5c39501fda9c62646aecc) Thanks [@umarphaarook](https://github.com/umarphaarook)! - Allow users to use text-mode while viewing project in read-only mode.

* Updated dependencies [[`375a5e3`](https://github.com/finos/legend-studio/commit/375a5e3479e865baf4dffb6d77cf4c7cf3de7ba2)]:
  - @finos/legend-studio-components@0.0.23
  - @finos/legend-studio-network@0.0.21
  - @finos/legend-studio-shared@0.0.19

## 0.1.16

### Patch Changes

- Updated dependencies [[`7ac0688`](https://github.com/finos/legend-studio/commit/7ac0688f99ba9328677eb71b5c811ab52bc3f371), [`7ac0688`](https://github.com/finos/legend-studio/commit/7ac0688f99ba9328677eb71b5c811ab52bc3f371)]:
  - @finos/legend-studio-components@0.0.22
  - @finos/legend-studio-shared@0.0.18
  - @finos/legend-studio-network@0.0.20

## 0.1.15

### Patch Changes

- [#311](https://github.com/finos/legend-studio/pull/311) [`49b407f`](https://github.com/finos/legend-studio/commit/49b407fafe3f4eac3a012d1815167c40a8914cdc) Thanks [@akphi](https://github.com/akphi)! - **BREAKING CHANGE:** Function expression builder will no-longer support building any function unless their expression builders are specified in plugins. This is adjusted to match the behavior of function handler in engine. _Also, by design, core Studio should not handle function matching at all._

* [#293](https://github.com/finos/legend-studio/pull/293) [`7aaa969`](https://github.com/finos/legend-studio/commit/7aaa969a1f2eba8a3f20cddb89455b3087907502) Thanks [@akphi](https://github.com/akphi)! - Avoid printing out Javascript class name as these will get obfuscated and modified due to minification in production build. As such, unsupported operation error messages are resructured to print out the unsupported objects instead of their classes' names.

- [#313](https://github.com/finos/legend-studio/pull/313) [`547089b`](https://github.com/finos/legend-studio/commit/547089b71ec534be6d2362369748d08d63cd8243) Thanks [@hardikmaheshwari](https://github.com/hardikmaheshwari)! - Add support for configuring Snowflake datasource specification `quotedIdentifiersIgnoreCase` flag in form mode.

* [#293](https://github.com/finos/legend-studio/pull/293) [`7aaa969`](https://github.com/finos/legend-studio/commit/7aaa969a1f2eba8a3f20cddb89455b3087907502) Thanks [@akphi](https://github.com/akphi)! - **BREAKING CHANGE** Element builder for DSL now requires `elementClassName` to better print error message when loading plugins.

- [#314](https://github.com/finos/legend-studio/pull/314) [`88795fc`](https://github.com/finos/legend-studio/commit/88795fc5a36eea288b2b7ca8a659eec938aff31a) Thanks [@akphi](https://github.com/akphi)! - Allow DnD from project explorer panel to grammar text editor to quickly add the path of the element.

- Updated dependencies [[`49b407f`](https://github.com/finos/legend-studio/commit/49b407fafe3f4eac3a012d1815167c40a8914cdc), [`7aaa969`](https://github.com/finos/legend-studio/commit/7aaa969a1f2eba8a3f20cddb89455b3087907502), [`7aaa969`](https://github.com/finos/legend-studio/commit/7aaa969a1f2eba8a3f20cddb89455b3087907502), [`88795fc`](https://github.com/finos/legend-studio/commit/88795fc5a36eea288b2b7ca8a659eec938aff31a), [`88795fc`](https://github.com/finos/legend-studio/commit/88795fc5a36eea288b2b7ca8a659eec938aff31a), [`88795fc`](https://github.com/finos/legend-studio/commit/88795fc5a36eea288b2b7ca8a659eec938aff31a), [`7aaa969`](https://github.com/finos/legend-studio/commit/7aaa969a1f2eba8a3f20cddb89455b3087907502)]:
  - @finos/legend-studio-components@0.0.21
  - @finos/legend-studio-network@0.0.19
  - @finos/legend-studio-shared@0.0.17

## 0.1.14

### Patch Changes

- [#286](https://github.com/finos/legend-studio/pull/286) [`f08d984`](https://github.com/finos/legend-studio/commit/f08d9845ace8dbbd54a8ab228ceb23b3bca1aca3) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Include all runtimes and mappings in execution input to support connections referencing other mappings such as ModelChainConnections.

* [#255](https://github.com/finos/legend-studio/pull/255) [`713405b`](https://github.com/finos/legend-studio/commit/713405bdbcbdbb4247d6885fd2d843a30d26d693) Thanks [@akphi](https://github.com/akphi)! - **BREAKING CHANGE:** Remove `GraphFreezer` as we now can rely on hashing to detect unexpected changes to immutable objects. As a result, the config flag `DEV__enableGraphImmutabilityRuntimeCheck` will be removed as well.

- [#255](https://github.com/finos/legend-studio/pull/255) [`713405b`](https://github.com/finos/legend-studio/commit/713405bdbcbdbb4247d6885fd2d843a30d26d693) Thanks [@akphi](https://github.com/akphi)! - **BREAKING CHANGE:** Simplify element hash computation: now, the the computation should be placed in `_elementHashCode`, `hashCode` is specified at `PackageableElement` level that does some logical check for disposed and frozen objects before returning `_elementHashCode`. This way, we don't need to repeat as much code when introducing newer types of `PackageableElement` and we would output error when frozen elements are modified somehow.

* [#255](https://github.com/finos/legend-studio/pull/255) [`713405b`](https://github.com/finos/legend-studio/commit/713405bdbcbdbb4247d6885fd2d843a30d26d693) Thanks [@akphi](https://github.com/akphi)! - Fix a bug where relational mapping editor _swallows_ embedded property mapping (https://github.com/finos/legend-studio/issues/285).

* Updated dependencies [[`713405b`](https://github.com/finos/legend-studio/commit/713405bdbcbdbb4247d6885fd2d843a30d26d693)]:
  - @finos/legend-studio-components@0.0.20
  - @finos/legend-studio-network@0.0.18
  - @finos/legend-studio-shared@0.0.16

## 0.1.13

### Patch Changes

- [#252](https://github.com/finos/legend-studio/pull/252) [`cdc4c3c`](https://github.com/finos/legend-studio/commit/cdc4c3c92f9cc66a1304666429a721731c8466b0) Thanks [@akphi](https://github.com/akphi)! - **BREAKING CHANGE:** `V1_GraphTransformerContextBuilder` now requires `PureProtocolProcessorPlugin` in the constructor instead of the `keepSourceInformation` boolean flag.

* [#244](https://github.com/finos/legend-studio/pull/244) [`ab15166`](https://github.com/finos/legend-studio/commit/ab15166f9f60a51d48e2c02b45a937f1dcb8f642) Thanks [@akphi](https://github.com/akphi)! - Remove config flag `TEMPORARY__disableNonModelStoreSupports`.

- [#252](https://github.com/finos/legend-studio/pull/252) [`cdc4c3c`](https://github.com/finos/legend-studio/commit/cdc4c3c92f9cc66a1304666429a721731c8466b0) Thanks [@akphi](https://github.com/akphi)! - **BREAKING CHANGE:** Add context to transformers in `PureProtocolProcessorPlugin`.

* [#241](https://github.com/finos/legend-studio/pull/241) [`76092dd`](https://github.com/finos/legend-studio/commit/76092dd5f6a31a30e18ca6e711c0f0f5a9e195ef) Thanks [@akphi](https://github.com/akphi)! - Rework mapping editor: mapping execution builder and test editor have been moved from the auxiliary panel to the screen of the mapping editor.

- [#244](https://github.com/finos/legend-studio/pull/244) [`ab15166`](https://github.com/finos/legend-studio/commit/ab15166f9f60a51d48e2c02b45a937f1dcb8f642) Thanks [@akphi](https://github.com/akphi)! - Support `HackedClass` and `HackedUnit` which is used to support `@` syntax in PURE grammar.

* [#248](https://github.com/finos/legend-studio/pull/248) [`a35e4d2`](https://github.com/finos/legend-studio/commit/a35e4d229e113c491ef51f9ad126ead98979a32f) Thanks [@akphi](https://github.com/akphi)! - Fix a bug that prevents graph freezer to work properly with relational property mapping (related to the changes in #207).

- [#248](https://github.com/finos/legend-studio/pull/248) [`a35e4d2`](https://github.com/finos/legend-studio/commit/a35e4d229e113c491ef51f9ad126ead98979a32f) Thanks [@akphi](https://github.com/akphi)! - Introduce plan execution processor (#249).

- Updated dependencies [[`a35e4d2`](https://github.com/finos/legend-studio/commit/a35e4d229e113c491ef51f9ad126ead98979a32f), [`ab15166`](https://github.com/finos/legend-studio/commit/ab15166f9f60a51d48e2c02b45a937f1dcb8f642), [`76092dd`](https://github.com/finos/legend-studio/commit/76092dd5f6a31a30e18ca6e711c0f0f5a9e195ef), [`cdc4c3c`](https://github.com/finos/legend-studio/commit/cdc4c3c92f9cc66a1304666429a721731c8466b0)]:
  - @finos/legend-studio-components@0.0.19
  - @finos/legend-studio-network@0.0.17
  - @finos/legend-studio-shared@0.0.15

## 0.1.12

### Patch Changes

- [#237](https://github.com/finos/legend-studio/pull/237) [`f66159e`](https://github.com/finos/legend-studio/commit/f66159e21a66b1224061ac3da2f7ac3e3050e341) Thanks [@akphi](https://github.com/akphi)! - Fix a bug where model loader fail to show current graph in Pure model context data format.

* [#239](https://github.com/finos/legend-studio/pull/239) [`21e2a3f`](https://github.com/finos/legend-studio/commit/21e2a3fb4c1b950c492d17178a5f7380fd52dc66) Thanks [@akphi](https://github.com/akphi)! - Support `PackageableElementPtr` in response to [change in engine](https://github.com/finos/legend-engine/pull/255).

- [#237](https://github.com/finos/legend-studio/pull/237) [`f66159e`](https://github.com/finos/legend-studio/commit/f66159e21a66b1224061ac3da2f7ac3e3050e341) Thanks [@akphi](https://github.com/akphi)! - Make sure to prune source information from lambdas and relational operations before syncing workspace.

- Updated dependencies [[`f66159e`](https://github.com/finos/legend-studio/commit/f66159e21a66b1224061ac3da2f7ac3e3050e341), [`21e2a3f`](https://github.com/finos/legend-studio/commit/21e2a3fb4c1b950c492d17178a5f7380fd52dc66), [`f66159e`](https://github.com/finos/legend-studio/commit/f66159e21a66b1224061ac3da2f7ac3e3050e341)]:
  - @finos/legend-studio-components@0.0.18

## 0.1.11

### Patch Changes

- [#227](https://github.com/finos/legend-studio/pull/227) [`df3f3b6`](https://github.com/finos/legend-studio/commit/df3f3b67aed33ad510711694e3a3f299927626a8) Thanks [@akphi](https://github.com/akphi)! - Show all class mapping ID corresponding to the class of class properties in relational mapping editor. This would allow users to specify one property mapping per class mapping.

* [#227](https://github.com/finos/legend-studio/pull/227) [`df3f3b6`](https://github.com/finos/legend-studio/commit/df3f3b67aed33ad510711694e3a3f299927626a8) Thanks [@akphi](https://github.com/akphi)! - Fix a bug where global compile (using F9) does not clear the compilation of each lambda editor.

- [#227](https://github.com/finos/legend-studio/pull/227) [`df3f3b6`](https://github.com/finos/legend-studio/commit/df3f3b67aed33ad510711694e3a3f299927626a8) Thanks [@akphi](https://github.com/akphi)! - Fix a bug where compilation hotkey (F9) does not work when the focus is in lambda editor.

- Updated dependencies [[`df3f3b6`](https://github.com/finos/legend-studio/commit/df3f3b67aed33ad510711694e3a3f299927626a8)]:
  - @finos/legend-studio-components@0.0.17
  - @finos/legend-studio-network@0.0.16
  - @finos/legend-studio-shared@0.0.14

## 0.1.10

### Patch Changes

- [#224](https://github.com/finos/legend-studio/pull/224) [`de511da`](https://github.com/finos/legend-studio/commit/de511daf935680ce1a61a2eb85d445c2d3c5dcba) Thanks [@hardikmaheshwari](https://github.com/hardikmaheshwari)! - Added quotedIdentifiersIgnoreCaseFlag in snowflakeDatasourceSpecification.

* [#225](https://github.com/finos/legend-studio/pull/225) [`8159c1f`](https://github.com/finos/legend-studio/commit/8159c1f02eafcd52fbbb3add7358afc718cf03d2) Thanks [@akphi](https://github.com/akphi)! - Add support for relational mapping test.

* Updated dependencies [[`8159c1f`](https://github.com/finos/legend-studio/commit/8159c1f02eafcd52fbbb3add7358afc718cf03d2)]:
  - @finos/legend-studio-components@0.0.16
  - @finos/legend-studio-network@0.0.15
  - @finos/legend-studio-shared@0.0.13

## 0.1.9

### Patch Changes

- [#214](https://github.com/finos/legend-studio/pull/214) [`c90cfc6`](https://github.com/finos/legend-studio/commit/c90cfc6c1a1a69d97fba5336d0c1b7f9e0b63221) Thanks [@akphi](https://github.com/akphi)! - Rework mapping execution panel to make its behavior more consistent across different types of mappings (related to #202 and #204).

* [#223](https://github.com/finos/legend-studio/pull/223) [`16696ae`](https://github.com/finos/legend-studio/commit/16696ae2513806e8128cff6a4d50c364601f0275) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Fix extension that selects additional elements for execution input from `V1_getExtraExecutionInputElements` to the function `V1_getExtraExecutionInputGetters`. This allows the extensions to be used by the plugins by implementing the function.

- [#214](https://github.com/finos/legend-studio/pull/214) [`c90cfc6`](https://github.com/finos/legend-studio/commit/c90cfc6c1a1a69d97fba5336d0c1b7f9e0b63221) Thanks [@akphi](https://github.com/akphi)! - Fix a bug with mapping editor not properly pruning stubbed property mapping, causing compilation to fail.

- Updated dependencies [[`c90cfc6`](https://github.com/finos/legend-studio/commit/c90cfc6c1a1a69d97fba5336d0c1b7f9e0b63221)]:
  - @finos/legend-studio-components@0.0.15
  - @finos/legend-studio-network@0.0.14
  - @finos/legend-studio-shared@0.0.12

## 0.1.8

### Patch Changes

- [#218](https://github.com/finos/legend-studio/pull/218) [`0bd1fd9`](https://github.com/finos/legend-studio/commit/0bd1fd96f9f4db85700df2cdf99fd6bc3bc0c524) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Add `V1_getExtraExecutionInputElements` to send additional elements as part of query execution call.

## 0.1.7

### Patch Changes

- [#216](https://github.com/finos/legend-studio/pull/216) [`5c35ef1`](https://github.com/finos/legend-studio/commit/5c35ef132a1cf60a5a067895e68b54f4cb363c3a) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Use meta::legend::service::metamodel::Service for service classifierPath.

## 0.1.6

### Patch Changes

- [#211](https://github.com/finos/legend-studio/pull/211) [`86cd535`](https://github.com/finos/legend-studio/commit/86cd535e1df97f722bcd69270e84d82a6d1ff6e1) Thanks [@akphi](https://github.com/akphi)! - Do a non-throwing processing of relational property mapping operation to make sure that paths resolved and that we can infer the main table properly.

* [#211](https://github.com/finos/legend-studio/pull/211) [`86cd535`](https://github.com/finos/legend-studio/commit/86cd535e1df97f722bcd69270e84d82a6d1ff6e1) Thanks [@akphi](https://github.com/akphi)! - Support creating embedded relational database connection in runtime editor.

- [#211](https://github.com/finos/legend-studio/pull/211) [`86cd535`](https://github.com/finos/legend-studio/commit/86cd535e1df97f722bcd69270e84d82a6d1ff6e1) Thanks [@akphi](https://github.com/akphi)! - Support selecting database table/view as class mapping source.

- Updated dependencies [[`86cd535`](https://github.com/finos/legend-studio/commit/86cd535e1df97f722bcd69270e84d82a6d1ff6e1)]:
  - @finos/legend-studio-components@0.0.14
  - @finos/legend-studio-shared@0.0.11
  - @finos/legend-studio-network@0.0.13

## 0.1.5

### Patch Changes

- [#207](https://github.com/finos/legend-studio/pull/207) [`6be621e`](https://github.com/finos/legend-studio/commit/6be621eb840ae2200ce791641475ee882dcbf33a) Thanks [@akphi](https://github.com/akphi)! - Properly encode URI for query params and search params in API calls.

* [#207](https://github.com/finos/legend-studio/pull/207) [`6be621e`](https://github.com/finos/legend-studio/commit/6be621eb840ae2200ce791641475ee882dcbf33a) Thanks [@akphi](https://github.com/akphi)! - Allow user to copy link to open element in project viewer mode via context-menu.

- [#210](https://github.com/finos/legend-studio/pull/210) [`b358e7f`](https://github.com/finos/legend-studio/commit/b358e7f212d90467b6536331b450f7234a970516) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Fix a problem with `getDependencyEntities` API url.

* [#207](https://github.com/finos/legend-studio/pull/207) [`6be621e`](https://github.com/finos/legend-studio/commit/6be621eb840ae2200ce791641475ee882dcbf33a) Thanks [@akphi](https://github.com/akphi)! - Add a simple relational mapping editor with support for DnD from table source panel.

* Updated dependencies [[`6be621e`](https://github.com/finos/legend-studio/commit/6be621eb840ae2200ce791641475ee882dcbf33a), [`6be621e`](https://github.com/finos/legend-studio/commit/6be621eb840ae2200ce791641475ee882dcbf33a)]:
  - @finos/legend-studio-network@0.0.12
  - @finos/legend-studio-shared@0.0.10
  - @finos/legend-studio-components@0.0.13

## 0.1.4

### Patch Changes

- [#203](https://github.com/finos/legend-studio/pull/203) [`0d8c766`](https://github.com/finos/legend-studio/commit/0d8c7660f3a70d75e7d6d5265bf894ddb7088d02) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Studio now leverages the metadata server to fetch dependency entities. This helps to simplify our logic in handling project dependency.

* [#205](https://github.com/finos/legend-studio/pull/205) [`e6b0425`](https://github.com/finos/legend-studio/commit/e6b04259c33ee8563391fd6833cd337b83b77d44) Thanks [@hardikmaheshwari](https://github.com/hardikmaheshwari)! - Fix rootRelationalClassMapping compilation to include filter.

## 0.1.3

### Patch Changes

- [#199](https://github.com/finos/legend-studio/pull/199) [`2aab88e`](https://github.com/finos/legend-studio/commit/2aab88e797eec37760a646f7c6ee9d9f612d31cc) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Use meta::alloy::service::metamodel::Service for service classifierPath.

* [#200](https://github.com/finos/legend-studio/pull/200) [`20b4e8f`](https://github.com/finos/legend-studio/commit/20b4e8f21d4c4abc1fd8ef06e826b9b8df883bc5) Thanks [@akphi](https://github.com/akphi)! - Improve the UX when users launch the editor with either not-found project or workspace. In particular, if the workspace is not found, we give them the option to create the workspace to start making changes or just view the project without the need to create any workspace. This will help with the case where users share URLs to a particular project/workspace; before, they are redirected back to the setup page with no clear message, which is _very confusing_.

* Updated dependencies [[`20b4e8f`](https://github.com/finos/legend-studio/commit/20b4e8f21d4c4abc1fd8ef06e826b9b8df883bc5)]:
  - @finos/legend-studio-components@0.0.12
  - @finos/legend-studio-network@0.0.11
  - @finos/legend-studio-shared@0.0.9

## 0.1.2

### Patch Changes

- [#181](https://github.com/finos/legend-studio/pull/181) [`1deb5ab`](https://github.com/finos/legend-studio/commit/1deb5ab5b398c5da55bc482695457804f8407be8) Thanks [@hardikmaheshwari](https://github.com/hardikmaheshwari)! - Add `quoteIdentifiers` support to database connection.

* [#190](https://github.com/finos/legend-studio/pull/190) [`c4ef316`](https://github.com/finos/legend-studio/commit/c4ef3165b7d344e771e1bb741ddc48ed5786cb04) Thanks [@kshradhan](https://github.com/kshradhan)! - Fix a bug in association editor where it crashes when users attempt to modify the property type(s) of a newly created association.

- [#189](https://github.com/finos/legend-studio/pull/189) [`cf36a42`](https://github.com/finos/legend-studio/commit/cf36a42f658ac8bbab9a054010948b29707255d0) Thanks [@akphi](https://github.com/akphi)! - Modify Pure protocol, (de)serialization, and hash computation of relational mapping to match with what grammar parser in engine yields.

* [#193](https://github.com/finos/legend-studio/pull/193) [`38a25d3`](https://github.com/finos/legend-studio/commit/38a25d3973ae771097ebfc169a21e021c24a4179) Thanks [@hardikmaheshwari](https://github.com/hardikmaheshwari)! - Check for joins in included databases.

- [#187](https://github.com/finos/legend-studio/pull/187) [`cbccdc0`](https://github.com/finos/legend-studio/commit/cbccdc0fcb81cf873d50a9d41b04054a6efbf5fd) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Use `meta::legend::service::metamodel::Service` for service classifierPath.

* [#194](https://github.com/finos/legend-studio/pull/194) [`80bd86a`](https://github.com/finos/legend-studio/commit/80bd86a5add9011f1ce7df33d700a1c1f28d5e08) Thanks [@akphi](https://github.com/akphi)! - Use ES module (ESM) throughout the codebase.

- [#183](https://github.com/finos/legend-studio/pull/183) [`1ace102`](https://github.com/finos/legend-studio/commit/1ace102d50364645ec5d9efdbde2d4ca778f0544) Thanks [@akphi](https://github.com/akphi)! - Add support for Snowflake Public authentication strategy.

- Updated dependencies [[`1ace102`](https://github.com/finos/legend-studio/commit/1ace102d50364645ec5d9efdbde2d4ca778f0544), [`80bd86a`](https://github.com/finos/legend-studio/commit/80bd86a5add9011f1ce7df33d700a1c1f28d5e08), [`80bd86a`](https://github.com/finos/legend-studio/commit/80bd86a5add9011f1ce7df33d700a1c1f28d5e08), [`46a6c4a`](https://github.com/finos/legend-studio/commit/46a6c4a761e6a8b7f1291e574524fd85e7124b08), [`1ace102`](https://github.com/finos/legend-studio/commit/1ace102d50364645ec5d9efdbde2d4ca778f0544), [`6705d7f`](https://github.com/finos/legend-studio/commit/6705d7f38982dcac70fb7a5586c1cd18d21a33e0)]:
  - @finos/legend-studio-components@0.0.11
  - @finos/legend-studio-network@0.0.11
  - @finos/legend-studio-shared@0.0.9

## 0.1.1

### Patch Changes

- Updated dependencies [[`2f0991a`](https://github.com/finos/legend-studio/commit/2f0991a15e50cb3c5ecbe3a4ca46c7ec26d09415), [`6592e02`](https://github.com/finos/legend-studio/commit/6592e02f8a8b00d5150aabf6160d98dd20b5a80d)]:
  - @finos/legend-studio-components@0.0.10
  - @finos/legend-studio-network@0.0.10
  - @finos/legend-studio-shared@0.0.8

## 0.1.0

### Minor Changes

- [#173](https://github.com/finos/legend-studio/pull/173) [`7709ab3`](https://github.com/finos/legend-studio/commit/7709ab3b2a3e66a5d44864e1ce694e696dddba69) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - A RawLambda resolver is added to resolve element paths inside lambdas that leverage imports. This allow successful compilation of graph that contain lambdas using imports.

* [#171](https://github.com/finos/legend-studio/pull/171) [`2d1f8a7`](https://github.com/finos/legend-studio/commit/2d1f8a78c38121e96b745939b23ba5cc46c7a53c) Thanks [@akphi](https://github.com/akphi)! - **BREAKING CHANGE** Studio router is reorganized to be more consistent and to accomondate more use cases.

  - All routes now are to be prefixed with the SDLC server key, if there is only one SDLC server specified in the config file (with legacy SDLC field config form: `sdlc: { url: string }`), then the server key is `-`, i.e. `/studio/-/...`, else the server key is the key to the SDLC instance, i.e. `/studio/sdlc1/...`.
  - If the server key specified in the URL is not recognised, the user will be redirected to the setup page if there is only one SDLC server in the config or the SDLC server configuration page if there are multiple SDLC servers in the config.
  - Some basic routes are now renamed to be more consistent with others: e.g. setup page route is `/studio/-/setup/...`, editor page route is `/studio/-/edit/...`, and viewer page route is `/studio/-/view/...`.

### Patch Changes

- [#172](https://github.com/finos/legend-studio/pull/172) [`e9c97c4`](https://github.com/finos/legend-studio/commit/e9c97c41b18d79d2676e48e12ae4e92d528b1819) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Fetch project versions in view mode, enabling features such as service registration in view mode.

- Updated dependencies [[`b04b0f9`](https://github.com/finos/legend-studio/commit/b04b0f9abbecf886d0c864a8484717bf26ff22dc), [`4167a8b`](https://github.com/finos/legend-studio/commit/4167a8b68766beab60b98d5b3a6b23fbbce4847b)]:
  - @finos/legend-studio-components@0.0.9
  - @finos/legend-studio-network@0.0.9
  - @finos/legend-studio-shared@0.0.7

## 0.0.17

### Patch Changes

- [#163](https://github.com/finos/legend-studio/pull/163) [`7db0623`](https://github.com/finos/legend-studio/commit/7db0623da87c55256d440744e41bd1e2f8327e08) Thanks [@hardikmaheshwari](https://github.com/hardikmaheshwari)! - fix change detection for self-join definition

## 0.0.16

### Patch Changes

- [#158](https://github.com/finos/legend-studio/pull/158) [`5f28d8e`](https://github.com/finos/legend-studio/commit/5f28d8e653993369efb41ff91e4f7d6b7fcd76e0) Thanks [@emilia-sokol-gs](https://github.com/emilia-sokol-gs)! - Fix setting source for PurePropertyMapping

* [#156](https://github.com/finos/legend-studio/pull/156) [`2aa9425`](https://github.com/finos/legend-studio/commit/2aa942562310702003da859d1222612fcac38a19) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - fix authentication typo

## 0.0.15

### Patch Changes

- [#153](https://github.com/finos/legend-studio/pull/153) [`09634da`](https://github.com/finos/legend-studio/commit/09634da8795744557c097725a42089384d0bafaa) Thanks [@hardikmaheshwari](https://github.com/hardikmaheshwari)! - fix studio change detection for self-join

## 0.0.14

### Patch Changes

- [#150](https://github.com/finos/legend-studio/pull/150) [`58433f5`](https://github.com/finos/legend-studio/commit/58433f5e9f65571a6ca57da60dfb264fb7ef051a) Thanks [@emilia-sokol-gs](https://github.com/emilia-sokol-gs)! - Add support for aggregartion aware mapping in studio. Done by adding missing implementation e.g. in V1_ProtocolToMetaModel visitor for class mapping and property mapping. Added roundtrip test to test flow.

## 0.0.13

### Patch Changes

- [#147](https://github.com/finos/legend-studio/pull/147) [`c1e3047`](https://github.com/finos/legend-studio/commit/c1e3047300b1be93c27059b8bf570a76698c5970) Thanks [@akphi](https://github.com/akphi)! - Allow configuring SDLC server when multiple SDLC servers are available in Studio config file.

## 0.0.12

### Patch Changes

- [#144](https://github.com/finos/legend-studio/pull/144) [`288523d`](https://github.com/finos/legend-studio/commit/288523ddf3d37b146f6229189b7174f9e4bd6da8) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Initialize engine in review and viewer store

## 0.0.11

### Patch Changes

- [#140](https://github.com/finos/legend-studio/pull/140) [`3b5fb01`](https://github.com/finos/legend-studio/commit/3b5fb01dce4ffa2081c016369f6b8ee715fb5245) Thanks [@akphi](https://github.com/akphi)! - Make sure expected test result JSON for mapping test does not store with formatting to not break text mode.

* [#140](https://github.com/finos/legend-studio/pull/140) [`3b5fb01`](https://github.com/finos/legend-studio/commit/3b5fb01dce4ffa2081c016369f6b8ee715fb5245) Thanks [@akphi](https://github.com/akphi)! - Make JSON property field sort consistent with Java Jackson

## 0.0.10

### Patch Changes

- [#134](https://github.com/finos/legend-studio/pull/134) [`c3b31f7`](https://github.com/finos/legend-studio/commit/c3b31f7d385ada299be92b3716d6a2a64c179eed) Thanks [@aziemchawdhary-gs](https://github.com/aziemchawdhary-gs)! - Ensure that test data is stored with no formatting

## 0.0.9

### Patch Changes

- Updated dependencies []:
  - @finos/legend-studio-components@0.0.8
  - @finos/legend-studio-network@0.0.8
  - @finos/legend-studio-shared@0.0.6

## 0.0.8

### Patch Changes

- [#124](https://github.com/finos/legend-studio/pull/124) [`2ea6867`](https://github.com/finos/legend-studio/commit/2ea6867695a0a00e02b08eadd5ec7db3d384ec6f) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Change label for enum options in file generation editor: for element-path-like values we will show only the element name.

* [#123](https://github.com/finos/legend-studio/pull/123) [`2a2acce`](https://github.com/finos/legend-studio/commit/2a2acced59e9dea97706dd6dcb25332862231f40) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Add support for cross store (xStore) association mapping in studio. Done by adding a new type of AssociationImplementation called 'XStoreAssociationImplementation' and a new type of PropertyMapping called 'XStorePropertyMapping'. Add roundtrip tests to test flow.

- [#114](https://github.com/finos/legend-studio/pull/114) [`e01d74f`](https://github.com/finos/legend-studio/commit/e01d74fac0a0befd01621c285244cf5732bb3a39) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Change schemaMapper to schema in tableNameMapper to be align with protocol

- Updated dependencies [[`5e4e97c`](https://github.com/finos/legend-studio/commit/5e4e97c8f704b529cbfed3109a24bef30ebb98a8)]:
  - @finos/legend-studio-components@0.0.7
  - @finos/legend-studio-network@0.0.7
  - @finos/legend-studio-shared@0.0.6

## 0.0.7

### Patch Changes

- [#108](https://github.com/finos/legend-studio/pull/108) [`35119b3`](https://github.com/finos/legend-studio/commit/35119b3421f949da32be5884ace73ab94b010a54) Thanks [@akphi](https://github.com/akphi)! - Move @types/\* dependencies from devDependencies in order to ensure NPM consumers properly install these typings.

- Updated dependencies [[`35119b3`](https://github.com/finos/legend-studio/commit/35119b3421f949da32be5884ace73ab94b010a54)]:
  - @finos/legend-studio-components@0.0.6
  - @finos/legend-studio-shared@0.0.5
  - @finos/legend-studio-network@0.0.6

## 0.0.6

### Patch Changes

- [#106](https://github.com/finos/legend-studio/pull/106) [`ce630c7`](https://github.com/finos/legend-studio/commit/ce630c7c13b7b52a67d14189d42400cabfd13868) Thanks [@akphi](https://github.com/akphi)! - Fix dev-utils for Webpack and Jest to make consumer projects work with published packages from NPM.

- Updated dependencies []:
  - @finos/legend-studio-components@0.0.5
  - @finos/legend-studio-network@0.0.5
  - @finos/legend-studio-shared@0.0.4

## 0.0.5

### Patch Changes

- [#104](https://github.com/finos/legend-studio/pull/104) [`10e8f9f`](https://github.com/finos/legend-studio/commit/10e8f9f714d9376600ae8c4260405573372a24b4) Thanks [@akphi](https://github.com/akphi)! - Add `@testing-library/react` as dependencies for `@finos/legend-studio`.

## 0.0.4

### Patch Changes

- [#102](https://github.com/finos/legend-studio/pull/102) [`492e022`](https://github.com/finos/legend-studio/commit/492e02229d27fc5ef0e1bafbbd8672de0449081f) Thanks [@akphi](https://github.com/akphi)! - Update publish content avoid list.

- Updated dependencies [[`492e022`](https://github.com/finos/legend-studio/commit/492e02229d27fc5ef0e1bafbbd8672de0449081f)]:
  - @finos/legend-studio-components@0.0.4
  - @finos/legend-studio-network@0.0.4
  - @finos/legend-studio-shared@0.0.4

## 0.0.3

### Patch Changes

- Updated dependencies [[`94afef1`](https://github.com/finos/legend-studio/commit/94afef1c22d1c3426d9eb5aff055e581fb76c241)]:
  - @finos/legend-studio-components@0.0.3
  - @finos/legend-studio-network@0.0.3
  - @finos/legend-studio-shared@0.0.3

## 0.0.2

### Patch Changes

- Updated dependencies [[`f467ab8`](https://github.com/finos/legend-studio/commit/f467ab8a2efb9a283429c0997428269d3595a17a)]:
  - @finos/legend-studio-components@0.0.2
  - @finos/legend-studio-network@0.0.2
  - @finos/legend-studio-shared@0.0.2

## 0.0.1

### Patch Changes

- [`050b4ba`](https://github.com/finos/legend-studio/commit/050b4ba205d63abbc0c92d01e7538817c2ad4e42) [#50](https://github.com/finos/legend-studio/pull/50) Thanks [@aziemchawdhary-gs](https://github.com/aziemchawdhary-gs)! - Minify test data when creating JSON model connection data URL for test to reduce traffic load.

* [`b030ce6`](https://github.com/finos/legend-studio/commit/b030ce6d789bd564709c9d0d8d88e41fc7d3060a) [#73](https://github.com/finos/legend-studio/pull/73) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Scanned extra authenication strategy builders when building authenication strategy in relational connection.

- [`9fc7d5c`](https://github.com/finos/legend-studio/commit/9fc7d5c26ddb441b2c6d1f9759132cb7d33f0c8d) [#59](https://github.com/finos/legend-studio/pull/59) Thanks [@akphi](https://github.com/akphi)! - Change V1 engine client to not prefix the urls with `/api`, that should be moved to the config.

* [`68d35b5`](https://github.com/finos/legend-studio/commit/68d35b5a03797dabc7ef3315952cc38d0b55ad25) [#72](https://github.com/finos/legend-studio/pull/72) Thanks [@akphi](https://github.com/akphi)! - Change how `setupEngine()` is being called: now, it initializes the engine instance of graph manager instead of just configuring it.

- [`68d35b5`](https://github.com/finos/legend-studio/commit/68d35b5a03797dabc7ef3315952cc38d0b55ad25) [#72](https://github.com/finos/legend-studio/pull/72) Thanks [@akphi](https://github.com/akphi)! - Use a workaround when handling JSON test data and expected result to not break grammar in text mode (see https://github.com/finos/legend-studio/issues/68).

* [`2bbf5ba`](https://github.com/finos/legend-studio/commit/2bbf5baf337350d4deae7c28032cc4d473ffc600) [#82](https://github.com/finos/legend-studio/pull/82) Thanks [@akphi](https://github.com/akphi)! - Cleanup codesmells.

* Updated dependencies [[`9fc7d5c`](https://github.com/finos/legend-studio/commit/9fc7d5c26ddb441b2c6d1f9759132cb7d33f0c8d), [`2bbf5ba`](https://github.com/finos/legend-studio/commit/2bbf5baf337350d4deae7c28032cc4d473ffc600)]:
  - @finos/legend-studio-components@0.0.1
  - @finos/legend-studio-network@0.0.1
  - @finos/legend-studio-shared@0.0.1
