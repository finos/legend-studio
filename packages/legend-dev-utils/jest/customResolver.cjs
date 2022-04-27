// NOTE: when we tried to use `export default`, Jest complains that `require()
// of ES Module ... from .../node_modules/jest-resolve/build/resolver.js not supported`
// This is mostly likely due to `jest-resolve` itself still uses `require()`
// as such, the current workaround right now is to leave this resolver in CJS
module.exports = (path, options) =>
  // See https://jestjs.io/docs/configuration#resolver-string
  options.defaultResolver(path, {
    ...options,
    // Use packageFilter to process parsed `package.json` before the resolution
    // see https://www.npmjs.com/package/resolve#resolveid-opts-cb
    packageFilter: (pkg) => {
      // This is a workaround for https://github.com/uuidjs/uuid/pull/616
      // When `uuid` and `jest-resolve` play nice together, we can remove this
      //
      // jest-environment-jsdom@28+ tries to use browser exports instead of default exports,
      // but uuid only offers an ESM browser export and not a CommonJS one. Jest does not yet
      // support ESM modules natively, so this causes a Jest error related to trying to parse
      // "export" syntax.
      //
      // This workaround prevents Jest from considering uuid's module-based exports at all;
      // it falls back to uuid's CommonJS and "main" field in package.json
      //
      // See https://github.com/uuidjs/uuid/pull/616#issuecomment-1110380182
      if (pkg.name === 'uuid') {
        delete pkg.exports;
        delete pkg.module;
      }
      return pkg;
    },
  });
