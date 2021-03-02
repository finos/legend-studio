/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const path = require('path');
const chalk = require('chalk');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const { babel } = require('@rollup/plugin-babel');
const visualizer = require('rollup-plugin-visualizer');
const { terser } = require('rollup-plugin-terser');
const json = require('@rollup/plugin-json');
const eslint = require('@rollup/plugin-eslint');
const commonjs = require('@rollup/plugin-commonjs');
const replace = require('@rollup/plugin-replace');
const alias = require('@rollup/plugin-alias');
const { resolveFullTsConfig } = require('./TypescriptConfigUtils');

const extensions = ['.tsx', '.ts', '.mjs', '.js'];

const getLibraryModuleRollupConfig = ({
  input,
  outputDir,
  buildDir,
  packageJsonPath,
  tsConfigPath,
  babelConfigPath,
  copyrightText,
  /**
   * Entries for `@rollup/plugin-replace`
   * See https://github.com/rollup/plugins/tree/master/packages/replace#usage
   */
  replaceEntries = [],
  /**
   * Entries for `@rollup/plugin-alias`
   * See https://github.com/rollup/plugins/tree/master/packages/alias#usage
   */
  aliasEntries = [],
  /**
   * Flag indicating whether the bundling is targetting browser environment
   */
  browser = false,
  /**
   * By default, `external` will include all dependencies found in `package.json`
   * but you can fine-tune it by including additional dependencies (i.e. good when
   * you need to spcify regular expression patterns) or excluding dependencies from
   * the list of external dependencies.
   */
  additionalExternals = [],
  excludeExternals = [],
}) => {
  const isEnvDevelopment = process.env.NODE_ENV === 'development';
  const isEnvProduction = process.env.NODE_ENV === 'production';
  const isEnvProduction_Analyze = process.env.BUILD_MODE === 'analyze';
  const isEnvDevelopment_Fast = process.env.DEVELOPMENT_MODE === 'fast';
  const packageJson = require(packageJsonPath);

  const nodeResolver = nodeResolve({
    extensions,
    /**
     * NOTE: If `true`, this instructs the plugin to use the `browser` property in package.json
     * files to specify alternative files to load for bundling.
     *
     * An example for this is `uuid` library, as it exports 2 bundles targetting Node and browser
     * respectively. So without setting this, we might end up picking the Node.js implementation
     * which requires things like `crypto`.
     * See https://github.com/uuidjs/uuid/blob/master/package.json#L33-L37
     *
     * For this reason, it's important to specify this flag. However, there are 2 concerns here:
     * 1. If the package uses package entrypoints (i.e. `exports` field in package.json)
     *    setting `browser` like this simply does not work.
     *    See https://nodejs.org/api/packages.html#packages_package_entry_points
     * 2. If one of our packages need to export a bundle that targets Node.js, we also need to
     *    consider how we want to present our `package.json`. This topic is complicated.
     *    And different bundling tools seem to have different takes. So tread carefully here!
     *    See https://github.com/rollup/plugins/pull/540
     *
     * See https://github.com/rollup/plugins/tree/master/packages/node-resolve#browser
     */
    browser,
    /**
     * If the browser environment is detected, automatically prefer local dependencies over Node builtins like `fs` or `os`
     * See https://github.com/rollup/plugins/tree/master/packages/node-resolve/#preferbuiltins
     */
    preferBuiltins: !browser,
  });

  const config = {
    input,
    output: [
      {
        /**
         * NOTE: we export CommonJS bundle only for testing since `Jest` support for ESM is currently quite limited
         * TODO: remove this once we upgrade to `Jest@27`
         * See https://github.com/facebook/jest/issues/9430
         *
         * NOTE: We use `@babel/runtime` and there seems to be a problem with CJS bundle
         * where if we mark a module as external, the bundle it chooses by default to put in the CJS output
         * file is ESM. However, since this is only used for Jest, we can update Jest `moduleNameMapper` to
         * account for this.
         * See https://github.com/wessberg/rollup-plugin-ts/issues/15#issuecomment-482307768
         */
        file: packageJson.main,
        format: 'cjs',
        sourcemap: !isEnvDevelopment,
        banner: copyrightText,
      },
      {
        file: packageJson.module,
        format: 'es',
        sourcemap: !isEnvDevelopment,
        banner: copyrightText,
      },
    ],
    // Make all dependencies optional by default
    external: Object.keys(packageJson.dependencies || {})
      .filter((dep) => !excludeExternals.includes(dep))
      .concat([
        // Since we use `babelHelpers=runtime` for `@rollup/plugin-babel`,
        // it's recommended to add `@babel/runtime` as an `external`
        // See https://github.com/rollup/plugins/tree/master/packages/babel#babelhelpers
        /^@babel\/runtime/,
        ...additionalExternals,
      ]),
    watch: {
      clearScreen: false,
    },
    plugins: [
      /**
       * `@rollup/plugin-eslint` has to be placed before `@rollup/plugin-babel`
       * to lint source code (pre transpile)
       *
       * Just like `webpack` test files are not included from the entry point
       * so they will scanned during compilation, hence no need to ignore them.
       *
       * Also, note that `rollup --watch` is incremental, so new only changed
       * files are passed through `eslint` plugin again, this means that
       * warnings/errors for unchanged files will not show up in the dev console
       * even though they still remain after the change.
       */
      isEnvDevelopment &&
        !isEnvDevelopment_Fast &&
        eslint({
          include: 'src/**/*.{ts,tsx}',
          parserOptions: {
            project: tsConfigPath,
          },
        }),
      /**
       * `@rollup/plugin-alias` allows defining aliases when bundling packages.
       * This has a few limitations though:
       * 1. It does not support array of values for replacement like other tools (Typescript, Webpack, Babel, Jest)
       *    See https://github.com/rollup/plugins/issues/754
       *    If this is needed, we might need to use `babel-plugin-module-resolver`.
       * 2. It requires a custom resolver to handle extensions
       */
      aliasEntries.length > 0 &&
        alias({
          entries: aliasEntries,
          // We need custom resolver so we can omit the extensions
          // but to use this each replacement we provide need to be absolute path
          // See https://www.npmjs.com/package/@rollup/plugin-alias#custom-resolvers
          customResolver: nodeResolver,
        }),
      /**
       * `@rollup/plugin-node-resolve` locates modules using the Node resolution algorithm,
       * for when third party modules in `node_modules` are referred to in the code
       */
      nodeResolver,
      json(),
      babel({
        // Avoid bundling `babel` helpers
        // See https://github.com/rollup/plugins/tree/master/packages/babel#babelhelpers
        babelHelpers: 'runtime',
        exclude: /node_modules/,
        configFile: babelConfigPath,
        extensions,
        sourceMaps: !isEnvDevelopment,
        inputSourceMap: !isEnvDevelopment,
      }),
      /**
       * `@rollup/plugin-commonjs` converts CommonJS modules/dependencies to ES6,
       * so they can be included in a Rollup bundle.
       */
      commonjs({
        // Make sure this only apply to code in `node_modules` instead of code in our codebase which is symlinked by `yarn-workspace`
        include: /node_modules/, // See https://github.com/rollup/plugins/tree/master/packages/commonjs#usage-with-symlinks
        sourceMap: !isEnvDevelopment,
      }),
      /**
       * `@rollup/plugin-replace` replaces strings in files while bundling.
       * We use this to replace places in the code where we use
       * `process.env.NODE_ENV` for code logic
       */
      replace({
        ...replaceEntries,
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      }),
      /**
       * `rollup-plugin-visualizer` creates analysis on bundle size
       * See https://github.com/btd/rollup-plugin-visualizer
       */
      isEnvProduction_Analyze &&
        visualizer({
          filename: buildDir
            ? path.resolve(buildDir, '/bundle-analysis.html')
            : undefined,
          open: true,
        }),
      isEnvProduction && terser(),
    ].filter(Boolean),
  };

  return config;
};

