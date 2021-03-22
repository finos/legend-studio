/**
 * Copyright Goldman Sachs
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

const fs = require('fs');
const path = require('path');
const { exitWithError } = require('@finos/legend-studio-dev-utils/DevUtils');
const {
  addCopyrightHeaderToBundledOutput,
} = require('@finos/legend-studio-dev-utils/CopyrightUtils');

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
[process.env.INIT_CWD, process.cwd()].forEach((basePath) => {
  const configPath = path.resolve(basePath, '_package.config.js');
  if (!fs.existsSync(configPath)) {
    return;
  }
  addCopyrightHeaderToBundledOutput({
    basePath,
    configPath,
    file,
  });
});

exitWithError(`Failed to add copyright header to bundled output file: ${file}`);
