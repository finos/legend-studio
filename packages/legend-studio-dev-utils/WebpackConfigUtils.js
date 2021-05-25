/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import sass from 'sass';
import { resolve, join } from 'path';
import { existsSync } from 'fs';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import MonacoWebpackPlugin from 'monaco-editor-webpack-plugin';
import CircularDependencyPlugin from 'circular-dependency-plugin';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import { resolveFullTsConfig } from './TypescriptConfigUtils.js';
import ForkTsCheckerWebpackPlugin from './ForkTsCheckerWebpackPlugin.js';
import ForkTsCheckerWebpackFormatterPlugin from './ForkTsCheckerWebpackFormatterPlugin.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export const getEnvInfo = (env, arg) => ({
  isEnvDevelopment: arg.mode === 'development',
  isEnvProduction: arg.mode === 'production',
  isEnvDevelopment_Advanced: process.env.DEVELOPMENT_MODE === 'advanced',
});

/**
 * This method gets the base Webpack config for bundling either top-level
 * webapp with HTML entry points or library.
 */
const getBaseWebpackConfig = (
  env,
  arg,
  dirname,
  { babelConfigPath, extraBabelLoaderIncludePatterns },
) => {
  if (!dirname) {
    throw new Error(`\`dirname\` is required to build Webpack config`);
  }
  const { isEnvDevelopment, isEnvProduction, isEnvDevelopment_Advanced } =
    getEnvInfo(env, arg);

  const config = {
    mode: arg.mode,
    bail: isEnvProduction, // fail-fast in production build
    output: {
      // Turn off `output.pathinfo` by default to enhance build performance.
      // See https://webpack.js.org/guides/build-performance/#output-without-path-info
      // NOTE: for debugging, this flag is quite useful as it gives information about the bundle, tree-shaking, bailouts, etc.
      // See https://webpack.js.org/configuration/output/#outputpathinfo
      pathinfo: isEnvDevelopment_Advanced,
    },
    devtool: isEnvDevelopment
      ? // NOTE: `eval-cheap-module-source-map` is recommend for dev, but it doesn't report error location accurately
        // See https://github.com/vuejs-templates/webpack/issues/520#issuecomment-356773702
        'cheap-module-source-map'
      : 'source-map',
    watchOptions: {
      ignored: /node_modules/,
    },
    infrastructureLogging: {
      // Only warnings and errors
      // See https://webpack.js.org/configuration/other-options/#infrastructurelogginglevel
      level: 'info',
    },
    stats: {
      // Make `webpack-dev-middleware` less verbose, consider `quiet` and `noInfo` options as well
      // NOTE: Use custom reporter to output errors and warnings from TS fork checker in `stylish` format. It's less verbose and
      // repetitive. Since we use the custom plugin, we want to mute `errors` and `warnings` from `webpack-dev-middleware`
      // See https://github.com/webpack-contrib/webpack-stylish
      // See https://github.com/TypeStrong/fork-ts-checker-webpack-plugin/issues/119
      all: false,
      errors: isEnvProduction,
      warnings: isEnvProduction,
      logging: 'warn',
      colors: true,
      timings: true,
    },
    resolve: {
      // These extensions are used to generate all the possible paths (in order) to the module
      // so we don't need to specify extensions (e.g. `import * from 'src/module1'` -> src/modules1.ts);
      // NOTE: `mjs` takes precedence over `js` in case a dependency module supports tree-shaking with ESM bundle
      extensions: ['.tsx', '.ts', '.mjs', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.(?:mjs|js|ts|tsx)$/,
          resolve: {
            // Since we use ES modules, the import path must be fully specified. But this is not something Typescript
            // support, so the workaround is to not require extension in import path.
            // See https://github.com/webpack/webpack/issues/11467
            // See https://github.com/microsoft/TypeScript/issues/16577
            fullySpecified: false,
          },
          // NOTE: we don't need to specify the `exclude` part for this
          // loader as we already specify the include list instead.
          //
          // Since we don't transpile these modules, when consuming
          // these in the top-level module (by bundlers like Webpack),
          // we need to do so here.
          include: [
            // The source code of the current workspace
            resolve(dirname, './src/'),
            // Packages from the same monorepo
            /legend-studio/,
            // Packages coming from NPM published under '@finos' scope
            /@finos\/legend-studio/,
            ...extraBabelLoaderIncludePatterns,
          ],
          use: [
            {
              loader: require.resolve('babel-loader'),
              options: {
                cacheDirectory: true,
                configFile: babelConfigPath,
              },
            },
          ],
        },
        {
          test: /\.s?css$/,
          use: [
            {
              loader: MiniCssExtractPlugin.loader,
            },
            {
              // Helps resolve @import and url() like import/require()
              loader: require.resolve('css-loader'),
              options: {
                sourceMap: isEnvProduction,
              },
            },
            isEnvProduction && {
              // Loads and transforms a CSS/SSS file using PostCSS
              loader: require.resolve('postcss-loader'),
              options: {
                postcssOptions: {
                  plugins: [
                    require.resolve('autoprefixer'), // adding vendor prefixes
                    require.resolve('cssnano'), // minification
                  ].filter(Boolean),
                },
                sourceMap: true,
              },
            },
            {
              loader: require.resolve('sass-loader'),
              options: {
                implementation: sass,
                sourceMap: isEnvProduction,
              },
            },
          ].filter(Boolean),
        },
        {
          test: /\.(?:woff2?|ttf|otf|eot|svg|png|gif)$/,
          type: 'asset/resource',
        },
      ],
    },
    optimization: isEnvDevelopment
      ? {
          // Keep runtime chunk minimal by enabling runtime chunk
          // See https://webpack.js.org/guides/build-performance/#minimal-entry-chunk
          runtimeChunk: true,
          // Avoid extra optimization step, turning off split-chunk optimization
          // See https://webpack.js.org/guides/build-performance/#avoid-extra-optimization-steps
          removeAvailableModules: false,
          removeEmptyChunks: false,
          splitChunks: false,
        }
      : {},
    plugins: [
      (isEnvDevelopment_Advanced || isEnvProduction) &&
        new CircularDependencyPlugin({
          exclude: /node_modules/,
          include: /src\/.+\.(?:tsx|ts|mjs|js)$/,
          failOnError: true,
          allowAsyncCycles: false, // allow import cycles that include an asynchronous import, e.g. import(/* webpackMode: "weak" */ './file.js')
          cwd: process.cwd(), // set the current working directory for displaying module paths
        }),
      isEnvDevelopment_Advanced && new ForkTsCheckerWebpackFormatterPlugin(),
      isEnvDevelopment_Advanced &&
        // Webpack plugin that runs TypeScript type checker on a separate process.
        // NOTE: This makes the initial build process slower but allow faster incremental builds
        // See https://www.npmjs.com/package/fork-ts-checker-webpack-plugin#motivation
        // See https://github.com/arcanis/pnp-webpack-plugin#fork-ts-checker-webpack-plugin-integration
        new ForkTsCheckerWebpackPlugin({
          typescript: {
            mode: 'write-references', // recommended mode to improve initial compilation time when using `babel-loader`
            diagnosticsOptions: {
              syntactic: true,
              semantic: true,
              declaration: true,
              global: true,
            },
            configOverwrite: {
              // ignore test files for faster check
              exclude: [
                'src/**/__tests__/**/*.ts',
                'src/**/__tests__/**/*.tsx',
                'src/**/__mocks__/**/*.ts',
                'src/**/__mocks__/**/*.tsx',
              ],
            },
          },
          // Allow blocking Webpack `emit` to wait for type checker/linter and to add errors to the Webpack compilation
          // if we turn `async:true` webpack will compile on one thread and type check on another thread so any type
          // error will not cause the build to fail, also error/warning from this plugin will not be captured by webpack
          // so we will have to write our own formatter for the log.
          async: true,
          // We will handle the output here using `fork-ts-checker-webpack-formatter-plugin`
          // since the lint/error/warning output is not grouped by file
          // See https://github.com/TypeStrong/fork-ts-checker-webpack-plugin/issues/119
          logger: {
            infrastructure: 'silent',
            issues: 'silent',
            devServer: false,
          },
          eslint: {
            files: 'src/**/*.{ts,tsx}',
            options: {
              // ignore test files for faster check
              ignorePattern: [
                'src/**/__tests__/*.ts',
                'src/**/__tests__/*.tsx',
                'src/**/__mocks__/*.ts',
                'src/**/__mocks__/*.tsx',
              ],
              parserOptions: {
                // Limit the option like this helps with memory usage
                // See https://github.com/typescript-eslint/typescript-eslint/issues/1192
                project: resolve(dirname, './tsconfig.json'),
              },
            },
          },
          formatter: undefined,
        }),
      // NOTE: need to clean the `lib` directory since during development, we re-build module
      // on code change and save the build artifacts to disk so HMR can litter the `lib` directory
      // with chunk files overtime.
      isEnvDevelopment &&
        new CleanWebpackPlugin({
          // Do not remove type declaration files. This forces the user
          // to run separate processes to rebuild typings on changes
          cleanOnceBeforeBuildPatterns: ['!**/*.d.ts'],
          cleanAfterEveryBuildPatterns: ['!**/*.d.ts'],
        }),
    ].filter(Boolean),
  };
  return config;
};

