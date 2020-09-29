/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { isNonNullable, AssertionError, guaranteeNonNullable, recursiveOmit } from 'Utilities/GeneralUtil';
import { unit } from 'Utilities/TestUtil';

test(unit('Check nullable value'), () => {
  expect(isNonNullable(null)).toEqual(false);
  expect(isNonNullable(undefined)).toEqual(false);
  expect(isNonNullable({})).toEqual(true);
  expect(isNonNullable(0)).toEqual(true);
  expect(isNonNullable('')).toEqual(true);
  expect(isNonNullable('12312')).toEqual(true);
});

test(unit('Assert non nullable value'), () => {
  expect(() => guaranteeNonNullable(null)).toThrow(AssertionError);
  expect(() => guaranteeNonNullable(undefined)).toThrow(AssertionError);
  expect(guaranteeNonNullable({})).toEqual({});
  expect(guaranteeNonNullable(0)).toEqual(0);
  expect(guaranteeNonNullable('')).toEqual('');
  expect(guaranteeNonNullable('asd')).toEqual('asd');
});

test(unit('Recursive omit'), () => {
  const obj: Record<PropertyKey, unknown> = { a: '', b: { c: '', d: '' } };
  expect(recursiveOmit(obj, [])).toEqual(obj);
  expect(recursiveOmit(obj, [])).not.toBe(obj);
  expect(recursiveOmit(obj, ['a', 'b'])).toEqual({});
  expect(recursiveOmit(obj, ['a', 'c'])).toEqual({ b: { d: '' } });
});
