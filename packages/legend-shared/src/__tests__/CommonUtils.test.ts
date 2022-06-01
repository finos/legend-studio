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
} from '../CommonUtils';
import { unitTest } from '../application/TestUtils';

test(unitTest('Recursive omit'), () => {
  const obj: Record<PropertyKey, unknown> = { a: '', b: { c: '', d: '' } };
  expect(recursiveOmit(obj, [])).toEqual(obj);
  expect(recursiveOmit(obj, [])).not.toBe(obj);
  expect(recursiveOmit(obj, ['a', 'b'])).toEqual({});
  expect(recursiveOmit(obj, ['a', 'c'])).toEqual({ b: { d: '' } });
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
  expect({
    a: 'oneOverride',
    b: [{ m: 'mValue' }, { n: 'nValue' }, { o: 'oValue' }, { p: 'pValue' }],
    c: { a: [1, 2] },
  }).toEqual(mergeObjects(obj1, obj2, true));
  expect({
    a: 'one',
    b: [{ m: 'mValue' }, { n: 'nValue' }],
    c: { a: [1, 2, 1, 2, 3, 4] },
  }).toEqual(mergeObjects(obj1, obj3, true));
  // Check the mutation behavior of `merge`
  expect({
    a: 'one',
    b: [{ m: 'mValue' }, { n: 'nValue' }],
    c: { a: [1, 2, 1, 2, 3, 4] },
  }).toEqual(mergeObjects(obj1, obj3, false));
  expect({
    a: 'one',
    b: [{ m: 'mValue' }, { n: 'nValue' }],
    c: { a: [1, 2, 1, 2, 3, 4] },
  }).toEqual(obj1);
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
