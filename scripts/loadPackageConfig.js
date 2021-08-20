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

import { getConfigLoader } from '@finos/legend-dev-utils/DevUtils';

// NOTE: `cosmiconfig` does not work with ESM config so unfortunately
// we cannot rely on this right now to load config, we will temporarily
// hard-code the config path
// See https://github.com/davidtheclark/cosmiconfig/issues/224
export const configLoader = getConfigLoader('_package');

export const resolvePackageConfig = (filePath) => {
  const result = configLoader.search(filePath);
  return result?.config;
};
