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

import { existsSync, readdirSync, writeFileSync } from 'fs';
import { resolve, extname, dirname } from 'path';
import { execSync } from 'child_process';
import {
  exitWithError,
  getFileContent,
  loadJSModule,
} from '@finos/legend-dev-utils/DevUtils';
import { generateBundleCopyrightText } from '../copyright/PackageCopyrightHelper.js';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ROOT_DIR = resolve(__dirname, '../../');

/**
 * This script makes the assumption about the structure of each package
 *    style/index.scss -> lib/index.css
 *
 * If a package style code does not follow this structure, one can specify
 * the input and output style sheet in the package config
 */
const buildSass = async () => {
  const workspaceDir = process.env.INIT_CWD ?? process.cwd();
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
  if (!existsSync(inputPath)) {
    exitWithError(`Can't find Sass input path (default to './style')`);
  }

  execSync(
    `yarn sass ${inputPath}:${outputPath} --style=compressed --load-path=${resolve(
      ROOT_DIR,
      'node_modules/@finos/legend-art/scss',
    )}`,
  );

  readdirSync(outputPath).forEach((fileOrDir) => {
    if (extname(fileOrDir) === '.css') {
      const filePath = resolve(outputPath, fileOrDir);
      const copyrightText = generateBundleCopyrightText(workspaceDir);
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
  });
};

buildSass();
