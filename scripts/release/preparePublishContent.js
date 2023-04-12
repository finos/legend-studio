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
import {
  existsSync,
  readdirSync,
  copyFileSync,
  writeFileSync,
  renameSync,
} from 'fs';
import chalk from 'chalk';
import { resolve, dirname } from 'path';
import { execSync } from 'child_process';
import { resolveFullTsConfig } from '@finos/legend-dev-utils/TypescriptConfigUtils';
import { mkdirs, copySync } from 'fs-extra/esm';
import { fileURLToPath } from 'url';
import { loadJSModule, loadJSON } from '@finos/legend-dev-utils/DevUtils';
import { rimrafSync } from 'rimraf';

const __dirname = dirname(fileURLToPath(import.meta.url));

const argv = yargs.default(hideBin(process.argv)).argv;
const packagingEnabled = argv.pack;

const ROOT_DIR = resolve(__dirname, '../../');
const workspaceDir = process.cwd();
const packageJson = loadJSON(resolve(workspaceDir, 'package.json'));
const workspaceName = packageJson.name;

const preparePublishContent = async () => {
  const packageConfigPath = resolve(workspaceDir, '_package.config.js');
  const packageConfig = existsSync(packageConfigPath)
    ? (await loadJSModule(packageConfigPath)).default
    : undefined;
  console.log(`Preparing publish content for workspace ${workspaceName}...`);

  try {
    const publishContentDir =
      packageJson?.publishConfig?.directory ??
      `${resolve(workspaceDir, 'build/publishContent')}`;

    // Attempt to clean the publish content directory
    if (existsSync(publishContentDir)) {
      rimrafSync(publishContentDir);
    }
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
    const workspaceVersionIndex = new Map();
    execSync('yarn workspaces list --json', {
      encoding: 'utf-8',
      cwd: ROOT_DIR,
    })
      .split('\n')
      .filter(Boolean)
      .map((text) => JSON.parse(text))
      .forEach((ws) => {
        workspaceVersionIndex.set(
          ws.name,
          loadJSON(resolve(ROOT_DIR, ws.location, 'package.json')).version,
        );
      });

    ['dependencies', 'devDependencies', 'peerDependencies'].forEach(
      (depType) => {
        if (packageJson[depType]) {
          Object.keys(packageJson[depType] ?? {}).forEach((key) => {
            if (packageJson[depType][key] === 'workspace:*') {
              if (!workspaceVersionIndex.has(key)) {
                throw new Error(
                  `Yarn workspace protocol 'workspace:*' should only be used for workspace in the same monorepo project`,
                );
              }
              packageJson[depType][key] = workspaceVersionIndex.get(key);
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

    if (packagingEnabled) {
      const artifactInfo = execSync(
        `npm pack ${resolve(
          workspaceDir,
          publishContentDir,
        )} --pack-destination ${resolve(workspaceDir, 'build')} --json`,
        {
          encoding: 'utf-8',
          cwd: ROOT_DIR,
        },
      );
      // NOTE: npm pack command by default will normalize the scope so we would have to account for that
      // for example, package: @scope/package-name 1.2.0 will generate artifact scope-package-name-1.2.0.tgz
      const artifactName = JSON.parse(artifactInfo)[0]
        .filename.replaceAll(/\//g, '-')
        .replaceAll(/@/g, '');
      renameSync(
        resolve(workspaceDir, 'build', artifactName),
        resolve(workspaceDir, 'build/local-snapshot.tgz'),
      );
      console.log(chalk.green(`\u2713 Packaged content`));
    }

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
