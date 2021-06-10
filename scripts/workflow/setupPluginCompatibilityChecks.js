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

import { loadJSON } from '@finos/legend-studio-dev-utils/DevUtils';
import { writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(__dirname, '../../');

/**
 * Get versions for all workspaces so we can update dummy plugin `package.json`
 * to point at latest versions of these on NPM instead of `workspace:*`
 *
 * NOTE: this means that we must NEVER run this script in the new release PR.
 */
const workspaceVersionMap = new Map();
execSync('yarn workspaces list --json', {
  encoding: 'utf-8',
  cwd: ROOT_DIR,
})
  .split('\n')
  .filter(Boolean)
  .map((text) => JSON.parse(text))
  .forEach((ws) => {
    workspaceVersionMap.set(
      ws.name,
      loadJSON(resolve(ROOT_DIR, ws.location, 'package.json')).version,
    );
  });

/**
 * Update the dummy plugin to use latest version of all
 * dependencies in the workspace
 */
const pluginPackageJsonPath = resolve(
  ROOT_DIR,
  'temp/legend-studio-preset-dummy/package.json',
);
const pluginPackageJson = loadJSON(pluginPackageJsonPath);

['dependencies', 'devDependencies'].forEach((depType) => {
  if (pluginPackageJson[depType]) {
    Object.keys(pluginPackageJson[depType] ?? {}).forEach((key) => {
      if (pluginPackageJson[depType][key] === 'workspace:*') {
        if (!workspaceVersionMap.has(key)) {
          throw new Error(
            `Yarn workspace protocol 'workspace:*' should only be used for workspace in the same monorepo project`,
          );
        }
        pluginPackageJson[depType][key] = workspaceVersionMap.get(key);
      }
    });
  }
});

writeFileSync(
  pluginPackageJsonPath,
  JSON.stringify(pluginPackageJson, null, 2),
  (err) => {
    console.log(`Can't update dummy plugin manifest. Error: ${err.message}`);
    process.exit(1);
  },
);

/**
 * Update web application to use the modified dummy plugin.
 */
const webappPackageJsonPath = resolve(
  ROOT_DIR,
  'packages/legend-studio-app/package.json',
);
const webappPackageJson = loadJSON(webappPackageJsonPath);

webappPackageJson.devDependencies['@finos/legend-studio-preset-dummy'] =
  'file:../../temp/legend-studio-preset-dummy';

writeFileSync(
  webappPackageJsonPath,
  JSON.stringify(webappPackageJson, null, 2),
  (err) => {
    console.log(
      `Can't update application manifest to use the modified dummy plugin. Error: ${err.message}`,
    );
    process.exit(1);
  },
);
