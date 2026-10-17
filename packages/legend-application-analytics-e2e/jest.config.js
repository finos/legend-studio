/**
 * Copyright (c) 2026-present, Goldman Sachs
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

/**
 * This package holds Playwright scripts, not Jest tests. The root Jest config
 * treats every `packages/*` directory as a project, so this config matches
 * nothing to keep Jest out of this package. Run the scripts with
 * `yarn user-guide:screenshots` instead.
 */
export default {
  displayName: '@finos/legend-application-analytics-e2e',
  testMatch: ['<rootDir>/__no-jest-tests__/**/*'],
};
