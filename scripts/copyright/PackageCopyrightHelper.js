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

import { resolve, dirname } from 'path';
import { generateCopyrightComment } from '@finos/legend-dev-utils/CopyrightUtils';
import { getFileContent, loadJSON } from '@finos/legend-dev-utils/DevUtils';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const generateBundleCopyrightText = (workspaceDir) => {
  const packageJson = loadJSON(resolve(workspaceDir, './package.json'));
  return generateCopyrightComment({
    text: getFileContent(resolve(__dirname, './COPYRIGHT_HEADER.txt')),
    pkg: {
      name: packageJson.name,
      version: packageJson.version,
    },
  });
};
