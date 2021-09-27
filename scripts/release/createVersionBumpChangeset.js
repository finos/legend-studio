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

import { loadJSON } from '@finos/legend-dev-utils/DevUtils';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const changesetConfig = loadJSON(
  resolve(__dirname, '../../.changeset/config.json'),
);

const packagesToBump = changesetConfig.linked[0];
// NOTE: changeset's config structure could change so we would like to do some validation
if (
  !Array.isArray(packagesToBump) ||
  packagesToBump.length === 0 ||
  !packagesToBump.includes('@finos/legend-studio-app')
) {
  console.log(
    chalk.red(
      `Can't find the list of application deployment packages to bump versions for! Make sure to check changesets config file '.changeset/config.json'`,
    ),
  );
  process.exit(1);
}

writeFileSync(
  resolve(__dirname, '../../.changeset/new-version.md'),
  [
    '---',
    ...packagesToBump.map((line) => `  '${line}': minor`),
    '---',
    '',
  ].join('\n'),
);

console.log(
  [
    'Sucessfully bumped version for application packages:',
    ...packagesToBump.map((line) => chalk.green(`\u2713 ${line}`)),
  ].join('\n'),
);
