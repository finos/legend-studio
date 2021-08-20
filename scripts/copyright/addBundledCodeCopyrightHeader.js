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
import { resolve } from 'path';
import { exitWithError } from '@finos/legend-dev-utils/DevUtils';
import { addCopyrightHeaderToBundledOutput } from '@finos/legend-dev-utils/CopyrightUtils';

const file = process.argv[2];

/**
 * There are various ways this script can be called and each combination results
 * in a different set of values for `INIT_CWD` and `process.cwd()` or `CWD`
 *
 * e.g.
 * cd && yarn run: INIT_CWD=workspaceDir, CWD=workspaceDir
 * yarn workspace run: INIT_CWD=workspaceDir, CWD=workspaceDir
 * yarn workspace foreach run: INIT_CWD=workspaceDir, CWD=rootDir
 * lerna run: INIT_CWD=rootDir, CWD=workspaceDir
 *
 * As such, the best way to make this work agnostic of setup is to
 * find the path from where we can retrieve the file
 */
[process.env.INIT_CWD, process.cwd()].forEach(async (basePath) => {
  const configPath = resolve(basePath, '_package.config.js');
  if (!existsSync(configPath)) {
    exitWithError(
      `Failed to add copyright header to bundled output file: ${file}`,
    );
  }
  await addCopyrightHeaderToBundledOutput({
    basePath,
    configPath,
    file,
  });
});
