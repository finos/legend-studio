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

import { resolve, join } from 'path';
import { existsSync } from 'fs';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import MonacoWebpackPlugin from 'monaco-editor-webpack-plugin';
import CircularDependencyPlugin from 'circular-dependency-plugin';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export const getEnvInfo = (env, arg) => ({
  isEnvDevelopment: arg.mode === 'development',
  isEnvProduction: arg.mode === 'production',
  isEnvDevelopment_Debug:
    arg.mode === 'development' && process.env.DEVELOPMENT_MODE === 'debug',
  isEnvProduction_Fast:
    arg.mode === 'production' && process.env.PRODUCTION_MODE === 'fast',
});

/**
 * This method gets the base Webpack config for bundling either top-level
 * webapp with HTML entry points or library.
 */
export const getBaseWebpackConfig = (
  env,
  arg,
  dirname,
  { babelConfigPath },
  useRelativePath,
) => {
  if (!dirname) {
    throw new Error(`\`dirname\` is required to build Webpack config`);
  }
  const {
    isEnvDevelopment,
    isEnvDevelopment_Debug,
    isEnvProduction,
    isEnvProduction_Fast,
  } = getEnvInfo(env, arg);

  const enableSourceMap = isEnvProduction && !isEnvProduction_Fast;

  const config = {
    mode: arg.mode,
    bail: isEnvProduction, // fail-fast in production build
    output: {
      // Turn off `output.pathinfo` by default to enhance build performance.
      // See https://webpack.js.org/guides/build-performance/#output-without-path-info
      // NOTE: for debugging, this flag is quite useful as it gives information about the bundle, tree-shaking, bailouts, etc.
      // See https://webpack.js.org/configuration/output/#outputpathinfo
      pathinfo: isEnvDevelopment_Debug,
    },
    devtool: isEnvDevelopment
      ? // NOTE: `eval-cheap-module-source-map` is recommend for dev, but it doesn't report error location accurately
        // See https://github.com/vuejs-templates/webpack/issues/520#issuecomment-356773702
        isEnvDevelopment_Debug
        ? 'cheap-module-source-map'
        : // no source map makes development build happens really fast
          // and one would be able to see the final generated code, which could be helpful in certain cases
          // but for debugging (e.g. where putting breakpoints is needed), source maps might be required
          // See https://webpack.js.org/configuration/devtool/
          false
      : enableSourceMap
        ? 'source-map'
        : false,
    watchOptions: {
      ignored: /node_modules/,
    },
    infrastructureLogging: {
      // Only warnings and errors
      // See https://webpack.js.org/configuration/other-options/#infrastructurelogginglevel
      level: 'info',
    },
    stats: {
      all: false,
      errors: true,
      warnings: true,
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
          // NOTE: we don't need to specify the `exclude` part for this
          // loader as we already specify the include list instead.
          include: resolve(dirname, './src/'),
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
              options: useRelativePath
                ? {
                    publicPath: '../',
                  }
                : {},
            },
            {
              // Helps resolve @import and url() like import/require()
              loader: require.resolve('css-loader'),
              options: {
                sourceMap: enableSourceMap,
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
                sourceMap: enableSourceMap,
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
          runtimeChunk: {
            name: (entrypoint) => {
              if (entrypoint.name.startsWith('service-worker')) {
                return null;
              }

              return `runtime~${entrypoint.name}`;
            },
          },
          // Avoid extra optimization step, turning off split-chunk optimization
          // See https://webpack.js.org/guides/build-performance/#avoid-extra-optimization-steps
          removeAvailableModules: false,
          removeEmptyChunks: false,
          splitChunks: false,
        }
      : {},
    plugins: [
      ((isEnvProduction && !isEnvProduction_Fast) || isEnvDevelopment_Debug) &&
        new CircularDependencyPlugin({
          exclude: /node_modules/,
          include: /src\/.+\.(?:tsx|ts|mjs|js)$/,
          failOnError: true,
          allowAsyncCycles: false, // allow import cycles that include an asynchronous import, e.g. import(/* webpackMode: "weak" */ './file.js')
          cwd: process.cwd(), // set the current working directory for displaying module paths
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
    enableReactFastRefresh,
    // service work config : { fileName: string, import: string }
    serviceWorkerConfig,
  },
) => {
  if (!dirname) {
    throw new Error(`\`dirname\` is required to build Webpack config`);
  }
  const { isEnvDevelopment, isEnvProduction } = getEnvInfo(env, arg);
  const baseConfig = getBaseWebpackConfig(
    env,
    arg,
    dirname,
    {
      babelConfigPath,
    },
    appConfig.useRelativePath,
  );
  validateAppConfig(appConfig, dirname);

  // NOTE: due to routes like `/v1.0.0` (with '.'), to refer to static resources, we move all static content to `/static`
  const staticPath = 'static';

  const config = {
    ...baseConfig,
    entry: {
      index: mainEntryPath,
      ...(serviceWorkerConfig
        ? {
            'service-worker': {
              filename: serviceWorkerConfig.filename,
              import: serviceWorkerConfig.import,
            },
          }
        : {}),
    },
    output: {
      ...baseConfig.output,
      path: join(dirname, `dist${appConfig.baseUrl}`),
      assetModuleFilename: `${staticPath}/${
        isEnvDevelopment ? '[name].[ext]' : '[name].[contenthash:8].[ext]'
      }`,
      publicPath: isEnvDevelopment
        ? '/'
        : appConfig.useRelativePath
          ? './'
          : appConfig.baseUrl,
      filename: `${staticPath}/${
        isEnvDevelopment ? '[name].js' : '[name].[contenthash:8].js'
      }`,
    },
    resolve: {
      ...baseConfig.resolve,
      fallback: {
        // Ignore usage of Node module `os` and `url` in `zipkin`
        // See https://github.com/openzipkin/zipkin-js/issues/465
        os: false,
        url: false,
      },
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
      port: 9000,
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
        overlay: {
          // NOTE: hide some runtime errors which can be somewhat too noisy
          // See https://stackoverflow.com/questions/49384120/resizeobserver-loop-limit-exceeded
          // See https://github.com/w3c/csswg-drafts/issues/5023
          runtimeErrors: (error) => {
            console.debug(`[DEV] Unhandled Runtime Error:`, error);
            return false;
          },
        },
      },
      ...(appConfig.devServer ?? {}),
    },
    optimization: isEnvProduction
      ? {
          splitChunks: {
            cacheGroups: {
              defaultVendors: {
                test: /node_modules/,
                chunks: (chunkFilename) => chunkFilename !== 'service-worker',
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
      isEnvDevelopment &&
        enableReactFastRefresh &&
        new ReactRefreshWebpackPlugin(),
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
        languages: [
          'json',
          'java',
          'markdown',
          'sql',
          'yaml',
          'xml',
          'graphql',
        ],
        // Exclude/include features
        // NOTE: the downside to this is that sometimes `monaco-editor` changes their
        // bundling or list of features and we could end up with features suddenly not
        // working as expected
        features: [
          'linesOperations',
          'bracketMatching',
          'clipboard',
          'contextmenu',
          'codelens',
          'coreCommands',
          'comment',
          'find',
          'folding',
          'gotoLine',
          'hover',
          'links',
          'smartSelect',
          'multicursor',
          'snippet',
          'snippetController2',
          'suggest',
          'wordHighlighter',
          'gotoSymbol',
        ],
      }),
    ].filter(Boolean),
  };
  return config;
};
