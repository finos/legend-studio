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
import { existsSync, readdirSync, writeFileSync } from 'fs';
import { resolve, extname, dirname } from 'path';
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import {
  exitWithError,
  getFileContent,
  loadJSModule,
} from '@finos/legend-dev-utils/DevUtils';
import { generateBundleCopyrightText } from '../copyright/PackageCopyrightHelper.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const argv = yargs.default(hideBin(process.argv)).argv;

const ROOT_DIR = resolve(__dirname, '../../');

const compressed = argv.compressed;
const enableWatch = argv.watch;

if (enableWatch && compressed) {
  exitWithError(
    `Can't run this script with both flags '--watch' and '--compressed'`,
  );
}

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
          return {
            workspaceDir,
            inputPath,
            outputPath,
          };
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
      ...entries.map((entry) => `${entry.inputPath}:${entry.outputPath}`),
      // This is where we put all the shared Sass stylesheets
      // NOTE: `node_modules` path here must be resolvable from `cwd`, which is
      // the root directory in this case due to the way we set up this script in Yarn
      // else, `sass` might fail this silently, and we get no feedback about it
      `--load-path=${resolve(ROOT_DIR, 'node_modules/@finos/legend-art/scss')}`,
      compressed ? `--style=compressed` : undefined,
      enableWatch ? `--watch` : undefined,
    ].filter(Boolean),
    {
      cwd: ROOT_DIR,
      shell: true,
      stdio: 'inherit',
    },
  );

  if (compressed) {
    execSync(
      `yarn sass ${entries
        .map((entry) => `${entry.inputPath}:${entry.outputPath}`)
        .join(' ')} --style=compressed --load-path=${resolve(
        ROOT_DIR,
        'node_modules/@finos/legend-art/scss',
      )}`,
    );

    entries.forEach((entry) =>
      readdirSync(entry.outputPath).forEach((fileOrDir) => {
        if (extname(fileOrDir) === '.css') {
          const filePath = resolve(entry.outputPath, fileOrDir);
          const copyrightText = generateBundleCopyrightText(entry.workspaceDir);
          writeFileSync(
            filePath,
            `${copyrightText}\n\n${getFileContent(filePath)}`,
            (err) => {
              exitWithError(
                `Failed to add copyright header to bundled output file: ${filePath}. Error:\n${
                  err.message || err
                }`,
              );
            },
          );
        }
      }),
    );
  } else {
    // NOTE: we use `spawn` to stream output to `stdout` (with color)
    // Compile many-to-many Sass files
    // See https://sass-lang.com/documentation/cli/dart-sass#many-to-many-mode
    spawn(
      `yarn`,
      [
        'sass',
        ...entries.map((entry) => `${entry.inputPath}:${entry.outputPath}`),
        // This is where we put all the shared Sass stylesheets
        // NOTE: `node_modules` path here must be resolvable from `cwd`, which is
        // the root directory in this case due to the way we set up this script in Yarn
        // else, `sass` might fail this silently, and we get no feedback about it
        `--load-path=${resolve(
          ROOT_DIR,
          'node_modules/@finos/legend-art/scss',
        )}`,
        enableWatch ? `--watch` : undefined,
      ].filter(Boolean),
      {
        cwd: ROOT_DIR,
        shell: true,
        stdio: 'inherit',
      },
    );
  }
};

buildSassAll();
