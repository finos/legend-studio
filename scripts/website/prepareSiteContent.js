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

import { existsSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { copySync } from 'fs-extra/esm';
import { fileURLToPath } from 'url';
import { exitWithError } from '@finos/legend-dev-utils/DevUtils';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ROOT_DIR = resolve(__dirname, '../../');
const typeDocBuildDir = resolve(ROOT_DIR, 'build/docs');
const websiteStaticContentDir = resolve(ROOT_DIR, 'website/static');

const prepareSiteContent = () => {
  // Check presense of basic site content
  if (!existsSync(resolve(typeDocBuildDir, 'index.html'))) {
    exitWithError(`TypeDoc documentation content has not been generated`);
  }

  // Copy over website static content
  readdirSync(websiteStaticContentDir).forEach((fileOrDir) => {
    copySync(
      resolve(websiteStaticContentDir, fileOrDir),
      resolve(typeDocBuildDir, fileOrDir),
    );
  });
};

prepareSiteContent();
