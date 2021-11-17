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

import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { loadJSModule } from '@finos/legend-dev-utils/DevUtils';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ROOT_DIR = resolve(__dirname, '../../');

const enableWatch = process.argv[2] === '--watch';

/**
 * This script makes the assumption about the structure of each package
 *    style/index.scss -> lib/index.css
 *
 * If a package style code does not follow this structure, one can specify
 * the input and output style sheet in the package config
 */
const buildSassAll = async () => {
  const packageInfos = execSync('yarn workspaces list --json', {
    encoding: 'utf-8',
    cwd: ROOT_DIR,
  })
    .split('\n')
    .filter(Boolean)
    .map((text) => JSON.parse(text));

  const entries = (
    await Promise.all(
      packageInfos.map(async (pkgInfo) => {
        const workspaceDir = resolve(ROOT_DIR, pkgInfo.location);
        const packageConfigPath = resolve(workspaceDir, '_package.config.js');
        const packageConfig = existsSync(packageConfigPath)
          ? (await loadJSModule(packageConfigPath)).default
          : undefined;
        const inputPath = resolve(
          workspaceDir,
          packageConfig?.style?.inputPath ?? 'style',
        );
        const outputPath = resolve(
          workspaceDir,
          packageConfig?.style?.outputPath ?? 'lib',
        );
        if (existsSync(inputPath)) {
          return `${inputPath}:${outputPath}`;
        }
        return undefined;
      }),
    )
  ).filter(Boolean);

  // NOTE: we use `spawn` to stream output to `stdout` (with color)
  // Compile many-to-many Sass files
  // See https://sass-lang.com/documentation/cli/dart-sass#many-to-many-mode
  spawn(
    `yarn`,
    [
      'sass',
      ...entries,
      // This is where we put all the shared Sass stylesheets
      // NOTE: `node_modules` path here must be resolvable from `cwd`, which is
      // the root directory in this case due to the way we set up this script in Yarn
      // else, `sass` might fail this silently, and we get no feedback about it
      `--load-path=${resolve(ROOT_DIR, 'node_modules/@finos/legend-art/scss')}`,
      enableWatch ? `--watch` : undefined,
    ].filter(Boolean),
    {
      cwd: ROOT_DIR,
      shell: true,
      stdio: 'inherit',
    },
  );
};

buildSassAll();
