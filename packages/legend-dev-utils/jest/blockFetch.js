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
