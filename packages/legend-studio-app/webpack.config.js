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

const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const appConfig = require('./studio.config');
const {
  getEnvInfo,
  getWebAppBaseWebpackConfig,
} = require('@finos/legend-studio-dev-utils/WebpackConfigUtils');

module.exports = (env, arg) => {
  const { isEnvDevelopment } = getEnvInfo(env, arg);

  const baseConfig = getWebAppBaseWebpackConfig(env, arg, __dirname, {
    mainEntryPath: path.resolve(__dirname, './src/index.tsx'),
    indexHtmlPath: path.resolve(__dirname, './src/index.html'),
    appConfig,
    babelConfigPath: path.resolve(__dirname, '../../babel.config.js'),
  });
  const config = {
    ...baseConfig,
    devServer: {
      ...baseConfig.devServer,
      ...appConfig.devServerOptions,
    },
    plugins: [
      ...baseConfig.plugins,
      // For development, we want to serve the `config.json` and `version.json` files at the `/baseUrl`
      isEnvDevelopment &&
        new CopyWebpackPlugin({
          patterns: [
            {
              from: path.resolve(__dirname, './dev/config.json'),
              // trim the leading and trailing slash
              to:
                appConfig.baseUrl.length === 1
                  ? undefined
                  : appConfig.baseUrl.slice(1, -1),
            },
            {
              from: path.resolve(__dirname, './dev/version.json'),
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
