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
import { unitTest } from '@finos/legend-shared/test';
import { cn } from '../ComponentUtils.js';

test(unitTest('Combine class names'), () => {
  expect(cn('a', 'b')).toEqual('a b');
  expect(cn()).toEqual('');
  expect(cn('a', ['b', 'c'])).toEqual('a b c');
  expect(cn({ a: true, b: false })).toEqual('a');
  expect(cn('a', undefined, null, false, '')).toEqual('a');
});

test(unitTest('Resolve conflicting tailwind class names'), () => {
  // this is what distinguishes `cn` from the bare `clsx` re-exported alongside
  // it: conflicting tailwind utilities collapse to the last one given
  expect(cn('p-2', 'p-4')).toEqual('p-4');
  expect(cn('text-red-500', 'text-blue-500')).toEqual('text-blue-500');

  // non-conflicting utilities are all kept
  expect(cn('p-2', 'm-4')).toEqual('p-2 m-4');
  // a more specific utility does not displace the general one
  expect(cn('px-2', 'py-4')).toEqual('px-2 py-4');

  // conditional values participate in the merge
  expect(cn('p-2', { 'p-4': true })).toEqual('p-4');
  expect(cn('p-2', { 'p-4': false })).toEqual('p-2');

  // unknown (non-tailwind) class names are left alone
  expect(cn('my-component', 'my-component--active')).toEqual(
    'my-component my-component--active',
  );
});
