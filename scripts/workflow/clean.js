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
import { rimrafSync } from 'rimraf';
import { resolve, dirname } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const argv = yargs.default(hideBin(process.argv)).argv;

const ROOT_DIR = resolve(__dirname, '../../');

const cacheOnly = argv.cache;

const clean = async () => {
  const workspaceDirs = execSync('yarn workspaces list --json', {
    encoding: 'utf-8',
    cwd: ROOT_DIR,
  })
    .split('\n')
    .filter(Boolean)
    .map((text) => JSON.parse(text).location);

  rimrafSync(
    workspaceDirs.flatMap((dir) =>
      cacheOnly
        ? [resolve(dir, 'build')]
        : [resolve(dir, 'build'), resolve(dir, 'lib'), resolve(dir, 'dist')],
    ),
  );

  console.log(`Clean${cacheOnly ? ' cache' : ''} completed!`);
};

clean();
