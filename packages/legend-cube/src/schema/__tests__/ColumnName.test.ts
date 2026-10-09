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

import { describe, expect, test } from '@jest/globals';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import { isValidColumnName, MAX_COLUMN_NAME_LENGTH } from '../ColumnName.js';

describe(unitTest('Column names'), () => {
  test.each([
    'SHIP_COUNTRY',
    'Ship Country',
    'ship-country',
    'país',
    "it's",
    '1st',
    'a.b',
    '列名',
    'x'.repeat(MAX_COLUMN_NAME_LENGTH),
    // 128 code points, 256 UTF-16 units
    '😀'.repeat(MAX_COLUMN_NAME_LENGTH),
  ])('Accepts %j', (name) => {
    expect(isValidColumnName(name)).toBe(true);
  });

  test.each([
    ['an empty name', ''],
    ['a name of spaces', '   '],
    ['a leading space', ' NAME'],
    ['a trailing space', 'NAME '],
    ['a trailing tab', 'NAME\t'],
    ['a double quote', 'say "hi"'],
    ['a backslash', 'a\\b'],
    ['a tab inside', 'a\tb'],
    ['a line break', 'a\nb'],
    ['a control character', 'a\u0001b'],
    ['129 characters', 'x'.repeat(MAX_COLUMN_NAME_LENGTH + 1)],
    ['129 code points', '😀'.repeat(MAX_COLUMN_NAME_LENGTH + 1)],
  ])('Refuses %s', (_, name) => {
    expect(isValidColumnName(name)).toBe(false);
  });

  test('Caps names at 128 code points', () => {
    expect(MAX_COLUMN_NAME_LENGTH).toBe(128);
  });
});
