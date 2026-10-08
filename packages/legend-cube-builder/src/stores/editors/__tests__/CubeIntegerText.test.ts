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
import { parseWholeNumberText } from '../CubeIntegerText.js';

describe('Whole-number fields', () => {
  test.each<[string, number]>([
    ['10', 10],
    [' 7 ', 7],
    ['+5', 5],
    ['-3', -3],
    ['0', 0],
    ['007', 7],
    ['9007199254740993', 9007199254740992],
  ])('Reads %j as %s, for the node to judge', (text, value) => {
    expect(parseWholeNumberText(text)).toBe(value);
  });

  test.each([
    '',
    '   ',
    '1.5',
    '5.',
    '.5',
    '1e3',
    '0x10',
    '0b11',
    '1_000',
    '1,000',
    'ten',
    '- 3',
    'Infinity',
    'NaN',
    // too long for a double: Number() would read it as Infinity
    '9'.repeat(400),
  ])('Reads %j as no number, never as 0 or a default', (text) => {
    expect(parseWholeNumberText(text)).toBeUndefined();
  });
});
