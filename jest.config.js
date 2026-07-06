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

import { getBaseJestConfig } from './scripts/test/jest.config.base.js';

export default {
  ...getBaseJestConfig(true),
  // Increase the default test timeout (5s) to account for slower CI runners
  // where limited CPU resources (e.g. 2 CPUs on Kubernetes pods) can cause
  // async operations like waitFor to exceed the default timeout.
  testTimeout: 30000,
  projects: ['<rootDir>/packages/*'],
};
