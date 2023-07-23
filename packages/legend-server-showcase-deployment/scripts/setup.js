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

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isEnvProduction = process.env.NODE_ENV === 'production';
const outputDir = resolve(
  __dirname,
  `${isEnvProduction ? '../dist' : '../dev'}`,
);

if (!existsSync(outputDir)) {
  mkdirSync(outputDir);
}

writeFileSync(
  resolve(outputDir, 'config.json'),
  JSON.stringify(
    {
      port: 9003,
      datasources:
        // NOTE: if you want to test with local source, use this
        // [{
        //   path: './data/metadata.json',
        // }],
        [
          {
            url: 'https://legend.finos.org/showcases/data.json',
          },
        ],
    },
    undefined,
    2,
  ),
);
