/**
 * Copyright 2020 Goldman Sachs
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

const { exitWithError } = require('@finos/legend-studio-dev-utils/DevUtils');
const { ResizeObserver } = require('@juggle/resize-observer');

// Polyfills
window.ResizeObserver = ResizeObserver;

// NOTE: we should not need to mock `global.fetch` like below since we should not even let fetch to happen anywhere
// since we don't want to make network call at all in test. Hence, the following is a good check
// However, if we need `fetch` implementation in Jest test, we must provide a polyfill, like `whatwg-fetch`,
// for `jsdom` to work properly
// See https://github.com/jsdom/jsdom/issues/2555#issuecomment-483903817
// See https://github.com/facebook/create-react-app/blob/master/packages/react-app-polyfill/jsdom.js
global.fetch = (requestUrl, requestInit) => {
  throw new Error(
    `Attempted to make a request to '${requestUrl}'. You should NEVER make real network call in test`,
  );
};

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
  process.env.LISTENING_TO_UNHANDLED_REJECTION = true; // eslint-disable-line no-process-env
}
