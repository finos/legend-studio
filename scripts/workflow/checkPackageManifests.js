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

import chalk from 'chalk';
import { resolve, dirname } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { exitWithError, loadJSON } from '@finos/legend-dev-utils/DevUtils';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ROOT_DIR = resolve(__dirname, '../../');

const checkPackageManifest = async (workspaceDir, issues) => {
  const packageJson = loadJSON(resolve(workspaceDir, 'package.json'));
  const workspaceName = packageJson.name;

  if (!packageJson.private) {
    // public packages must have publish scripts and publish directory config specified
    if (!packageJson.scripts['publish:prepare']) {
      issues.push(
        `Package '${workspaceName}' does not specify 'publish:prepare' script`,
      );
    }
    if (!packageJson.scripts['publish:snapshot']) {
      issues.push(
        `Package '${workspaceName}' does not specify 'publish:snapshot' script`,
      );
    }
    if (!packageJson.publishConfig?.directory) {
      issues.push(
        `Package '${workspaceName}' does not specify 'publishConfig.directory' config`,
      );
    }
  }
};

const checkAllPackageManifests = async () => {
  console.log(`Checking all package manifests...`);
  const workspaceDirs = execSync('yarn workspaces list --json', {
    encoding: 'utf-8',
    cwd: ROOT_DIR,
  })
    .split('\n')
    .filter(Boolean)
    .map((text) => JSON.parse(text).location);

  const issues = [];

  await Promise.all(
    workspaceDirs.map((workspaceDir) =>
      checkPackageManifest(workspaceDir, issues),
    ),
  );

  if (issues.length > 0) {
    exitWithError(
      `Found ${issues.length} issue(s) with package manifests:\n${issues
        .map((msg) => `${chalk.red('\u2717')} ${msg}`)
        .join('\n')}`,
    );
  } else {
    console.log(chalk.green('No issues with package manifests found!'));
  }
};

checkAllPackageManifests();
