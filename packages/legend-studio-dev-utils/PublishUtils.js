/**
 * Copyright 2020 Goldman Sachs
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
const { exitOrThrowError } = require('./DevUtils');

const toThrowError = process.argv.includes('--bail');

const checkPublishContent = (dir) => {
  const hasLicenseFile = fs.existsSync(path.resolve(dir, 'LICENSE'));

  if (!hasLicenseFile) {
    exitOrThrowError('LICENSE file is required!', toThrowError);
  }

  const isTypescriptProject = fs.existsSync(path.resolve(dir, 'tsconfig.json'));

  if (isTypescriptProject) {
    const tsConfigFile = require(path.resolve(dir, 'tsconfig.json'));
    if (tsConfigFile.extends) {
      exitOrThrowError(
        `Typescript project has unresolved \`tsconfig.json\` file! Please flatten it out using '--showConfig' flag.`,
        toThrowError,
      );
    }
  }
};

module.exports = {
  checkPublishContent,
};
