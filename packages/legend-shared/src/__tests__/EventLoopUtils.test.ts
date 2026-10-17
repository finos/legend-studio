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

import { test, expect, afterEach } from '@jest/globals';
import { unitTest } from '../__test-utils__/TestUtils.js';
import { yieldToEventLoop } from '../CommonUtils.js';

const globals = globalThis as Record<string, unknown>;

afterEach(() => {
  delete globals.window;
  delete globals.MessageChannel;
});

test(unitTest('Yielding outside a browser uses a timeout'), async () => {
  const order: string[] = [];
  const yielded = yieldToEventLoop().then(() => order.push('yielded'));
  order.push('sync');
  await yielded;
  expect(order).toEqual(['sync', 'yielded']);
});

test(
  unitTest('Yielding in a browser posts messages, resolved in order'),
  async () => {
    let posted = 0;
    // a stand-in for the browser's MessageChannel: delivers posted messages later
    class TEST__MessageChannel {
      port1: { onmessage: (() => void) | null } = { onmessage: null };
      port2 = {
        postMessage: (): void => {
          posted++;
          setTimeout(() => this.port1.onmessage?.(), 0);
        },
      };
    }
    globals.window = globalThis;
    globals.MessageChannel = TEST__MessageChannel;

    const order: number[] = [];
    await Promise.all(
      [1, 2, 3].map((index) =>
        yieldToEventLoop().then(() => order.push(index)),
      ),
    );
    expect(order).toEqual([1, 2, 3]);
    expect(posted).toBe(3);
  },
);
