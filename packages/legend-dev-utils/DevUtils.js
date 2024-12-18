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

import { platform } from 'os';
import { readFileSync } from 'fs';
import { getPackages as _getPackages } from '@manypkg/get-packages';

export const getFileContent = (file) =>
  readFileSync(file, { encoding: 'utf-8' });
export const createRegExp = (pattern) => new RegExp(pattern);

const exit = (msg, code) => {
  console.log(msg);
  process.exit(code);
};
export const exitWithError = (msg) => exit(msg, 1);
export const exitWithSuccess = (msg) => exit(msg, 0);
export const exitOrThrowError = (msg, throwError = true) => {
  if (throwError) {
    throw new Error(msg);
  } else {
    exitWithError(msg);
  }
};

// NOTE: unlike `require`, ESM `import` does not support JSON files without the flag --experimental-json-modules
// being specified, which is not convenient at all in our setup. So we will use the following approach to load them
export const loadJSON = (path) => JSON.parse(getFileContent(path));

export const loadJSModule = (path) =>
  // NOTE: Windows requires prefix `file://` for absolute path
  import(`${platform() === 'win32' ? 'file://' : ''}${path}`);

export const getPackages = _getPackages;
