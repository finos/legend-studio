# @finos/legend-studio-preset-query-builder

## 0.0.43

## 0.0.42

## 0.0.41

## 0.0.40

## 0.0.39

## 0.0.38

## 0.0.37

## 0.0.36

## 0.0.35

## 0.0.34

## 0.0.33

### Patch Changes

- [#409](https://github.com/finos/legend-studio/pull/409) [`034e34d`](https://github.com/finos/legend-studio/commit/034e34d9ea9fa1fc17db71e26c22e16bee3c5e82) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Show mapped association properties in query builder (fixes [#406](https://github.com/finos/legend-studio/issues/406)).

* [#409](https://github.com/finos/legend-studio/pull/409) [`034e34d`](https://github.com/finos/legend-studio/commit/034e34d9ea9fa1fc17db71e26c22e16bee3c5e82) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Show auto mapped properties in query builder (fixes [#387](https://github.com/finos/legend-studio/issues/387)).

## 0.0.32

## 0.0.31

### Patch Changes

- [#400](https://github.com/finos/legend-studio/pull/400) [`8303f1b`](https://github.com/finos/legend-studio/commit/8303f1bdfed2d46bd0425b45d727a9b203cec229) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Fetch dependency entities in Legend Query.

## 0.0.30

### Patch Changes

- [#396](https://github.com/finos/legend-studio/pull/396) [`44748ea`](https://github.com/finos/legend-studio/commit/44748eaaee6062211d5607109fd0834d92f6cc91) ([@akphi](https://github.com/akphi)) - Avoid initializing application store in Query, as it will try to authenticate against SDLC.

## 0.0.29

### Patch Changes

- [#390](https://github.com/finos/legend-studio/pull/390) [`bbba2e3`](https://github.com/finos/legend-studio/commit/bbba2e34487c32a4bd41033d485fc8dbf22d32fb) ([@akphi](https://github.com/akphi)) - Support loading existing queries and service query in standalone query editor.

* [#390](https://github.com/finos/legend-studio/pull/390) [`bbba2e3`](https://github.com/finos/legend-studio/commit/bbba2e34487c32a4bd41033d485fc8dbf22d32fb) ([@akphi](https://github.com/akphi)) - Improve the UX of Legend Query. Use metadata server instead of SDLC server for fetching projects and entities.

## 0.0.28

## 0.0.27

## 0.0.26

## 0.0.25

## 0.0.24

## 0.0.23

## 0.0.22

## 0.0.21

## 0.0.20

### Patch Changes

- [#332](https://github.com/finos/legend-studio/pull/332) [`375a5e3`](https://github.com/finos/legend-studio/commit/375a5e3479e865baf4dffb6d77cf4c7cf3de7ba2) ([@akphi](https://github.com/akphi)) - Fix a bug where after an execution, a newly added projection column is always shown as the last column in result panel regardless of its type (with or without aggregation).

## 0.0.19

### Patch Changes

- [#328](https://github.com/finos/legend-studio/pull/328) [`7ac0688`](https://github.com/finos/legend-studio/commit/7ac0688f99ba9328677eb71b5c811ab52bc3f371) ([@akphi](https://github.com/akphi)) - Allow previewing data for mapped properties in explorer tree: for numeric fields, information such as `count`, `sum`, `average`, `max`, `min`, `standard deviation`, etc. are shown, whereas for non-numeric fields, we only show the top-10 most common values.

## 0.0.18

### Patch Changes

- [#311](https://github.com/finos/legend-studio/pull/311) [`49b407f`](https://github.com/finos/legend-studio/commit/49b407fafe3f4eac3a012d1815167c40a8914cdc) ([@akphi](https://github.com/akphi)) - **BREAKING CHANGE:** Rename `@finos/legend-studio-plugin-query-builder` to `@finos/legend-studio-preset-query-builder`. `SUPPORTED_FUNCTIONS` is no-longer exported from core, but is not part of query builder preset.

* [#314](https://github.com/finos/legend-studio/pull/314) [`88795fc`](https://github.com/finos/legend-studio/commit/88795fc5a36eea288b2b7ca8a659eec938aff31a) ([@akphi](https://github.com/akphi)) - Support usage of `derivation` in projection mode. This gives user more flexibility when creating the column expression (as right now the only form we support is simple property expression), for example, now user can specify the following lambda `x|$x.lastName->toUpper() + ', ' + $x.firstName->toLower()` for a projection column :tada:. See [#254](https://github.com/finos/legend-studio/issues/254) for more details.

- [#311](https://github.com/finos/legend-studio/pull/311) [`49b407f`](https://github.com/finos/legend-studio/commit/49b407fafe3f4eac3a012d1815167c40a8914cdc) ([@akphi](https://github.com/akphi)) - Support matching supported function when its full path is specified, e.g. both `startsWith('some_string')` and `meta::pure::functions::string::startsWith('some_string')` are now considered valid.

* [#314](https://github.com/finos/legend-studio/pull/314) [`88795fc`](https://github.com/finos/legend-studio/commit/88795fc5a36eea288b2b7ca8a659eec938aff31a) ([@akphi](https://github.com/akphi)) - Support `compilation` in form mode, user now can click the hammer icon on the status bar or use the hotkey `F9` to run compilation on the current query. This is particularly helpful when user works with `derivation` (see [#254](https://github.com/finos/legend-studio/issues/254)).

- [#314](https://github.com/finos/legend-studio/pull/314) [`88795fc`](https://github.com/finos/legend-studio/commit/88795fc5a36eea288b2b7ca8a659eec938aff31a) ([@akphi](https://github.com/akphi)) - Add support for aggregation in projection mode using `groupBy()`: user now can use aggregate operators like `count()`, `distinct()`, `sum()`, `average()`, `min()`, `max()`, `stdDev()`, etc.. See [#253](https://github.com/finos/legend-studio/issues/253) for more details.

## 0.0.17

### Patch Changes

- [#255](https://github.com/finos/legend-studio/pull/255) [`713405b`](https://github.com/finos/legend-studio/commit/713405bdbcbdbb4247d6885fd2d843a30d26d693) ([@akphi](https://github.com/akphi)) - Support for `take()` function only for execution using `graphFetch()`, not actual result modifier. This is because we want make it clear that there are 2 distinct `take()` functions being used: `meta::pure::tds::take()` in projection query and `meta::pure::functions::collection::take()` in graph fetch query. The latter works on the collection of instances itself and therefore, not so useful, whereas the former actually affects execution performance.

* [#255](https://github.com/finos/legend-studio/pull/255) [`713405b`](https://github.com/finos/legend-studio/commit/713405bdbcbdbb4247d6885fd2d843a30d26d693) ([@akphi](https://github.com/akphi)) - In query builder, we now allow adding all simple properties of the root class to the fetch structure (https://github.com/finos/legend-studio/issues/270).

- [#255](https://github.com/finos/legend-studio/pull/255) [`713405b`](https://github.com/finos/legend-studio/commit/713405bdbcbdbb4247d6885fd2d843a30d26d693) ([@akphi](https://github.com/akphi)) - Relax the mapped property check for the explorer tree. When we encounter derived properties or mapped properties whose target set implementation is of type `OperationSetImplementation`, we will skip mappedness checking for the whole branch. The rationale here is that Studio would not try to analyze the mappedness of those complicated cases as Studio will never fully try to understand the lambdas (used in derived properties and operation class mappings). This way, the user can drilled down to these branches. The validation on execution will be handled by the engine. _NOTE: we can potentially show some indicator to let user know mappedness checking has been disabled for branch, but that is for future discussions._

* [#255](https://github.com/finos/legend-studio/pull/255) [`713405b`](https://github.com/finos/legend-studio/commit/713405bdbcbdbb4247d6885fd2d843a30d26d693) ([@akphi](https://github.com/akphi)) - Do strict checks on parameters of supported function while processing lambda. With this, functions like `project()`, `distinct()`, `take()`, etc. must be placed in very specific order to be supported in form mode, otherwise, we will fallback to text-mode.

- [#255](https://github.com/finos/legend-studio/pull/255) [`713405b`](https://github.com/finos/legend-studio/commit/713405bdbcbdbb4247d6885fd2d843a30d26d693) ([@akphi](https://github.com/akphi)) - Make sure user cannot access Studio editor global hotkey while working in query builder.

## 0.0.16

### Patch Changes

- [#241](https://github.com/finos/legend-studio/pull/241) [`76092dd`](https://github.com/finos/legend-studio/commit/76092dd5f6a31a30e18ca6e711c0f0f5a9e195ef) ([@akphi](https://github.com/akphi)) - Rework mapping editor: mapping execution builder and test editor have been moved from the auxiliary panel to the screen of the mapping editor.

* [#252](https://github.com/finos/legend-studio/pull/252) [`cdc4c3c`](https://github.com/finos/legend-studio/commit/cdc4c3c92f9cc66a1304666429a721731c8466b0) ([@akphi](https://github.com/akphi)) - Fix a bug where `take()` result set modifier is built into the graph fetch query during execution causing failure.

- [#248](https://github.com/finos/legend-studio/pull/248) [`a35e4d2`](https://github.com/finos/legend-studio/commit/a35e4d229e113c491ef51f9ad126ead98979a32f) ([@akphi](https://github.com/akphi)) - Default to use `graphFetch` function instead of `graphFetchChecked` as the latter does not work out-of-the-box for relational mapping.

## 0.0.15

### Patch Changes

- [#237](https://github.com/finos/legend-studio/pull/237) [`f66159e`](https://github.com/finos/legend-studio/commit/f66159e21a66b1224061ac3da2f7ac3e3050e341) ([@akphi](https://github.com/akphi)) - Rework graph-fetch tree editor: instead of showing the full tree and allow picking the properties using radio buttons, we let users drag-and-drop the properties from the explorer tree. This makes the behavior more in-synced with projection. See [#204](https://github.com/finos/legend-studio/issues/204) for more details.

* [#239](https://github.com/finos/legend-studio/pull/239) [`21e2a3f`](https://github.com/finos/legend-studio/commit/21e2a3fb4c1b950c492d17178a5f7380fd52dc66) ([@akphi](https://github.com/akphi)) - Support `PackageableElementPtr` in response to [change in engine](https://github.com/finos/legend-engine/pull/255).

## 0.0.14

## 0.0.13

## 0.0.12

## 0.0.11

## 0.0.10

### Patch Changes

- [#214](https://github.com/finos/legend-studio/pull/214) [`c90cfc6`](https://github.com/finos/legend-studio/commit/c90cfc6c1a1a69d97fba5336d0c1b7f9e0b63221) ([@akphi](https://github.com/akphi)) - Remove `TEMPORARY__enableGraphFetch` flag and allow editing mapping execution query in query builder.

## 0.0.9

### Patch Changes

- [#218](https://github.com/finos/legend-studio/pull/218) [`0bd1fd9`](https://github.com/finos/legend-studio/commit/0bd1fd96f9f4db85700df2cdf99fd6bc3bc0c524) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Add `V1_getExtraExecutionInputElements` to send additional elements as part of query execution call.

## 0.0.8

### Patch Changes

- [#216](https://github.com/finos/legend-studio/pull/216) [`5c35ef1`](https://github.com/finos/legend-studio/commit/5c35ef132a1cf60a5a067895e68b54f4cb363c3a) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Use meta::legend::service::metamodel::Service for service classifierPath.

## 0.0.7

## 0.0.6

## 0.0.5

## 0.0.4

### Patch Changes

- [#199](https://github.com/finos/legend-studio/pull/199) [`2aab88e`](https://github.com/finos/legend-studio/commit/2aab88e797eec37760a646f7c6ee9d9f612d31cc) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Use meta::alloy::service::metamodel::Service for service classifierPath.

## 0.0.3

### Patch Changes

- [#187](https://github.com/finos/legend-studio/pull/187) [`cbccdc0`](https://github.com/finos/legend-studio/commit/cbccdc0fcb81cf873d50a9d41b04054a6efbf5fd) ([@MauricioUyaguari](https://github.com/MauricioUyaguari)) - Use `meta::legend::service::metamodel::Service` for service classifierPath.

## 0.0.2

### Patch Changes

- [#176](https://github.com/finos/legend-studio/pull/176) [`6592e02`](https://github.com/finos/legend-studio/commit/6592e02f8a8b00d5150aabf6160d98dd20b5a80d) ([@akphi](https://github.com/akphi)) - Fix the issue with the flag `TEMPORARY__enableGraphFetch` where this option is being ignored when query builder is closed and re-opened.

## 0.0.1

### Patch Changes

- [#174](https://github.com/finos/legend-studio/pull/174) [`4167a8b`](https://github.com/finos/legend-studio/commit/4167a8b68766beab60b98d5b3a6b23fbbce4847b) ([@akphi](https://github.com/akphi)) - Stabilize query builder MVP (see #174 for more details): This includes some minor UX improvements as well as support for:

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

- [#166](https://github.com/finos/legend-studio/pull/166) [`913e90e`](https://github.com/finos/legend-studio/commit/913e90e3e30279debf3e0526e1ed5f3bf4cea19b) ([@akphi](https://github.com/akphi)) - Introduce query builder plugin
