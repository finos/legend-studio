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
import appConfig from './query.config.js';
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
    serviceWorkerConfig: {
      filename: 'ServiceWorker.js',
      import: resolve(__dirname, './ServiceWorker.js'),
    },
  });
  /** @type {import('webpack').Configuration} */
  const config = {
    ...baseConfig,
    devServer: {
      ...baseConfig.devServer,
      ...appConfig.devServerOptions,
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
