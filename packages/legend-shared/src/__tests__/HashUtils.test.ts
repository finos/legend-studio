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

import { test, expect } from '@jest/globals';
import { unitTest } from '../__test-utils__/TestUtils.js';
import { fastHash } from '../application/HashUtils.js';

test(unitTest('Fast hash is a stable 64-bit hex hash'), () => {
  const values = [
    '',
    'a',
    'b',
    'ab',
    'ba',
    'model::Person',
    'model::Person ',
    'modèle::Personne',
    'x'.repeat(100000),
  ];
  const hashes = values.map(fastHash);
  hashes.forEach((hash) => expect(hash).toMatch(/^[0-9a-f]{16}$/u));
  expect(new Set(hashes).size).toBe(values.length);
  expect(values.map(fastHash)).toEqual(hashes);
});