const validateAppConfig = (config, dirname) => {
  if (!dirname) {
    throw new Error(`\`dirname\` is required to validate app config`);
  }
  // faviconPath
  const faviconPath = config.faviconPath;
  if (faviconPath && !existsSync(resolve(dirname, faviconPath))) {
    throw new Error(
      `Invalid config: Cannot find favicon file with provided path (\`faviconPath\`) '${faviconPath}'.\n
      Make sure the path is relative to the root directory of the module.`,
    );
  }
  // baseUrl
  const baseUrl = config.baseUrl;
  if (!baseUrl) {
    throw new Error(`Invalid config: base URL (\`baseUrl\`) is not specified`);
  }
  if (!/^(?:\/[\w-]+)*\/$/.test(baseUrl)) {
    throw new Error(
      `Invalid config: the base URL (\`baseUrl\`) provided '${baseUrl}' is not valid`,
    );
  }
};

export const getWebAppBaseWebpackConfig = (
  env,
  arg,
  dirname,
  {
    mainEntryPath,
    indexHtmlPath,
    appConfig,
    babelConfigPath,
    /**
     * Regex patterns for to be added to `loader.include` of `babel-loader`
     * For untranspiled modules, they need to be transpiled in order to be loaded and bundled
     * in the app.
     *
     * e.g. We don't transpile our code at all in Studio, we publish exactly what `tsc` yields.
     * As such, when being consumed by Webpack, our code needs to be passed through the `babel-loader`
     * For that reason, we always default to include `/@finos\/legend-studio/` in the list of include patterns
     */
    extraBabelLoaderIncludePatterns = [],
  },
) => {
  if (!dirname) {
    throw new Error(`\`dirname\` is required to build Webpack config`);
  }
  const { isEnvDevelopment, isEnvProduction } = getEnvInfo(env, arg);
  const baseConfig = getBaseWebpackConfig(env, arg, dirname, {
    babelConfigPath,
    extraBabelLoaderIncludePatterns,
  });
  validateAppConfig(appConfig, dirname);

  // NOTE: due to routes like `/v1.0.0` (with '.'), to refer to static resources, we move all static content to `/static`
  const staticPath = 'static';

  const config = {
    ...baseConfig,
    entry: { index: mainEntryPath },
    output: {
      ...baseConfig.output,
      path: join(dirname, `dist${appConfig.baseUrl}`),
      assetModuleFilename: `${staticPath}/${
        isEnvDevelopment ? '[name].[ext]' : '[name].[contenthash:8].[ext]'
      }`,
      publicPath: isEnvDevelopment ? '/' : appConfig.baseUrl,
      filename: `${staticPath}/${
        isEnvDevelopment ? '[name].js' : '[name].[contenthash:8].js'
      }`,
    },
    resolve: {
      ...baseConfig.resolve,
      // Ignore usage of Node module `os` in `zipkin`
      // See https://github.com/openzipkin/zipkin-js/issues/465
      fallback: { os: false },
      alias: {
        ...baseConfig.resolve.alias,
        // Reduce `monaco-editor` bundle size by using ESM bundle which enables tree-shaking
        // See https://github.com/microsoft/monaco-editor-webpack-plugin/issues/97
        'monaco-editor': 'monaco-editor/esm/vs/editor/editor.api.js',
      },
    },
    devServer: {
      compress: true, // enable gzip compression for everything served to reduce traffic size
      devMiddleware: {
        publicPath: '/',
      },
      open:
        // trim the leading and trailing slash
        appConfig.baseUrl.length === 1
          ? false
          : [appConfig.baseUrl.slice(1, -1)],
      port: 8080,
      host: 'localhost',
      // redirect 404s to /index.html
      historyApiFallback: {
        // URL contains dot such as for version (majorV.minV.patchV: 1.0.0) need this rule
        // See https://github.com/bripkens/connect-history-api-fallback#disabledotrule
        disableDotRule: true,
      },
      client: {
        // suppress HMR and WDS messages about updated chunks
        // NOTE: there is a bug that the line '[HMR] Waiting for update signal from WDS...' is not suppressed
        // See https://github.com/webpack/webpack-dev-server/issues/2166
        logging: 'warn',
      },
      ...(appConfig.devServer ?? {}),
    },
    optimization: isEnvProduction
      ? {
          splitChunks: {
            cacheGroups: {
              defaultVendors: {
                test: /node_modules/,
                chunks: 'initial',
                name: 'vendor',
                priority: -10,
                enforce: true,
              },
            },
          },
        }
      : baseConfig.optimization,
    plugins: [
      ...baseConfig.plugins,
      isEnvDevelopment && new ReactRefreshWebpackPlugin(),
      new MiniCssExtractPlugin({
        filename: `${staticPath}/${
          isEnvDevelopment ? '[name].css' : '[name].[contenthash:8].css'
        }`,
        chunkFilename: `${staticPath}/${
          isEnvDevelopment ? '[id].css' : '[id].[contenthash:8].css'
        }`,
      }),
      new HtmlWebpackPlugin({
        template: indexHtmlPath,
        favicon: appConfig.faviconPath
          ? resolve(dirname, appConfig.faviconPath)
          : undefined,
      }),
      /**
       * Since by default we use `monaco-editor` in our app core modules
       * We specify it here to slim down the `webpack` config in top-level modules
       */
      new MonacoWebpackPlugin({
        // Only include what we need to lessen the bundle loads
        // See https://github.com/microsoft/monaco-editor-webpack-plugin
        languages: ['json', 'java', 'markdown', 'sql'],
        // Here we can choose to also exclude/include features but this really does not
        // significantly affect the bundle size anyhow, but it's also strange that we
        // need to turn off features in `monaco-editor` on creation anyway
        // See https://github.com/microsoft/monaco-editor-webpack-plugin/issues/40
        features: [
          'bracketMatching',
          'clipboard',
          'contextmenu',
          'coreCommands',
          'comment',
          'find',
          'folding',
          'gotoLine',
          'hover',
          'multicursor',
        ],
      }),
    ].filter(Boolean),
  };
  return config;
};

export const buildAliasEntriesFromTsConfigPathMapping = ({
  dirname,
  tsConfigPath,
  excludePaths = [],
}) => {
  if (!dirname) {
    throw new Error(`\`dirname\` is required to build Webpack module aliases`);
  }
  const tsConfig = resolveFullTsConfig(tsConfigPath);
  const paths = tsConfig?.compilerOptions?.paths;
  const baseUrl = tsConfig?.compilerOptions?.baseUrl;
  const basePath = baseUrl ? resolve(dirname, baseUrl) : dirname;
  if (paths) {
    const aliases = {};
    Object.entries(paths).forEach(([key, value]) => {
      if (excludePaths.includes(key)) {
        return;
      }
      const alias =
        key.includes('/*') || key.includes('*')
          ? key.replace('/*', '').replace('*', '')
          : // If the path mapping is an exact match, add a trailing `$`
            // See https://webpack.js.org/configuration/resolve/#resolvealias
            `${key}$`;
      const replacement = (Array.isArray(value) ? value : [value]).map((val) =>
        // webpack does not need do exact replacement so wildcard '*' is not needed
        val.replace('*', ''),
      );
      aliases[alias] = replacement.map((val) => resolve(basePath, val));
    });
    return aliases;
  }
  return {};
};
