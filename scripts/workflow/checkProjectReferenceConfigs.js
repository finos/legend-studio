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

import { checkProjectReferenceConfig } from '@finos/legend-dev-utils/ProjectReferenceConfigChecker';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log(
  'Checking Typescript project references [DEVEVELOPMENT - tsconfig.json]...',
);

checkProjectReferenceConfig({
  rootDir: resolve(__dirname, '../../'),
  excludeReferencePatterns: ['**/tsconfig.package.json'],
});

console.log(
  'Checking Typescript project references [BUILD - tsconfig.build.json]...',
);

checkProjectReferenceConfig({
  rootDir: resolve(__dirname, '../../'),
  tsConfigFileName: 'tsconfig.build.json',
  excludePackagePatterns: [
    '@finos/legend-manual-tests',
    '@finos/legend-application-*-deployment',
  ],
  excludeReferencePatterns: ['**/tsconfig.package.json'],
});
