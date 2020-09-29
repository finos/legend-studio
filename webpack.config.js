/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const webpack = require('webpack');
const sass = require('sass');
const path = require('path');
const fs = require('fs');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const WebpackBundleAnalyzer = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const WorkerPlugin = require('worker-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

const getJavascriptLoaderConfig = ({ isProcessingJSXFiles, isEnvDevelopment }) => ({
  loader: require.resolve('babel-loader'),
  options: {
    cacheDirectory: true,
    presets: [
      '@babel/preset-env',
      '@babel/preset-react',
      '@babel/preset-typescript'
    ],
    // Plugin order matters
    plugins: [
      // This plugin provides Component Stack Traces (JSX), but it MUST be DISABLED for PROD
      // See https://reactjs.org/docs/error-boundaries.html#component-stack-traces
      isProcessingJSXFiles && isEnvDevelopment && '@babel/plugin-transform-react-jsx-source',
      // Use the legacy (stage 1) decorators syntax and behavior.
      // NOTE: must be placed before `@babel/plugin-proposal-class-properties`
      // See https://babeljs.io/docs/en/babel-plugin-proposal-decorators#note-compatibility-with-babel-plugin-proposal-class-properties
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      // class properties are compiled to use an assignment expression instead of `Object.defineProperty`
      // See https://babeljs.io/docs/en/babel-plugin-proposal-class-properties#loose
      ['@babel/plugin-proposal-class-properties', { loose: true }],
      // These are beta features in Typescript 3.7, we can remove this when this becomes official
      ['@babel/plugin-proposal-optional-chaining'],
      ['@babel/plugin-proposal-nullish-coalescing-operator'],
      // regexp named-capturing-group is not supported on Firefox yet, only on Chrome
      // See https://bugzilla.mozilla.org/show_bug.cgi?id=1362154
      ['@babel/plugin-transform-named-capturing-groups-regex'],
      // This plugin provides `react-refresh` capability, but it MUST be DISABLED for PROD
      // NOTE: as of now, this strictly works with React related files so we have to isolate it from non-jsx files
      // as it will throw error while processing with web-workers at runtime
      // See https://github.com/pmmmwh/react-refresh-webpack-plugin/issues/24#issuecomment-672816401
      isProcessingJSXFiles && isEnvDevelopment && 'react-refresh/babel',
    ].filter(Boolean)
  }
});

const rootDirectory = fs.realpathSync(process.cwd());
const resolveApp = relativePath => path.resolve(rootDirectory, relativePath);
const paths = {
  dev: resolveApp('dev'),
  assets: resolveApp('assets'),
  source: resolveApp('app'),
  advancedEslintConfig: resolveApp('.eslintrc-advanced.js'),
  eslintConfig: resolveApp('.eslintrc.js'),
  tsConfig: resolveApp('tsconfig.json'),
};
const APP_NAME = 'studio';
const CONFIG_PATH = `${paths.dev}/config/config.json`;
const APP_VERSION_PATH = `${paths.dev}/config/version.json`;
// NOTE: since we're using HTML5 routing form the static server, we need to be able to not have `.` in the name as that would be interpreted as
// static files content. However, use cases like `/v1.0.0` might come up in our routing plan so we will have to move all static contents
// to `/static` folder. However, there are problems with `worker-plugin` and `webpack-html-plugin` since there seems to be no good way
// to tell them to move their emitted files into the `static` folder. It might be due to this
// See https://github.com/GoogleChromeLabs/worker-plugin/issues/47
const OUTPUT_STATIC_PATH = 'static';

module.exports = (env, arg) => {
  const isAnalyzeMode = env && env.analyze;
  const isEnvDevelopment = arg.mode === 'development';
  const isEnvProduction = arg.mode === 'production';
  const useAdvancedLintingRules = Boolean(arg.useAdvancedLintingRule);
  const enableAsyncTypeCheck = Boolean(arg.enableAsyncTypeCheck);
  return {
    mode: arg.mode,
    // Stop compilation early in production
    bail: isEnvProduction,
    entry: { main: './app/index.tsx' },
    output: {
      path: path.join(__dirname, `./target/classes/web/${APP_NAME}`),
      publicPath: isEnvDevelopment ? '/' : `/${APP_NAME}/`,
      filename: `${OUTPUT_STATIC_PATH}/${isEnvDevelopment ? '[name].js' : '[name].[contenthash:8].js'}`,
      // This is for `worker-plugin` works in HMR
      // See https://github.com/GoogleChromeLabs/worker-plugin#globalobject
      globalObject: '(typeof self !== "undefined" ? self : this)',
    },
    // A SourceMap without column-mappings that simplifies loader Source Maps to a single mapping per line.
    // See https://webpack.js.org/configuration/devtool/
    // For comparison, see http://cheng.logdown.com/posts/2016/03/25/679045
    devtool: isEnvDevelopment
      // The best and also recommended for dev seems to be `cheap-module-eval-source-map`,
      // but the line is incorrectly reported, so we use `cheap-module-source-map` as CRA
      // See https://github.com/vuejs-templates/webpack/issues/520#issuecomment-356773702
      // See https://github.com/facebook/create-react-app/issues/343
      ? 'cheap-module-source-map'
      : 'source-map',
    watchOptions: {
      poll: 1000,
      // Exclude test from dev watch
      ignored: [/node_modules/],
    },
    devServer: {
      // Enable gzip compression for everything served to reduce traffic size
      compress: true,
      publicPath: '/',
      open: true,
      port: 3000,
      openPage: APP_NAME,
      // Redirect 404s to /index.html
      historyApiFallback: {
        // URL contains dot such as for version (majorV.minV.patchV: 1.0.0) need this rule
        // See https://github.com/bripkens/connect-history-api-fallback#disabledotrule
        disableDotRule: true
      },
      https: true,
      // suppress HMR and WDS messages about updated chunks
      // NOTE: there is a bug that the line '[HMR] Waiting for update signal from WDS...' is not suppressed
      // See https://github.com/webpack/webpack-dev-server/issues/2166
      clientLogLevel: 'warn',
      stats: {
        // Make Webpack Dev Middleware less verbose, consider `quiet` and `noInfo` options as well
        // NOTE: Use custom reporter to output errors and warnings from TS fork checker in `stylish` format. It's less verbose and
        // repetitive. Since we use the custom plugin, we want to mute `errors` and `warnings` from `webpack-dev-middleware`
        // See https://github.com/webpack-contrib/webpack-stylish
        // See https://github.com/TypeStrong/fork-ts-checker-webpack-plugin/issues/119
        all: false,
        colors: true,
        timings: true,
      },
    },
    resolve: {
      alias: {
        // workaround for Zipkin not providing proper browser bundles
        'node-fetch': 'noop2',
        // Tidy up the import path, also need to do this configuration for VSCode, ESLint, Jest.
        // See https://medium.com/@justintulk/solve-module-import-aliasing-for-webpack-jest-and-vscode-74007ce4adc9
        // See https://www.javascriptjanuary.com/blog/painless-paths-with-webpack-and-vsc
        // See https://code.visualstudio.com/docs/languages/jsconfig
        Const: path.resolve(__dirname, 'app/const'),
        MetaModelConst: path.resolve(__dirname, 'app/models/MetaModelConst'),
        MetaModelUtility: path.resolve(__dirname, 'app/models/MetaModelUtility'),
        ApplicationConfig: path.resolve(__dirname, 'app/ApplicationConfig'),
        PureModelLoader: path.resolve(__dirname, 'app/models/protocols/pure/PureModelLoader'),
        Utilities: path.resolve(__dirname, 'app/utils'),
        Components: path.resolve(__dirname, 'app/components'),
        Stores: path.resolve(__dirname, 'app/stores'),
        SDLC: path.resolve(__dirname, 'app/models/sdlc'),
        EXEC: path.resolve(__dirname, 'app/models/exec'),
        MM: path.resolve(__dirname, 'app/models/metamodels/pure'),
        V1: path.resolve(__dirname, 'app/models/protocols/pure/v1'),
        Worker: path.resolve(__dirname, 'app/workers'),
        API: path.resolve(__dirname, 'app/api'),
        Style: path.resolve(__dirname, 'style'),
        Dev: path.resolve(__dirname, 'dev'),
      },
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },
    module: {
      rules: [
        {
          // NOTE: as we are using `react-refresh` babel plugin to transrom JSX files, we are having issue with integration of
          // `react-refresh/babel` and `worker-plugin`, as `react-refresh/babel` tries to apply its refresh boundary on even
          // the worker files
          // See https://github.com/pmmmwh/react-refresh-webpack-plugin/issues/24#issuecomment-672816401
          // As such, to enforce this clear distinction, we use `oneOf` and we process `jsx` and `non-jsx` files separately
          // In some way, this is better because we can have separate plugin configurations for JSX
          oneOf: [
            {
              test: /\.(?:js|ts)$/,
              exclude: /node_modules/,
              use: [getJavascriptLoaderConfig({ isEnvDevelopment, isProcessingJSXFiles: false })],
            },
            {
              test: /\.(?:js|ts)x$/,
              exclude: /node_modules/,
              use: [getJavascriptLoaderConfig({ isEnvDevelopment, isProcessingJSXFiles: true })],
            },
          ],
        },
        {
          test: /\.s?css$/,
          use: [
            {
              loader: MiniCssExtractPlugin.loader,
              options: {
                hmr: isEnvDevelopment
              }
            },
            {
              loader: require.resolve('css-loader'),
              options: {
                sourceMap: true
              }
            },
            {
              // Loads and transforms a CSS/SSS file using PostCSS
              loader: require.resolve('postcss-loader'),
              options: {
                ident: 'postcss',
                plugins: () => [
                  require('autoprefixer'),
                ].concat(
                  isEnvDevelopment
                    ? []
                    : [
                      // `cssnano` for minification and auto add charset to avoid encoding issue with `font-awesome`
                      // See https://stackoverflow.com/questions/44163229/node-sass-fontawesome-icon-encoding-issues
                      require('cssnano')
                    ]),
                sourceMap: true
              }
            },
            {
              loader: require.resolve('resolve-url-loader'),
              options: {
                sourceMap: true
              }
            },
            {
              loader: require.resolve('sass-loader'),
              options: {
                implementation: sass,
                sourceMap: true,
                sassOptions: {
                  includePaths: ['node_modules'],
                },
              }
            }
          ]
        },
        {
          test: /\.(?:woff2?|ttf|otf|eot|svg|png|gif)/,
          loader: require.resolve('file-loader'),
          options: {
            name: `${OUTPUT_STATIC_PATH}/${isEnvDevelopment ? '[name].[ext]' : '[name].[contenthash:8].[ext]'}`
          }
        }
      ]
    },
    optimization: {
      // It looks like this is a conflict between newer `html-webpack-plugin` and multi entry point caused by `monaco-editor`
      // When we dev and make change and hot-module-replacement is enabled, we will see: 'webpackHotUpdate is not defined in vendor.js file'
      // so we enable `runtimeChunk` in DEV environment to fix this
      // See https://github.com/webpack/webpack/issues/6693#issuecomment-408764786
      // See https://webpack.js.org/configuration/optimization/#optimizationruntimechunk
      runtimeChunk: isEnvDevelopment,
      splitChunks: {
        cacheGroups: {
          vendor: {
            test: /node_modules/,
            chunks: 'initial',
            name: 'vendor',
            priority: 10,
            enforce: true
          }
        }
      }
    },
    plugins: [
      new WorkerPlugin(),
      // Detect circular dependencies which might break webpack, this is useful for our complicated
      // dependency graph (see MM/V1 for example), and hence should be enabled during development
      // See https://www.npmjs.com/package/circular-dependency-plugin
      new CircularDependencyPlugin({
        // exclude detection of files based on a RegExp
        exclude: /node_modules/,
        // include specific files based on a RegExp
        include: /app/,
        // add errors to webpack instead of warnings
        failOnError: true,
        // allow import cycles that include an asyncronous import,
        // e.g. via import(/* webpackMode: "weak" */ './file.js')
        allowAsyncCycles: false,
        // set the current working directory for displaying module paths
        cwd: process.cwd(),
      }),
      new MonacoWebpackPlugin({
        // Only include what we need to lessen the bundle loads
        // See https://github.com/microsoft/monaco-editor-webpack-plugin
        languages: ['json', 'java', 'markdown'],
        // Here we can choose to also exclude/include features but this does not
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
          'multicursor'
        ]
      }),
      isAnalyzeMode && new WebpackBundleAnalyzer(),
      isEnvDevelopment && new ReactRefreshWebpackPlugin(),
      // Provide global constant, which is good for customizing builds
      // Note that because the plugin does a direct text replacement, the value given to it must
      // include actual quotes inside of the string itself, e.g. '"production"'
      // See https://webpack.js.org/plugins/define-plugin/#usage
      new webpack.DefinePlugin({}),
      new HtmlWebPackPlugin({
        template: './app/index.html',
        // favicon: `${paths.assets}/favicon.ico`,
      }),
      new MiniCssExtractPlugin({
        filename: `${OUTPUT_STATIC_PATH}/${isEnvDevelopment ? '[name].css' : '[name].[contenthash:8].css'}`,
        chunkFilename: `${OUTPUT_STATIC_PATH}/${isEnvDevelopment ? '[id].css' : '[id].[contenthash:8].css'}`,
      }),
      // Webpack plugin that runs TypeScript type checker on a separate process.
      // NOTE: This makes the initial build process slower but allow faster incremental builds
      // See https://www.npmjs.com/package/fork-ts-checker-webpack-plugin#motivation
      // See https://github.com/arcanis/pnp-webpack-plugin#fork-ts-checker-webpack-plugin-integration
      new ForkTsCheckerWebpackPlugin({
        typescript: {
          configFile: paths.tsConfig,
          mode: 'write-references', // recommended mode to improve initial compilation time when using `babel-loader`
          diagnosticsOptions: {
            syntactic: true,
            semantic: true,
            declaration: true,
            global: true,
          },
        },
        // Allow blocking webpack's emit to wait for type checker/linter and to add errors to the webpack's compilation
        // if we turn `async:true` webpack will compile on one thread and type check on another thread so any type
        // error will not cause the build to fail, also error/warning from this plugin will not be captured by webpack
        // so we will have to write our own formatter for the log.
        async: enableAsyncTypeCheck && isEnvDevelopment,
        // We will handle the output here using fork-ts-checker compiler hooks since the lint/error/warning output is not grouped by file
        // See https://github.com/TypeStrong/fork-ts-checker-webpack-plugin/issues/119
        logger: {
          infrastructure: 'silent',
          issues: 'silent',
          devServer: false,
        },
        eslint: {
          enabled: true,
          files: [
            'app/**/*.ts',
            'app/**/*.tsx',
            'style/**/*.ts',
          ],
          // ESLint initialization options
          // See https://eslint.org/docs/developer-guide/nodejs-api#cliengine
          options: {
            configFile: (isEnvProduction || useAdvancedLintingRules) ? paths.advancedEslintConfig : paths.eslintConfig,
            rulePaths: [`${paths.dev}/eslint_rules`],
          }
        },
        formatter: isEnvProduction ? 'codeframe' : undefined
      }),
      // We want to serve the `config.json` and `version.json` files at the /<app_name>/ so we can simulate what k8s does
      isEnvDevelopment && new CopyWebpackPlugin({
        patterns: [
          { from: CONFIG_PATH, to: APP_NAME },
          { from: APP_VERSION_PATH, to: APP_NAME },
        ]
      })
    ].filter(Boolean)
  };
};
