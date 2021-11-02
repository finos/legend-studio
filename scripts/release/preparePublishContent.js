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

import { platform } from 'os';
import { existsSync, readdirSync, copyFileSync, writeFileSync } from 'fs';
import chalk from 'chalk';
import { resolve, dirname } from 'path';
import { execSync } from 'child_process';
import { resolveFullTsConfig } from '@finos/legend-dev-utils/TypescriptConfigUtils';
import { mkdirs, copySync } from 'fs-extra';
import { fileURLToPath } from 'url';
import { loadJSON } from '@finos/legend-dev-utils/DevUtils';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ROOT_DIR = resolve(__dirname, '../../');
const workspaceDir = process.cwd();
const packageJson = loadJSON(resolve(workspaceDir, 'package.json'));
const workspaceName = packageJson.name;

const preparePublishContent = async () => {
  const packageConfig = existsSync(resolve(workspaceDir, '_package.config.js'))
    ? // NOTE: Windows requires prefix `file://` for absolute path
      (
        await import(
          `${platform() === 'win32' ? 'file://' : ''}${resolve(
            workspaceDir,
            '_package.config.js',
          )}`
        )
      ).default
    : undefined;
  console.log(`Preparing publish content for workspace ${workspaceName}...`);

  try {
    const publishContentDir =
      packageJson?.publishConfig?.directory ?? workspaceDir;

    // If the directory for staging publish content is not there, create it
    // and populate it with publish content
    if (!existsSync(publishContentDir)) {
      mkdirs(publishContentDir);
      // Copy the content of the workspace (including build artifacts) to the staging area
      readdirSync(workspaceDir).forEach((fileOrDir) => {
        if (['build', 'dev', 'temp'].includes(fileOrDir)) {
          return;
        }
        copySync(
          resolve(workspaceDir, fileOrDir),
          resolve(publishContentDir, fileOrDir),
        );
      });
      console.log(
        chalk.green(`\u2713 Moved basic content to publish staging area`),
      );
    }

    // If there is no LICENSE file, copy the LICENSE file from root
    if (!existsSync(resolve(publishContentDir, 'LICENSE'))) {
      copyFileSync(
        resolve(ROOT_DIR, 'LICENSE'),
        resolve(publishContentDir, 'LICENSE'),
      );
      console.log(chalk.green(`\u2713 Added LICENSE file`));
    }

    /**
     * For Typescript module, we need to fully resolve `tsconfig` file, i.e. we need to make sure the config does not
     * have `extends` field anymore. This is needed for source code navigation to work properly.
     *
     * e.g. we use module `libA` in another project, in the IDE, we navigate the source code of `libA` in node_modules
     * the IDE is smart enough to read source map and redirect our navigation to the actual source code of `libA` in
     * `libA/src` folder but due to a not fully-resolved `tsconfig.json` the IDE will show errors for Typescript files
     * shown in `libA/src`
     */
    const tsConfigProcessEntries = [
      // default to `./tsconfig.json` if `publish.typescript` is not specified
      {
        source: packageConfig?.publish?.typescript?.main ?? './tsconfig.json',
        target: './tsconfig.json',
      },
      ...(packageConfig?.publish?.typescript?.others ?? []).map((item) => ({
        source: item,
        target: item,
      })),
    ];
    tsConfigProcessEntries.forEach(({ source, target }) => {
      const resolvedSourcePath = resolve(workspaceDir, source);
      const resolvedTargetPath = resolve(publishContentDir, target);
      if (existsSync(resolvedSourcePath)) {
        const newTsConfigContent = resolveFullTsConfig(resolvedSourcePath);
        writeFileSync(
          resolvedTargetPath,
          JSON.stringify(newTsConfigContent, null, 2),
          (err) => {
            console.log(
              `Can't write full Typescript config file '${resolvedSourcePath}' to path '${resolvedTargetPath}' for workspace ${workspaceName}. Error: ${err.message}`,
            );
            process.exit(1);
          },
        );
      }
      console.log(
        chalk.green(`\u2713 Fully resolved Typescript config file '${target}'`),
      );
    });

    /**
     * Since we use `changesets` to publish, which internally uses NPM publish,
     * we need to manually resolve Yarn workspace protocol `workspace:*` which is not supported
     * by changeset yet
     *
     * TODO: we can remove this when `changesets` respect this protocol and resolve during publish
     *
     * See https://yarnpkg.com/features/protocols
     * See https://github.com/atlassian/changesets/issues/432
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

    ['dependencies', 'devDependencies', 'peerDependencies'].forEach(
      (depType) => {
        if (packageJson[depType]) {
          Object.keys(packageJson[depType] ?? {}).forEach((key) => {
            if (packageJson[depType][key] === 'workspace:*') {
              if (!workspaceVersionMap.has(key)) {
                throw new Error(
                  `Yarn workspace protocol 'workspace:*' should only be used for workspace in the same monorepo project`,
                );
              }
              packageJson[depType][key] = workspaceVersionMap.get(key);
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
    console.log(
      chalk.green(
        `Successfully prepared publish content for workspace ${workspaceName}\n`,
      ),
    );
  } catch (e) {
    console.log(
      chalk.red(
        `\u2A2F Failed to prepare publish content for workspace ${workspaceName}\n`,
      ),
    );
    throw e;
  }
};

preparePublishContent();
