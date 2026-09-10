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

import { test, expect, describe } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { applyOptionalInt } from '../ComputeEditorState.js';

describe(unitTest('applyOptionalInt applies parsed values to a setter'), () => {
  /** An empty `[]` means the setter was never called. */
  test.each<[string, string, (number | undefined)[]]>([
    ['applies undefined for an empty string', '', [undefined]],
    ['applies the parsed integer', '42', [42]],
    [
      'reads exponent notation as its value, not its first digit',
      '1e3',
      [1000],
    ],
    ['is a no-op for a decimal rather than truncating it', '7.5', []],
    ['is a no-op for partially-numeric input', '12abc', []],
    ['is a no-op for non-numeric input', 'abc', []],
  ])('%s', (_name, raw, expected) => {
    const values: (number | undefined)[] = [];
    applyOptionalInt(raw, (value) => values.push(value));
    expect(values).toEqual(expected);
  });
});
