# @finos/legend-studio-preset-query-builder

## 0.0.21

### Patch Changes

- [#336](https://github.com/finos/legend-studio/pull/336) [`acd7d99`](https://github.com/finos/legend-studio/commit/acd7d99c844161d16dd8e64d828d2361de06815d) Thanks [@epsstan](https://github.com/epsstan)! -

- Updated dependencies [[`c2d3afd`](https://github.com/finos/legend-studio/commit/c2d3afd32fad0a680169443056155235adfc96cb), [`e3c0c75`](https://github.com/finos/legend-studio/commit/e3c0c752c15a85ca9370794099a177ccf63b4958), [`d545580`](https://github.com/finos/legend-studio/commit/d5455804b7895947dc167834c87300267e1cdde0), [`cb0ff2b`](https://github.com/finos/legend-studio/commit/cb0ff2b7aecfaf2a89d4ddc98e04854c25624ce8), [`c2d3afd`](https://github.com/finos/legend-studio/commit/c2d3afd32fad0a680169443056155235adfc96cb), [`44386e4`](https://github.com/finos/legend-studio/commit/44386e4180710e3294febdbfc5b87dc4267d8bb1), [`c2d3afd`](https://github.com/finos/legend-studio/commit/c2d3afd32fad0a680169443056155235adfc96cb), [`acd7d99`](https://github.com/finos/legend-studio/commit/acd7d99c844161d16dd8e64d828d2361de06815d)]:
  - @finos/legend-studio@0.1.18
  - @finos/legend-studio-components@0.0.24
  - @finos/legend-studio-shared@0.0.20

## 0.0.20

### Patch Changes

- [#332](https://github.com/finos/legend-studio/pull/332) [`375a5e3`](https://github.com/finos/legend-studio/commit/375a5e3479e865baf4dffb6d77cf4c7cf3de7ba2) Thanks [@akphi](https://github.com/akphi)! - Fix a bug where after an execution, a newly added projection column is always shown as the last column in result panel regardless of its type (with or without aggregation).

- Updated dependencies [[`375a5e3`](https://github.com/finos/legend-studio/commit/375a5e3479e865baf4dffb6d77cf4c7cf3de7ba2), [`375a5e3`](https://github.com/finos/legend-studio/commit/375a5e3479e865baf4dffb6d77cf4c7cf3de7ba2), [`65966ef`](https://github.com/finos/legend-studio/commit/65966ef8e6fa8152fcc5c39501fda9c62646aecc)]:
  - @finos/legend-studio@0.1.17
  - @finos/legend-studio-components@0.0.23
  - @finos/legend-studio-shared@0.0.19

## 0.0.19

### Patch Changes

- [#328](https://github.com/finos/legend-studio/pull/328) [`7ac0688`](https://github.com/finos/legend-studio/commit/7ac0688f99ba9328677eb71b5c811ab52bc3f371) Thanks [@akphi](https://github.com/akphi)! - Allow previewing data for mapped properties in explorer tree: for numeric fields, information such as `count`, `sum`, `average`, `max`, `min`, `standard deviation`, etc. are shown, whereas for non-numeric fields, we only show the top-10 most common values.

- Updated dependencies [[`7ac0688`](https://github.com/finos/legend-studio/commit/7ac0688f99ba9328677eb71b5c811ab52bc3f371), [`7ac0688`](https://github.com/finos/legend-studio/commit/7ac0688f99ba9328677eb71b5c811ab52bc3f371)]:
  - @finos/legend-studio@0.1.16
  - @finos/legend-studio-components@0.0.22
  - @finos/legend-studio-shared@0.0.18

## 0.0.18

### Patch Changes

- [#311](https://github.com/finos/legend-studio/pull/311) [`49b407f`](https://github.com/finos/legend-studio/commit/49b407fafe3f4eac3a012d1815167c40a8914cdc) Thanks [@akphi](https://github.com/akphi)! - **BREAKING CHANGE:** Rename `@finos/legend-studio-plugin-query-builder` to `@finos/legend-studio-preset-query-builder`. `SUPPORTED_FUNCTIONS` is no-longer exported from core, but is not part of query builder preset.

* [#314](https://github.com/finos/legend-studio/pull/314) [`88795fc`](https://github.com/finos/legend-studio/commit/88795fc5a36eea288b2b7ca8a659eec938aff31a) Thanks [@akphi](https://github.com/akphi)! - Support usage of `derivation` in projection mode. This gives user more flexibility when creating the column expression (as right now the only form we support is simple property expression), for example, now user can specify the following lambda `x|$x.lastName->toUpper() + ', ' + $x.firstName->toLower()` for a projection column :tada:. See https://github.com/finos/legend-studio/issues/254 for more details.

- [#311](https://github.com/finos/legend-studio/pull/311) [`49b407f`](https://github.com/finos/legend-studio/commit/49b407fafe3f4eac3a012d1815167c40a8914cdc) Thanks [@akphi](https://github.com/akphi)! - Support matching supported function when its full path is specified, e.g. both `startsWith('some_string')` and `meta::pure::functions::string::startsWith('some_string')` are now considered valid.

* [#314](https://github.com/finos/legend-studio/pull/314) [`88795fc`](https://github.com/finos/legend-studio/commit/88795fc5a36eea288b2b7ca8a659eec938aff31a) Thanks [@akphi](https://github.com/akphi)! - Support `compilation` in form mode, user now can click the hammer icon on the status bar or use the hotkey `F9` to run compilation on the current query. This is particularly helpful when user works with `derivation` (see https://github.com/finos/legend-studio/issues/254).

- [#314](https://github.com/finos/legend-studio/pull/314) [`88795fc`](https://github.com/finos/legend-studio/commit/88795fc5a36eea288b2b7ca8a659eec938aff31a) Thanks [@akphi](https://github.com/akphi)! - Add support for aggregation in projection mode using `groupBy()`: user now can use aggregate operators like `count()`, `distinct()`, `sum()`, `average()`, `min()`, `max()`, `stdDev()`, etc.. See https://github.com/finos/legend-studio/issues/253 for more details.

- Updated dependencies [[`49b407f`](https://github.com/finos/legend-studio/commit/49b407fafe3f4eac3a012d1815167c40a8914cdc), [`49b407f`](https://github.com/finos/legend-studio/commit/49b407fafe3f4eac3a012d1815167c40a8914cdc), [`7aaa969`](https://github.com/finos/legend-studio/commit/7aaa969a1f2eba8a3f20cddb89455b3087907502), [`7aaa969`](https://github.com/finos/legend-studio/commit/7aaa969a1f2eba8a3f20cddb89455b3087907502), [`547089b`](https://github.com/finos/legend-studio/commit/547089b71ec534be6d2362369748d08d63cd8243), [`7aaa969`](https://github.com/finos/legend-studio/commit/7aaa969a1f2eba8a3f20cddb89455b3087907502), [`7aaa969`](https://github.com/finos/legend-studio/commit/7aaa969a1f2eba8a3f20cddb89455b3087907502), [`88795fc`](https://github.com/finos/legend-studio/commit/88795fc5a36eea288b2b7ca8a659eec938aff31a), [`88795fc`](https://github.com/finos/legend-studio/commit/88795fc5a36eea288b2b7ca8a659eec938aff31a), [`88795fc`](https://github.com/finos/legend-studio/commit/88795fc5a36eea288b2b7ca8a659eec938aff31a), [`88795fc`](https://github.com/finos/legend-studio/commit/88795fc5a36eea288b2b7ca8a659eec938aff31a), [`7aaa969`](https://github.com/finos/legend-studio/commit/7aaa969a1f2eba8a3f20cddb89455b3087907502)]:
  - @finos/legend-studio@0.1.15
  - @finos/legend-studio-components@0.0.21
  - @finos/legend-studio-shared@0.0.17

## 0.0.17

### Patch Changes

- [#255](https://github.com/finos/legend-studio/pull/255) [`713405b`](https://github.com/finos/legend-studio/commit/713405bdbcbdbb4247d6885fd2d843a30d26d693) Thanks [@akphi](https://github.com/akphi)! - Support for `take()` function only for execution using `graphFetch()`, not actual result modifier. This is because we want make it clear that there are 2 distinct `take()` functions being used: `meta::pure::tds::take()` in projection query and `meta::pure::functions::collection::take()` in graph fetch query. The latter works on the collection of instances itself and therefore, not so useful, whereas the former actually affects execution performance.

* [#255](https://github.com/finos/legend-studio/pull/255) [`713405b`](https://github.com/finos/legend-studio/commit/713405bdbcbdbb4247d6885fd2d843a30d26d693) Thanks [@akphi](https://github.com/akphi)! - In query builder, we now allow adding all simple properties of the root class to the fetch structure (https://github.com/finos/legend-studio/issues/270).

- [#255](https://github.com/finos/legend-studio/pull/255) [`713405b`](https://github.com/finos/legend-studio/commit/713405bdbcbdbb4247d6885fd2d843a30d26d693) Thanks [@akphi](https://github.com/akphi)! - Relax the mapped property check for the explorer tree. When we encounter derived properties or mapped properties whose target set implementation is of type `OperationSetImplementation`, we will skip mappedness checking for the whole branch. The rationale here is that Studio would not try to analyze the mappedness of those complicated cases as Studio will never fully try to understand the lambdas (used in derived properties and operation class mappings). This way, the user can drilled down to these branches. The validation on execution will be handled by the engine. _NOTE: we can potentially show some indicator to let user know mappedness checking has been disabled for branch, but that is for future discussions._

* [#255](https://github.com/finos/legend-studio/pull/255) [`713405b`](https://github.com/finos/legend-studio/commit/713405bdbcbdbb4247d6885fd2d843a30d26d693) Thanks [@akphi](https://github.com/akphi)! - Do strict checks on parameters of supported function while processing lambda. With this, functions like `project()`, `distinct()`, `take()`, etc. must be placed in very specific order to be supported in form mode, otherwise, we will fallback to text-mode.

- [#255](https://github.com/finos/legend-studio/pull/255) [`713405b`](https://github.com/finos/legend-studio/commit/713405bdbcbdbb4247d6885fd2d843a30d26d693) Thanks [@akphi](https://github.com/akphi)! - Make sure user cannot access Studio editor global hotkey while working in query builder.

- Updated dependencies [[`713405b`](https://github.com/finos/legend-studio/commit/713405bdbcbdbb4247d6885fd2d843a30d26d693), [`f08d984`](https://github.com/finos/legend-studio/commit/f08d9845ace8dbbd54a8ab228ceb23b3bca1aca3), [`713405b`](https://github.com/finos/legend-studio/commit/713405bdbcbdbb4247d6885fd2d843a30d26d693), [`713405b`](https://github.com/finos/legend-studio/commit/713405bdbcbdbb4247d6885fd2d843a30d26d693), [`713405b`](https://github.com/finos/legend-studio/commit/713405bdbcbdbb4247d6885fd2d843a30d26d693)]:
  - @finos/legend-studio@0.1.14
  - @finos/legend-studio-components@0.0.20
  - @finos/legend-studio-shared@0.0.16

## 0.0.16

### Patch Changes

- [#241](https://github.com/finos/legend-studio/pull/241) [`76092dd`](https://github.com/finos/legend-studio/commit/76092dd5f6a31a30e18ca6e711c0f0f5a9e195ef) Thanks [@akphi](https://github.com/akphi)! - Rework mapping editor: mapping execution builder and test editor have been moved from the auxiliary panel to the screen of the mapping editor.

* [#252](https://github.com/finos/legend-studio/pull/252) [`cdc4c3c`](https://github.com/finos/legend-studio/commit/cdc4c3c92f9cc66a1304666429a721731c8466b0) Thanks [@akphi](https://github.com/akphi)! - Fix a bug where `take()` result set modifier is built into the graph fetch query during execution causing failure.

- [#248](https://github.com/finos/legend-studio/pull/248) [`a35e4d2`](https://github.com/finos/legend-studio/commit/a35e4d229e113c491ef51f9ad126ead98979a32f) Thanks [@akphi](https://github.com/akphi)! - Default to use `graphFetch` function instead of `graphFetchChecked` as the latter does not work out-of-the-box for relational mapping.

- Updated dependencies [[`cdc4c3c`](https://github.com/finos/legend-studio/commit/cdc4c3c92f9cc66a1304666429a721731c8466b0), [`ab15166`](https://github.com/finos/legend-studio/commit/ab15166f9f60a51d48e2c02b45a937f1dcb8f642), [`cdc4c3c`](https://github.com/finos/legend-studio/commit/cdc4c3c92f9cc66a1304666429a721731c8466b0), [`a35e4d2`](https://github.com/finos/legend-studio/commit/a35e4d229e113c491ef51f9ad126ead98979a32f), [`ab15166`](https://github.com/finos/legend-studio/commit/ab15166f9f60a51d48e2c02b45a937f1dcb8f642), [`76092dd`](https://github.com/finos/legend-studio/commit/76092dd5f6a31a30e18ca6e711c0f0f5a9e195ef), [`76092dd`](https://github.com/finos/legend-studio/commit/76092dd5f6a31a30e18ca6e711c0f0f5a9e195ef), [`ab15166`](https://github.com/finos/legend-studio/commit/ab15166f9f60a51d48e2c02b45a937f1dcb8f642), [`cdc4c3c`](https://github.com/finos/legend-studio/commit/cdc4c3c92f9cc66a1304666429a721731c8466b0), [`a35e4d2`](https://github.com/finos/legend-studio/commit/a35e4d229e113c491ef51f9ad126ead98979a32f), [`a35e4d2`](https://github.com/finos/legend-studio/commit/a35e4d229e113c491ef51f9ad126ead98979a32f)]:
  - @finos/legend-studio@0.1.13
  - @finos/legend-studio-components@0.0.19
  - @finos/legend-studio-shared@0.0.15

## 0.0.15

### Patch Changes

- [#237](https://github.com/finos/legend-studio/pull/237) [`f66159e`](https://github.com/finos/legend-studio/commit/f66159e21a66b1224061ac3da2f7ac3e3050e341) Thanks [@akphi](https://github.com/akphi)! - Rework graph-fetch tree editor: instead of showing the full tree and allow picking the properties using radio buttons, we let users drag-and-drop the properties from the explorer tree. This makes the behavior more in-synced with projection. See https://github.com/finos/legend-studio/issues/204 for more details.

* [#239](https://github.com/finos/legend-studio/pull/239) [`21e2a3f`](https://github.com/finos/legend-studio/commit/21e2a3fb4c1b950c492d17178a5f7380fd52dc66) Thanks [@akphi](https://github.com/akphi)! - Support `PackageableElementPtr` in response to [change in engine](https://github.com/finos/legend-engine/pull/255).

* Updated dependencies [[`f66159e`](https://github.com/finos/legend-studio/commit/f66159e21a66b1224061ac3da2f7ac3e3050e341), [`f66159e`](https://github.com/finos/legend-studio/commit/f66159e21a66b1224061ac3da2f7ac3e3050e341), [`21e2a3f`](https://github.com/finos/legend-studio/commit/21e2a3fb4c1b950c492d17178a5f7380fd52dc66), [`21e2a3f`](https://github.com/finos/legend-studio/commit/21e2a3fb4c1b950c492d17178a5f7380fd52dc66), [`f66159e`](https://github.com/finos/legend-studio/commit/f66159e21a66b1224061ac3da2f7ac3e3050e341), [`f66159e`](https://github.com/finos/legend-studio/commit/f66159e21a66b1224061ac3da2f7ac3e3050e341)]:
  - @finos/legend-studio@0.1.12
  - @finos/legend-studio-components@0.0.18

## 0.0.14

## 0.0.13

## 0.0.12

### Patch Changes

- Updated dependencies [[`df3f3b6`](https://github.com/finos/legend-studio/commit/df3f3b67aed33ad510711694e3a3f299927626a8), [`df3f3b6`](https://github.com/finos/legend-studio/commit/df3f3b67aed33ad510711694e3a3f299927626a8), [`df3f3b6`](https://github.com/finos/legend-studio/commit/df3f3b67aed33ad510711694e3a3f299927626a8), [`df3f3b6`](https://github.com/finos/legend-studio/commit/df3f3b67aed33ad510711694e3a3f299927626a8)]:
  - @finos/legend-studio@0.1.11
  - @finos/legend-studio-components@0.0.17
  - @finos/legend-studio-shared@0.0.14

## 0.0.11

### Patch Changes

- Updated dependencies [[`de511da`](https://github.com/finos/legend-studio/commit/de511daf935680ce1a61a2eb85d445c2d3c5dcba), [`8159c1f`](https://github.com/finos/legend-studio/commit/8159c1f02eafcd52fbbb3add7358afc718cf03d2), [`8159c1f`](https://github.com/finos/legend-studio/commit/8159c1f02eafcd52fbbb3add7358afc718cf03d2)]:
  - @finos/legend-studio@0.1.10
  - @finos/legend-studio-components@0.0.16
  - @finos/legend-studio-shared@0.0.13

## 0.0.10

### Patch Changes

- [#214](https://github.com/finos/legend-studio/pull/214) [`c90cfc6`](https://github.com/finos/legend-studio/commit/c90cfc6c1a1a69d97fba5336d0c1b7f9e0b63221) Thanks [@akphi](https://github.com/akphi)! - Remove `TEMPORARY__enableGraphFetch` flag and allow editing mapping execution query in query builder.

- Updated dependencies [[`c90cfc6`](https://github.com/finos/legend-studio/commit/c90cfc6c1a1a69d97fba5336d0c1b7f9e0b63221), [`16696ae`](https://github.com/finos/legend-studio/commit/16696ae2513806e8128cff6a4d50c364601f0275), [`c90cfc6`](https://github.com/finos/legend-studio/commit/c90cfc6c1a1a69d97fba5336d0c1b7f9e0b63221), [`c90cfc6`](https://github.com/finos/legend-studio/commit/c90cfc6c1a1a69d97fba5336d0c1b7f9e0b63221)]:
  - @finos/legend-studio@0.1.9
  - @finos/legend-studio-components@0.0.15
  - @finos/legend-studio-shared@0.0.12

## 0.0.9

### Patch Changes

- [#218](https://github.com/finos/legend-studio/pull/218) [`0bd1fd9`](https://github.com/finos/legend-studio/commit/0bd1fd96f9f4db85700df2cdf99fd6bc3bc0c524) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Add `V1_getExtraExecutionInputElements` to send additional elements as part of query execution call.

- Updated dependencies [[`0bd1fd9`](https://github.com/finos/legend-studio/commit/0bd1fd96f9f4db85700df2cdf99fd6bc3bc0c524)]:
  - @finos/legend-studio@0.1.8

## 0.0.8

### Patch Changes

- [#216](https://github.com/finos/legend-studio/pull/216) [`5c35ef1`](https://github.com/finos/legend-studio/commit/5c35ef132a1cf60a5a067895e68b54f4cb363c3a) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Use meta::legend::service::metamodel::Service for service classifierPath.

- Updated dependencies [[`5c35ef1`](https://github.com/finos/legend-studio/commit/5c35ef132a1cf60a5a067895e68b54f4cb363c3a)]:
  - @finos/legend-studio@0.1.7

## 0.0.7

### Patch Changes

- Updated dependencies [[`86cd535`](https://github.com/finos/legend-studio/commit/86cd535e1df97f722bcd69270e84d82a6d1ff6e1), [`86cd535`](https://github.com/finos/legend-studio/commit/86cd535e1df97f722bcd69270e84d82a6d1ff6e1), [`86cd535`](https://github.com/finos/legend-studio/commit/86cd535e1df97f722bcd69270e84d82a6d1ff6e1), [`86cd535`](https://github.com/finos/legend-studio/commit/86cd535e1df97f722bcd69270e84d82a6d1ff6e1)]:
  - @finos/legend-studio@0.1.6
  - @finos/legend-studio-components@0.0.14
  - @finos/legend-studio-shared@0.0.11

## 0.0.6

### Patch Changes

- Updated dependencies [[`6be621e`](https://github.com/finos/legend-studio/commit/6be621eb840ae2200ce791641475ee882dcbf33a), [`6be621e`](https://github.com/finos/legend-studio/commit/6be621eb840ae2200ce791641475ee882dcbf33a), [`b358e7f`](https://github.com/finos/legend-studio/commit/b358e7f212d90467b6536331b450f7234a970516), [`6be621e`](https://github.com/finos/legend-studio/commit/6be621eb840ae2200ce791641475ee882dcbf33a), [`6be621e`](https://github.com/finos/legend-studio/commit/6be621eb840ae2200ce791641475ee882dcbf33a)]:
  - @finos/legend-studio@0.1.5
  - @finos/legend-studio-shared@0.0.10
  - @finos/legend-studio-components@0.0.13

## 0.0.5

### Patch Changes

- Updated dependencies [[`0d8c766`](https://github.com/finos/legend-studio/commit/0d8c7660f3a70d75e7d6d5265bf894ddb7088d02), [`e6b0425`](https://github.com/finos/legend-studio/commit/e6b04259c33ee8563391fd6833cd337b83b77d44)]:
  - @finos/legend-studio@0.1.4

## 0.0.4

### Patch Changes

- [#199](https://github.com/finos/legend-studio/pull/199) [`2aab88e`](https://github.com/finos/legend-studio/commit/2aab88e797eec37760a646f7c6ee9d9f612d31cc) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Use meta::alloy::service::metamodel::Service for service classifierPath.

- Updated dependencies [[`2aab88e`](https://github.com/finos/legend-studio/commit/2aab88e797eec37760a646f7c6ee9d9f612d31cc), [`20b4e8f`](https://github.com/finos/legend-studio/commit/20b4e8f21d4c4abc1fd8ef06e826b9b8df883bc5), [`20b4e8f`](https://github.com/finos/legend-studio/commit/20b4e8f21d4c4abc1fd8ef06e826b9b8df883bc5)]:
  - @finos/legend-studio@0.1.3
  - @finos/legend-studio-components@0.0.12
  - @finos/legend-studio-shared@0.0.9

## 0.0.3

### Patch Changes

- [#187](https://github.com/finos/legend-studio/pull/187) [`cbccdc0`](https://github.com/finos/legend-studio/commit/cbccdc0fcb81cf873d50a9d41b04054a6efbf5fd) Thanks [@MauricioUyaguari](https://github.com/MauricioUyaguari)! - Use `meta::legend::service::metamodel::Service` for service classifierPath.

- Updated dependencies [[`1deb5ab`](https://github.com/finos/legend-studio/commit/1deb5ab5b398c5da55bc482695457804f8407be8), [`c4ef316`](https://github.com/finos/legend-studio/commit/c4ef3165b7d344e771e1bb741ddc48ed5786cb04), [`26568d0`](https://github.com/finos/legend-studio/commit/26568d03bd59f451bf60e175c796980af4be02f8), [`cf36a42`](https://github.com/finos/legend-studio/commit/cf36a42f658ac8bbab9a054010948b29707255d0), [`1ace102`](https://github.com/finos/legend-studio/commit/1ace102d50364645ec5d9efdbde2d4ca778f0544), [`80bd86a`](https://github.com/finos/legend-studio/commit/80bd86a5add9011f1ce7df33d700a1c1f28d5e08), [`38a25d3`](https://github.com/finos/legend-studio/commit/38a25d3973ae771097ebfc169a21e021c24a4179), [`cbccdc0`](https://github.com/finos/legend-studio/commit/cbccdc0fcb81cf873d50a9d41b04054a6efbf5fd), [`80bd86a`](https://github.com/finos/legend-studio/commit/80bd86a5add9011f1ce7df33d700a1c1f28d5e08), [`80bd86a`](https://github.com/finos/legend-studio/commit/80bd86a5add9011f1ce7df33d700a1c1f28d5e08), [`46a6c4a`](https://github.com/finos/legend-studio/commit/46a6c4a761e6a8b7f1291e574524fd85e7124b08), [`1ace102`](https://github.com/finos/legend-studio/commit/1ace102d50364645ec5d9efdbde2d4ca778f0544), [`1ace102`](https://github.com/finos/legend-studio/commit/1ace102d50364645ec5d9efdbde2d4ca778f0544), [`6705d7f`](https://github.com/finos/legend-studio/commit/6705d7f38982dcac70fb7a5586c1cd18d21a33e0)]:
  - @finos/legend-studio@0.1.2
  - @finos/legend-studio-components@0.0.11
  - @finos/legend-studio-shared@0.0.9

## 0.0.2

### Patch Changes

- [#176](https://github.com/finos/legend-studio/pull/176) [`6592e02`](https://github.com/finos/legend-studio/commit/6592e02f8a8b00d5150aabf6160d98dd20b5a80d) Thanks [@akphi](https://github.com/akphi)! - Fix the issue with the flag `TEMPORARY__enableGraphFetch` where this option is being ignored when query builder is closed and re-opened.

- Updated dependencies [[`2f0991a`](https://github.com/finos/legend-studio/commit/2f0991a15e50cb3c5ecbe3a4ca46c7ec26d09415), [`6592e02`](https://github.com/finos/legend-studio/commit/6592e02f8a8b00d5150aabf6160d98dd20b5a80d)]:
  - @finos/legend-studio@0.1.1
  - @finos/legend-studio-components@0.0.10
  - @finos/legend-studio-shared@0.0.8

## 0.0.1

### Patch Changes

- [#174](https://github.com/finos/legend-studio/pull/174) [`4167a8b`](https://github.com/finos/legend-studio/commit/4167a8b68766beab60b98d5b3a6b23fbbce4847b) Thanks [@akphi](https://github.com/akphi)! - Stabilize query builder MVP (see #174 for more details): This includes some minor UX improvements as well as support for:

  - Handling property with multiplicity many `[*]` in filter with `exists()`.
  - Properly handling group operations with more than 2 clauses.
  - Add support for set operators, such as `in/not-in`.

We also added a config flag to enable experimental graph-fetch mode:

```jsonc
  // config.json
  ...
  "options": {
    "@finos/legend-studio-preset-query-builder": {
      "TEMPORARY__enableGraphFetch": true
    }
  }
```

- [#166](https://github.com/finos/legend-studio/pull/166) [`913e90e`](https://github.com/finos/legend-studio/commit/913e90e3e30279debf3e0526e1ed5f3bf4cea19b) Thanks [@akphi](https://github.com/akphi)! - Introduce query builder plugin

- Updated dependencies [[`7709ab3`](https://github.com/finos/legend-studio/commit/7709ab3b2a3e66a5d44864e1ce694e696dddba69), [`b04b0f9`](https://github.com/finos/legend-studio/commit/b04b0f9abbecf886d0c864a8484717bf26ff22dc), [`2d1f8a7`](https://github.com/finos/legend-studio/commit/2d1f8a78c38121e96b745939b23ba5cc46c7a53c), [`4167a8b`](https://github.com/finos/legend-studio/commit/4167a8b68766beab60b98d5b3a6b23fbbce4847b), [`e9c97c4`](https://github.com/finos/legend-studio/commit/e9c97c41b18d79d2676e48e12ae4e92d528b1819)]:
  - @finos/legend-studio@0.1.0
  - @finos/legend-studio-components@0.0.9
  - @finos/legend-studio-shared@0.0.7
