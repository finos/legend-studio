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
import {
  fastHash,
  hashArray,
  hashValue,
  stableStringify,
} from '../application/HashUtils.js';

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

test(unitTest('Numbers and booleans count in hashes'), () => {
  expect(hashValue(1)).not.toEqual(hashValue(2));
  expect(hashValue(0)).not.toEqual(hashValue(''));
  expect(hashValue(true)).not.toEqual(hashValue(false));
  expect(hashValue(false)).not.toEqual(hashValue(''));
  expect(hashArray(['x', true])).not.toEqual(hashArray(['x', false]));
  expect(hashArray(['x', 1.5])).not.toEqual(hashArray(['x', 2.5]));
  // a primitive is hashed as its string form
  expect(hashValue(1)).toEqual(hashValue('1'));
  expect(hashValue(true)).toEqual(hashValue('true'));
});

test(unitTest('Stable stringify ignores key order and excluded keys'), () => {
  const excludeKey = (key: string): boolean =>
    key.endsWith('sourceInformation');
  const a = { b: 1, a: [{ y: 'y', x: null }], c: undefined };
  const b = {
    a: [{ x: null, y: 'y', sourceInformation: { line: 1 } }],
    b: 1,
  };
  expect(stableStringify(a, excludeKey)).toEqual(
    stableStringify(b, excludeKey),
  );
  expect(stableStringify(a)).toEqual('{"a":[{"x":null,"y":"y"}],"b":1}');
  // arrays keep their order, and types are kept apart
  expect(stableStringify([1, 2])).not.toEqual(stableStringify([2, 1]));
  expect(stableStringify({ a: 1 })).not.toEqual(stableStringify({ a: '1' }));
});
