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

import { resolve, dirname, join } from 'path';
import { getBaseWebpackConfig } from '@finos/legend-dev-utils/WebpackConfigUtils';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default (env, arg) => {
  const baseConfig = getBaseWebpackConfig(env, arg, __dirname, {
    babelConfigPath: resolve(__dirname, '../../babel.config.cjs'),
  });
  /** @type {import('webpack').Configuration} */
  const config = {
    ...baseConfig,
    entry: { index: resolve(__dirname, './lib/server.js') },
    target: 'node',
    output: {
      path: join(__dirname, `dist`),
      environment: {
        module: true,
      },
      libraryTarget: 'module',
      chunkFormat: 'module',
    },
    experiments: {
      outputModule: true,
      topLevelAwait: true,
    },
  };
  return config;
};
