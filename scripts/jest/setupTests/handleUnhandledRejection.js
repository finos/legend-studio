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

import { exitWithError } from '@finos/legend-dev-utils/DevUtils';

// Handle unhandled rejection in case Jest missed it to avoid accidentally passing test with failures
// See https://github.com/facebook/jest/issues/3251#issuecomment-299183885
if (!process.env.LISTENING_TO_UNHANDLED_REJECTION) {
  process.on('unhandledRejection', (error) => {
    // NOTE: Jest will prevent logging after test is ran, but we must use `console.log` to print out the exact
    // error message with stack trace
    // Ideally, here, we would like to fail the test, but for Jest, at this point, it is considered that the test already concludes
    // throwing an error or calling `fail()` here will cause test to retry a few times instead of immediately failing the test,
    // but with a different reason such as `Call retries were exceeded`, so we might as well call exit with code 1
    exitWithError(
      `Unhandled rejection detected! Please make sure the promise where this error is thrown from is handled using \`await\` or \`try ... catch\`. Error:\n${
        error.message || error
      }`,
    );
  });
  // Do not add too many listeners to avoid memory-leak
  process.env.LISTENING_TO_UNHANDLED_REJECTION = true;
}
