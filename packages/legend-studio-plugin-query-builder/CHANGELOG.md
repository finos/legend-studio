# @finos/legend-studio-plugin-query-builder

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
    "@finos/legend-studio-plugin-query-builder": {
      "TEMPORARY__enableGraphFetch": true
    }
  }
```

- [#166](https://github.com/finos/legend-studio/pull/166) [`913e90e`](https://github.com/finos/legend-studio/commit/913e90e3e30279debf3e0526e1ed5f3bf4cea19b) Thanks [@akphi](https://github.com/akphi)! - Introduce query builder plugin

- Updated dependencies [[`7709ab3`](https://github.com/finos/legend-studio/commit/7709ab3b2a3e66a5d44864e1ce694e696dddba69), [`b04b0f9`](https://github.com/finos/legend-studio/commit/b04b0f9abbecf886d0c864a8484717bf26ff22dc), [`2d1f8a7`](https://github.com/finos/legend-studio/commit/2d1f8a78c38121e96b745939b23ba5cc46c7a53c), [`4167a8b`](https://github.com/finos/legend-studio/commit/4167a8b68766beab60b98d5b3a6b23fbbce4847b), [`e9c97c4`](https://github.com/finos/legend-studio/commit/e9c97c41b18d79d2676e48e12ae4e92d528b1819)]:
  - @finos/legend-studio@0.1.0
  - @finos/legend-studio-components@0.0.9
  - @finos/legend-studio-shared@0.0.7
