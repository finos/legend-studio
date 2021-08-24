# @finos/legend-shared

## 0.0.1

### Patch Changes

- [#410](https://github.com/finos/legend-studio/pull/410) [`a1dfc165`](https://github.com/finos/legend-studio/commit/a1dfc165dcf98eeea624400abc9f3c97eb2fda52) Thanks [@akphi](https://github.com/akphi)! - Improve error message in URL builder for case where base URL is not specified and a non-absolute URL is provided.

- [#410](https://github.com/finos/legend-studio/pull/410) [`a1dfc165`](https://github.com/finos/legend-studio/commit/a1dfc165dcf98eeea624400abc9f3c97eb2fda52) Thanks [@akphi](https://github.com/akphi)! - Make `Logger` requires `LogEvent` instead of log event name as the first argument. This will make logger implementation more extensible as we can support features like `channel`, `timestamp`, etc.

- [#422](https://github.com/finos/legend-studio/pull/422) [`985eef5d`](https://github.com/finos/legend-studio/commit/985eef5def2e4c115ba2ac25dbb851e084758ddc) Thanks [@akphi](https://github.com/akphi)! - `Randomizer` now exports a class instead of a collection of functions.

- [#422](https://github.com/finos/legend-studio/pull/422) [`985eef5d`](https://github.com/finos/legend-studio/commit/985eef5def2e4c115ba2ac25dbb851e084758ddc) Thanks [@akphi](https://github.com/akphi)! - Rename package from `@finos/legend-studio-shared` to `@finos/legend-shared`.

- [#418](https://github.com/finos/legend-studio/pull/418) [`bb8cd369`](https://github.com/finos/legend-studio/commit/bb8cd369da33fe58523d8eddf6bb0991da72edf1) Thanks [@akphi](https://github.com/akphi)! - Document the auto re-authentication feature using `<iframe>` in `AbstractServerClient`. Due to its situational usage, we realise that we should also rename the config for it.

  Merge `@finos/legend-studio-network` into `@finos/legend-shared`.
