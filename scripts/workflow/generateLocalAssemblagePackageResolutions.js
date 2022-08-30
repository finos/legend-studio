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

import { resolve, dirname, relative } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { loadJSON } from '@finos/legend-dev-utils/DevUtils';
import chalk from 'chalk';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ROOT_DIR = resolve(__dirname, '../../');
let localAssemblageRelativePath = process.argv[2];

if (!localAssemblageRelativePath) {
  console.log(
    chalk.yellow(
      `No relative path to local assemblage provided, using current directory instead`,
    ),
  );
  localAssemblageRelativePath = '.';
}

/**
 * There are times when one needs to work on an external repository
 * but relying on the unmerged changes in the packages of `legend-studio`
 *
 * This requires the developer to have `legend-studio` code checked-out
 * in a folder A and their code in a folder B then somehow link packages in A to B.
 * Effectively, B is pointing at local versions of packages in A, instead of the versions
 * coming from NPM to do this, we could make use of Yarn's portal protocol.
 *
 * See https://yarnpkg.com/features/protocols
 * See https://yarnpkg.com/features/protocols#whats-the-difference-between-link-and-portal
 *
 * Which makes use of Yarn `resolutions` mechanism. This method makes the process less tedious
 * by generating the needed package resolutions.
 *
 * See https://yarnpkg.com/configuration/manifest#resolutions
 */
const generateLocalAssemblagePackageResolutions = async () => {
  const resolutionsText = execSync('yarn workspaces list --json', {
    encoding: 'utf-8',
    cwd: ROOT_DIR,
  })
    .split('\n')
    .filter(Boolean)
    .map((text) => JSON.parse(text))
    .filter(
      (ws) => !loadJSON(resolve(ROOT_DIR, ws.location, 'package.json')).private,
    )
    .map(
      (ws) =>
        `    "${ws.name}": "portal:${relative(
          resolve(ROOT_DIR, localAssemblageRelativePath),
          resolve(ROOT_DIR, ws.location),
        )}"`,
    )
    .join(',\n');
  console.log(`{\n  "resolutions": {\n${resolutionsText}\n  }\n}`);
};

generateLocalAssemblagePackageResolutions();
