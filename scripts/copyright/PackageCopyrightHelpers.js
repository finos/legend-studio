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

const path = require('path');
const {
  generateCopyrightComment,
} = require('@finos/legend-studio-dev-utils/CopyrightUtils');
const { getFileContent } = require('@finos/legend-studio-dev-utils/DevUtils');

const generateBundleCopyrightText = (workspaceDir) => {
  const packageJson = require(path.resolve(workspaceDir, './package.json'));
  return generateCopyrightComment({
    text: getFileContent(path.resolve(__dirname, './COPYRIGHT_HEADER.txt')),
    pkg: {
      name: packageJson.name,
      version: packageJson.version,
    },
  });
};

module.exports = {
  generateBundleCopyrightText,
};
