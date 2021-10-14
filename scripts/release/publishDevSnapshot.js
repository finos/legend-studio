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
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { loadJSON } from '@finos/legend-dev-utils/DevUtils';

const workspaceDir = process.cwd();
const packageJson = loadJSON(resolve(workspaceDir, 'package.json'));
const workspaceName = packageJson.name;
const today = new Date();
// Make sure the version signature is unique, it follows the format
// `0.0.0-dev-${commitSHA8}-${YYYYMMDD}-${timestamp}`
const fullVersionSignature = `0.0.0-dev-${process.env.GITHUB_SHA.substring(
  0,
  8,
)}-${today.getFullYear()}${today.getMonth().toString().padStart(2, '0')}${today
  .getDate()
  .toString()
  .padStart(2, '0')}-${today.valueOf()}`;
const fullSignature = `${workspaceName}:${fullVersionSignature}`;

const publishDevSnapshot = async () => {
  const publishContentDir = packageJson.publishConfig?.directory
    ? resolve(workspaceDir, packageJson.publishConfig.directory)
    : workspaceDir;
  console.log(`\nPublishing dev snapshot ${fullSignature}`);
  try {
    // Update `package.json` file
    packageJson.version = fullVersionSignature;
    ['dependencies', 'devDependencies', 'peerDependencies'].forEach(
      (depType) => {
        if (packageJson[depType]) {
          Object.keys(packageJson[depType] ?? {}).forEach((key) => {
            if (packageJson[depType][key] === 'workspace:*') {
              packageJson[depType][key] = fullVersionSignature;
            }
          });
        }
      },
    );

    writeFileSync(
      resolve(publishContentDir, 'package.json'),
      JSON.stringify(packageJson, undefined, 2),
    );
    console.log(
      chalk.green(
        `\u2713 Fully resolved dependencies versions in 'package.json'`,
      ),
    );
    // Publish using `npm publish`
    // NOTE: the `dev` dist-tag is set so this is considered a pre-release and do not set the `latest` tag
    // See https://docs.npmjs.com/cli/v7/commands/npm-publish
    execSync(`npm publish ${publishContentDir} --tag dev --access public`, {
      cwd: workspaceDir,
      stdio: ['pipe', 'pipe', 'inherit'], // only print error
    });
    console.log(
      chalk.green(`Successfully published dev snapshot ${fullSignature}\n`),
    );
  } catch (publishError) {
    console.log(
      chalk.red(
        `\u2A2F Failed to publish dev snapshot ${fullSignature}. Error: ${publishError.message}`,
      ),
    );
  }
};

publishDevSnapshot();
