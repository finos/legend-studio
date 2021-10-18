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
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const VERSION_BUMP_CHANGESET_PATH = '.changeset/new-version.md';
export const RESOLVED_VERSION_BUMP_CHANGESET_PATH = resolve(
  __dirname,
  `../../${VERSION_BUMP_CHANGESET_PATH}`,
);

export const getPackagesToBumpVersion = () => {
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
  return packagesToBump;
};

export const generateVersionBumpChangeset = (packagesToBump, bumpType) => {
  if (!bumpType) {
    console.log(
      chalk.red(
        `Release version bump type is required (choose between 'major' and 'minor').`,
      ),
    );
    process.exit(1);
  } else if (!['major', 'minor'].includes(bumpType)) {
    console.log(
      chalk.red(
        `Unsupported release version bump type '${bumpType}', please choose between 'major' and 'minor'.`,
      ),
    );
    process.exit(1);
  }

  return [
    '---',
    ...packagesToBump.map((line) => `  '${line}': ${bumpType}`),
    '---',
    '',
  ].join('\n');
};
