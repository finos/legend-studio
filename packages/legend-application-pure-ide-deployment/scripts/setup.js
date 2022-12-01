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
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

const setup = (outputDir) => {
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir);
  }

  writeFileSync(
    resolve(outputDir, 'version.json'),
    JSON.stringify(
      {
        buildTime: new Date().toISOString(),
        version: '0.0.0-local',
        commitSHA: 'local',
      },
      null,
      2,
    ),
  );

  writeFileSync(
    resolve(outputDir, 'config.json'),
    JSON.stringify(
      {
        appName: 'ide',
        env: 'local',
        pure: {
          url: 'http://localhost:9200',
        },
      },
      undefined,
      2,
    ),
  );
};

const __dirname = dirname(fileURLToPath(import.meta.url));

const outputDir = process.argv[2];

setup(resolve(__dirname, `../${outputDir}`));
