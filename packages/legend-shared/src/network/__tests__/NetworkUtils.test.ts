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

import { test, expect } from '@jest/globals';
import { unitTest } from '../../__test-utils__/TestUtils.js';
import { buildUrl } from '../NetworkUtils.js';

test(unitTest('Build URL'), () => {
  expect(buildUrl(['http://www.example.org/', '/subroute'])).toEqual(
    'http://www.example.org/subroute',
  );
  expect(
    buildUrl([
      'http://www.example.org/',
      '/subroute/////',
      '//////another-subroute////',
    ]),
  ).toEqual('http://www.example.org/subroute/another-subroute');
  expect(
    buildUrl(['http://www.example.org', 'subroute', 'another-subroute']),
  ).toEqual('http://www.example.org/subroute/another-subroute');
});
