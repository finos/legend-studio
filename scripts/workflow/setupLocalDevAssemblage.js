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

import * as yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { existsSync, writeFileSync } from 'fs';
import { resolve, dirname, relative } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { exitWithError, loadJSON } from '@finos/legend-dev-utils/DevUtils';
import chalk from 'chalk';

const __dirname = dirname(fileURLToPath(import.meta.url));

const argv = yargs.default(hideBin(process.argv)).argv;
let localAssemblageRelativePath = argv._[0];
const useSnapshot = argv.snapshot;

const ROOT_DIR = resolve(__dirname, '../../');

if (!localAssemblageRelativePath) {
  console.log(
    chalk.yellow(
      `No relative path to local assemblage provided, using current directory instead`,
    ),
  );
  localAssemblageRelativePath = '.';
}
const localAssemblagePath = resolve(ROOT_DIR, localAssemblageRelativePath);

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
 *
 * Which makes use of Yarn `resolutions` mechanism. This method makes the process less tedious
 * by generating the needed package resolutions.
 *
 * See https://yarnpkg.com/configuration/manifest#resolutions
 */
const generateLocalAssemblagePackageResolutions = async () => {
  const localAssemblagePackageJsonPath = resolve(
    localAssemblagePath,
    'package.json',
  );
  const localAssemblagePackageJson = loadJSON(localAssemblagePackageJsonPath);

  execSync('yarn workspaces list --json', {
    encoding: 'utf-8',
    cwd: ROOT_DIR,
  })
    .split('\n')
    .filter(Boolean)
    .map((text) => JSON.parse(text))
    .filter(
      (ws) => !loadJSON(resolve(ROOT_DIR, ws.location, 'package.json')).private,
    )
    .forEach((ws) => {
      if (!localAssemblagePackageJson.resolutions) {
        localAssemblagePackageJson.resolutions = {};
      }
      if (useSnapshot) {
        const artifactRelativePath = resolve(
          ws.location,
          'build/local-snapshot.tgz',
        );
        const artifactPath = resolve(ROOT_DIR, artifactRelativePath);
        if (!existsSync(artifactPath)) {
          exitWithError(
            `Can't find local snapshot artifact: ${artifactRelativePath}`,
          );
        }
        localAssemblagePackageJson.resolutions[ws.name] = `file:${relative(
          resolve(ROOT_DIR, localAssemblageRelativePath),
          artifactPath,
        )}`;
      } else {
        // If we don't use snapshot artifacts, we can just use `Yarn` portal protocol
        // to point at package directories. However, this has some caveat
        // See https://yarnpkg.com/features/protocols#whats-the-difference-between-link-and-portal
        // See https://github.com/finos/legend-studio/blob/master/docs/workflow/local-development-assemblage.md
        localAssemblagePackageJson.resolutions[ws.name] = `portal:${relative(
          resolve(ROOT_DIR, localAssemblageRelativePath),
          resolve(ROOT_DIR, ws.location),
        )}`;
      }
    });
  writeFileSync(
    localAssemblagePackageJsonPath,
    JSON.stringify(localAssemblagePackageJson, undefined, 2),
  );
};

generateLocalAssemblagePackageResolutions();
