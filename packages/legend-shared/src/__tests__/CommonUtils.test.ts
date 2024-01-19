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
import {
  recursiveOmit,
  mergeObjects,
  getClass,
  getSuperclass,
  sortObjectKeys,
} from '../CommonUtils.js';
import { unitTest } from '../__test-utils__/TestUtils.js';

test(unitTest('Recursive omit'), () => {
  const obj = { a: '', b: { c: '', d: '' } };
  expect(recursiveOmit(obj, () => true)).toEqual({});
  expect(recursiveOmit(obj, () => false)).not.toBe(obj); // make sure we return a different object
  expect(
    recursiveOmit(obj, (object, propKey) =>
      (['a', 'b'] as PropertyKey[]).includes(propKey),
    ),
  ).toEqual({});
  expect(
    recursiveOmit(obj, (object, propKey) =>
      (['a', 'c'] as PropertyKey[]).includes(propKey),
    ),
  ).toEqual({ b: { d: '' } });
});

test(unitTest('Merge objects'), () => {
  const obj1 = {
    a: 'one',
    b: [{ m: 'mValue' }, { n: 'nValue' }],
    c: { a: [1, 2] },
  };
  const obj2 = {
    a: 'oneOverride',
    b: [{ o: 'oValue' }, { p: 'pValue' }],
  };
  const obj3 = { c: { a: [1, 2, 3, 4] } };
  expect(mergeObjects(obj1, obj2, true)).toEqual({
    a: 'oneOverride',
    b: [{ m: 'mValue' }, { n: 'nValue' }, { o: 'oValue' }, { p: 'pValue' }],
    c: { a: [1, 2] },
  });
  expect(mergeObjects(obj1, obj3, true)).toEqual({
    a: 'one',
    b: [{ m: 'mValue' }, { n: 'nValue' }],
    c: { a: [1, 2, 1, 2, 3, 4] },
  });
  // Check the mutation behavior of `merge`
  expect(mergeObjects(obj1, obj3, false)).toEqual({
    a: 'one',
    b: [{ m: 'mValue' }, { n: 'nValue' }],
    c: { a: [1, 2, 1, 2, 3, 4] },
  });
});

test(unitTest('Sort object keys alphabetically'), () => {
  const obj1 = {
    // check sorting for objects within array
    b: [{ m: 'mValue' }, { n: 'nValue', a: 'val' }],
    // check sorting for objects within nested array
    y: [
      [{ m: 'mValue' }, { n: 'nValue', a: 'val', b: null }],
      [{ 456: 'val', 123: 'nValue' }],
    ],
    a: 'one',
    z: { a: [1, 2] },
    1234: { a: [1, 2] },
    _1234: 'a',
    c: { a: [1, 2] },
    d: null,
  };
  const obj2 = {
    a: 'oneOverride',
    b: [{ o: 'oValue' }, { p: 'pValue' }],
  };
  expect(sortObjectKeys(obj1)).toEqual({
    '1234': { a: [1, 2] },
    _1234: 'a',
    a: 'one',
    b: [{ m: 'mValue' }, { a: 'val', n: 'nValue' }],
    c: { a: [1, 2] },
    d: null,
    y: [
      [{ m: 'mValue' }, { a: 'val', b: null, n: 'nValue' }],
      [{ 123: 'nValue', 456: 'val' }],
    ],
    z: { a: [1, 2] },
  });
  expect(sortObjectKeys(obj2)).toEqual(obj2);
  expect(sortObjectKeys({})).toEqual({});
});

class A {}
class B extends A {}

test(unitTest('Get Class and Superclass'), () => {
  expect(getClass(new A()).name).toEqual('A');
  expect(getClass(new B()).name).toEqual('B');
  expect(getClass(A).name).toEqual('Function');
  expect(getClass({}).name).toEqual('Object');

  expect(getSuperclass(A)).toEqual(undefined);
  expect(getSuperclass(B)?.name).toEqual('A');
});
