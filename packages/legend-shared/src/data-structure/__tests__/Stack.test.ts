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
import { unitTest } from '../../__test-utils__/TestUtils.js';
import { Stack } from '../Stack.js';

test(unitTest('Stack initializes empty'), () => {
  const stack = new Stack<string>();
  expect(stack.size()).toBe(0);
  expect(stack.peek()).toBeUndefined();
  expect(stack.pop()).toBeUndefined();
});

test(unitTest('Stack push adds items correctly'), () => {
  const stack = new Stack<number>();

  stack.push(1);
  expect(stack.size()).toBe(1);
  expect(stack.peek()).toBe(1);

  stack.push(2);
  expect(stack.size()).toBe(2);
  expect(stack.peek()).toBe(2);

  stack.push(3);
  expect(stack.size()).toBe(3);
  expect(stack.peek()).toBe(3);
});

test(unitTest('Stack pop removes and returns items in LIFO order'), () => {
  const stack = new Stack<string>();

  stack.push('first');
  stack.push('second');
  stack.push('third');

  expect(stack.pop()).toBe('third');
  expect(stack.size()).toBe(2);

  expect(stack.pop()).toBe('second');
  expect(stack.size()).toBe(1);

  expect(stack.pop()).toBe('first');
  expect(stack.size()).toBe(0);

  // Pop on empty stack
  expect(stack.pop()).toBeUndefined();
  expect(stack.size()).toBe(0);
});

test(unitTest('Stack peek returns top item without removing it'), () => {
  const stack = new Stack<number>();

  // Peek on empty stack
  expect(stack.peek()).toBeUndefined();

  stack.push(42);
  expect(stack.peek()).toBe(42);
  expect(stack.size()).toBe(1); // Size unchanged after peek

  stack.push(100);
  expect(stack.peek()).toBe(100);
  expect(stack.size()).toBe(2); // Size unchanged after peek
});

test(
  unitTest('Stack peekAll returns all items without modifying the stack'),
  () => {
    const stack = new Stack<string>();

    // peekAll on empty stack
    expect(stack.peekAll()).toEqual([]);

    stack.push('a');
    stack.push('b');
    stack.push('c');

    const items = stack.peekAll();
    expect(items).toEqual(['a', 'b', 'c']);
    expect(stack.size()).toBe(3); // Stack unchanged

    // Verify returned array is a copy, not a reference
    items.push('d');
    expect(stack.size()).toBe(3); // Stack unchanged by modifying returned array
    expect(stack.peekAll()).toEqual(['a', 'b', 'c']); // Original stack unchanged
  },
);

test(unitTest('Stack clone creates a deep copy'), () => {
  const original = new Stack<number>();
  original.push(1);
  original.push(2);
  original.push(3);

  const clone = original.clone();

  // Verify clone has same content
  expect(clone.size()).toBe(3);
  expect(clone.peekAll()).toEqual([1, 2, 3]);

  // Verify clone is independent of original
  clone.push(4);
  expect(clone.size()).toBe(4);
  expect(original.size()).toBe(3);

  original.pop();
  expect(original.size()).toBe(2);
  expect(clone.size()).toBe(4);
});

test(unitTest('Stack works with complex object types'), () => {
  interface TestObject {
    id: number;
    name: string;
  }

  const stack = new Stack<TestObject>();
  const obj1 = { id: 1, name: 'one' };
  const obj2 = { id: 2, name: 'two' };

  stack.push(obj1);
  stack.push(obj2);

  expect(stack.peek()).toBe(obj2);
  expect(stack.pop()).toBe(obj2);
  expect(stack.pop()).toBe(obj1);
});
