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

import { resolve, dirname } from 'path';
import webpack from 'webpack';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import appConfig from './marketplace.config.js';
import {
  getEnvInfo,
  getWebAppBaseWebpackConfig,
} from '@finos/legend-dev-utils/WebpackConfigUtils';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const { DefinePlugin } = webpack;

export default (env, arg) => {
  const { isEnvDevelopment } = getEnvInfo(env, arg);

  const baseConfig = getWebAppBaseWebpackConfig(env, arg, __dirname, {
    mainEntryPath: resolve(__dirname, './src/index.tsx'),
    indexHtmlPath: resolve(__dirname, './src/index.html'),
    appConfig,
    babelConfigPath: resolve(__dirname, '../../babel.config.cjs'),
    enableReactFastRefresh: isEnvDevelopment,
  });
  /** @type {import('webpack').Configuration} */
  const config = {
    ...baseConfig,
    devServer: {
      ...baseConfig.devServer,
      ...appConfig.devServerOptions,
    },
    optimization: {
      ...baseConfig.optimization,
      splitChunks: {
        chunks: 'all',
        maxInitialRequests: 25,
        maxAsyncRequests: 25,
        cacheGroups: {
          // Monaco editor - large dependency, separate chunk for better caching
          monaco: {
            test: /[\\/]node_modules[\\/]monaco-editor[\\/]/,
            name: 'monaco',
            chunks: 'all',
            priority: 40,
            enforce: true,
          },
          // MUI components - separate chunk
          mui: {
            test: /[\\/]node_modules[\\/]@mui[\\/]/,
            name: 'mui',
            chunks: 'all',
            priority: 35,
            enforce: true,
          },
          // React and related core libraries
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 30,
            enforce: true,
          },
          // MobX state management
          mobx: {
            test: /[\\/]node_modules[\\/](mobx|mobx-react-lite|mobx-utils)[\\/]/,
            name: 'mobx',
            chunks: 'all',
            priority: 25,
            enforce: true,
          },
          // Create separate chunks for lazy-loaded page components
          pages: {
            test: /[\\/]pages[\\/]/,
            name: 'pages',
            chunks: 'async',
            priority: 20,
            enforce: true,
          },
          // Create separate chunks for stores
          stores: {
            test: /[\\/]stores[\\/]/,
            name: 'stores',
            chunks: 'async',
            priority: 15,
            enforce: true,
          },
          // Remaining vendor dependencies - only for initial chunks
          defaultVendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            chunks: 'initial',
            priority: -10,
            enforce: true,
          },
          // Async vendor chunks - for dependencies only used in lazy-loaded routes
          asyncVendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'async-vendor',
            chunks: 'async',
            priority: -20,
            minSize: 10000,
          },
        },
      },
    },
    plugins: [
      ...baseConfig.plugins,
      new DefinePlugin({
        AG_GRID_LICENSE: null,
      }),

      // For development, we want to serve the `config.json` and `version.json` files at the `/baseUrl`
      isEnvDevelopment &&
        new CopyWebpackPlugin({
          patterns: [
            {
              from: resolve(__dirname, './dev/config.json'),
              // trim the leading and trailing slash
              to:
                appConfig.baseUrl.length === 1
                  ? undefined
                  : appConfig.baseUrl.slice(1, -1),
            },
            {
              from: resolve(__dirname, './dev/version.json'),
              // trim the leading and trailing slash
              to:
                appConfig.baseUrl.length === 1
                  ? undefined
                  : appConfig.baseUrl.slice(1, -1),
            },
          ],
        }),
    ].filter(Boolean),
  };
  return config;
};
