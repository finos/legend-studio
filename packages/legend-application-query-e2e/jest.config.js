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

/**
 * Tests in this package are Playwright end-to-end tests, not Jest tests.
 * The root Jest config treats every `packages/*` directory as a project
 * (falling back to Jest's default `testMatch`, which would pick up our
 * `*.spec.ts` files), so this config explicitly matches nothing to keep
 * Jest out of this package. Run these tests with `yarn test:e2e` instead.
 */
export default {
  displayName: '@finos/legend-application-query-e2e',
  testMatch: ['<rootDir>/__no-jest-tests__/**/*'],
};
