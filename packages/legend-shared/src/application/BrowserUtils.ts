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

import { isString } from '../error/AssertionUtils.js';
import { UnsupportedOperationError } from '../error/ErrorUtils.js';

export const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = (): void => {
      const result = fileReader.result;
      if (isString(result)) {
        resolve(result);
      } else {
        throw new UnsupportedOperationError(`Cant read file`);
      }
    };
    fileReader.onerror = reject;
    fileReader.readAsText(file);
  });
