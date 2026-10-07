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

import { test, expect, jest } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  compareLabelFn,
  getSelectorInputOptionEmbeddedButtonProps,
} from '../CustomSelectorInput.js';

test(unitTest('Compare selector option labels'), () => {
  expect(compareLabelFn({ label: 'a' }, { label: 'b' })).toBeLessThan(0);
  expect(compareLabelFn({ label: 'b' }, { label: 'a' })).toBeGreaterThan(0);
  expect(compareLabelFn({ label: 'a' }, { label: 'a' })).toBe(0);
});

test(unitTest('Sort selector options by label'), () => {
  const options = [
    { label: 'banana' },
    { label: 'Apple' },
    { label: 'cherry' },
  ];
  expect(options.toSorted(compareLabelFn).map((o) => o.label)).toEqual([
    'Apple',
    'banana',
    'cherry',
  ]);

  // `localeCompare` is case-insensitive in ordering, unlike a raw `<`
  // comparison which would place every capital ahead of every lowercase
  expect(
    [{ label: 'b' }, { label: 'A' }]
      .toSorted(compareLabelFn)
      .map((o) => o.label),
  ).toEqual(['A', 'b']);
});

test(unitTest('Suppress selector dropdown on embedded button press'), () => {
  const { onMouseDown } = getSelectorInputOptionEmbeddedButtonProps();
  const stopPropagation = jest.fn();
  const preventDefault = jest.fn();

  onMouseDown({
    stopPropagation,
    preventDefault,
  } as unknown as React.MouseEvent);

  // `react-select` opens its menu on `mousedown`, so both have to be stopped
  expect(stopPropagation).toHaveBeenCalledTimes(1);
  expect(preventDefault).toHaveBeenCalledTimes(1);
});
