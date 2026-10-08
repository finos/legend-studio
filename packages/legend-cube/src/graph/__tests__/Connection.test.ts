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

import { expect, test } from '@jest/globals';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import { Connection } from '../Connection.js';

const CONNECTION = new Connection('a', 'b', 'in');

test(
  unitTest('Connections match partially, with undefined as a wildcard'),
  () => {
    expect(CONNECTION.match()).toBe(true);
    expect(CONNECTION.match('a', 'b', 'in')).toBe(true);
    expect(CONNECTION.match(undefined, 'b')).toBe(true);
    expect(CONNECTION.match('a', undefined, 'in')).toBe(true);
    expect(CONNECTION.match('a', 'b', undefined)).toBe(true);
    expect(CONNECTION.match('x')).toBe(false);
    expect(CONNECTION.match(undefined, 'x')).toBe(false);
    expect(CONNECTION.match(undefined, undefined, 'x')).toBe(false);
    expect(CONNECTION.match('a', 'b', 'x')).toBe(false);
  },
);

test(unitTest('Connections are equal when all their fields are'), () => {
  expect(CONNECTION.equals(new Connection('a', 'b', 'in'))).toBe(true);
  expect(CONNECTION.equals(new Connection('a', 'b', 'other'))).toBe(false);
  expect(CONNECTION.equals(new Connection('b', 'a', 'in'))).toBe(false);
  expect(CONNECTION.equals(new Connection('x', 'b', 'in'))).toBe(false);
  expect(CONNECTION.equals(new Connection('a', 'x', 'in'))).toBe(false);
});

test(unitTest('Connections need a source, a target and a port'), () => {
  expect(() => new Connection('', 'b', 'in')).toThrow();
  expect(() => new Connection('a', '', 'in')).toThrow();
  expect(() => new Connection('a', 'b', '')).toThrow();
});