/**
 * See the note on `@rollup/plugin-alias` limitations.
 * It does not support array of paths like Typescript.
 *
 * If this is the case, we need to add the paths to `excludedPaths`
 * and handle this separately using some plugins like
 * `babel-plugin-module-resolver`. However, this is a _very_ rare case though.
 */
const buildAliasEntriesFromTsConfigPathMapping = ({
  dirname,
  tsConfigPath,
  excludePaths = [],
}) => {
  if (!dirname) {
    throw new Error(`\`dirname\` is required to build Rollup alias entries`);
  }
  let hasArrayValuePath = false;
  const tsConfig = resolveFullTsConfig(tsConfigPath);
  const paths = tsConfig?.compilerOptions?.paths;
  const baseUrl = tsConfig?.compilerOptions?.baseUrl;
  const basePath = baseUrl ? path.resolve(dirname, baseUrl) : dirname;
  if (paths) {
    const aliases = [];
    Object.entries(paths).forEach(([key, value]) => {
      if (excludePaths.includes(key)) {
        return;
      }
      const regexp = `^${key.replace('*', '(.*)').replace('/', '\\/')}$`;
      let replacement;
      if (Array.isArray(value)) {
        if (value.length > 1) {
          hasArrayValuePath = true;
        }
        // default to use the first element of the array when multiple mappings are found
        replacement = value.length === 0 ? undefined : value[0];
      } else {
        replacement = value;
      }
      if (replacement) {
        replacement = replacement.replace('*', '$1');
        aliases.push({
          find: new RegExp(regexp),
          replacement: path.resolve(basePath, replacement),
        });
      }
    });
    if (hasArrayValuePath) {
      console.log(
        chalk.yellow(
          '[!] Typescript path-mapping contains array value which is not supported by `@rollup/plugin-alias`, by default the first value of the array is used.\n' +
            'Consider using other alternative, such as `babel-plugin-module-resolver`',
        ),
      );
    }
    return aliases;
  }
  return [];
};

module.exports = {
  getLibraryModuleRollupConfig,
  buildAliasEntriesFromTsConfigPathMapping,
};
