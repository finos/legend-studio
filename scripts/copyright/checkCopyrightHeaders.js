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

import {
  checkCopyrightHeaders,
  updateCopyrightHeaders,
} from '@finos/legend-dev-utils/CopyrightUtils';
import config from './copyright.config.js';

const toUpdate = process.argv.includes('--update');

if (toUpdate) {
  const onlyApplyToModifiedFiles = process.argv.includes('--modified');
  updateCopyrightHeaders({
    ...config,
    onlyApplyToModifiedFiles,
  });
} else {
  checkCopyrightHeaders({
    ...config,
    helpMessage: `Please include the header or exclude the files in 'scripts/copyright/copyright.config.js'`,
  });
}
