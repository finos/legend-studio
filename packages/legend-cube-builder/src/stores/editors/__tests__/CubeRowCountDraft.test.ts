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
import { Limit } from '@finos/legend-cube';
import { CubeRowCountDraft } from '../CubeRowCountDraft.js';

describe('Row count draft', () => {
  test('Starts from the size and gives the original back until something is typed', () => {
    const limit = new Limit('limit101', 10, { note: 'kept' });
    const draft = new CubeRowCountDraft(limit);
    expect(draft.sizeText).toBe('10');
    expect(draft.size).toBe(10);
    expect(draft.build()).toBe(limit);
  });

  test('Builds the typed size, with the same id and saved keys', () => {
    const limit = new Limit('limit101', 10, { note: 'kept' });
    const draft = new CubeRowCountDraft(limit);
    draft.setSizeText('5');
    const built = draft.build();
    expect(built).toBeInstanceOf(Limit);
    expect(built.id).toBe('limit101');
    expect(built.size).toBe(5);
    expect(built.rest).toBe(limit.rest);
  });

  test('Gives the original back once the size is typed back', () => {
    const limit = new Limit('limit101', 10);
    const draft = new CubeRowCountDraft(limit);
    draft.setSizeText('5');
    draft.setSizeText(' 10');
    expect(draft.build()).toBe(limit);
  });

  test.each(['', '1.5', '1e3', '0x10', 'ten'])(
    'Builds a cleared size from %j, never the default',
    (text) => {
      const draft = new CubeRowCountDraft(new Limit('limit101', 10));
      draft.setSizeText(text);
      expect(draft.size).toBeUndefined();
      const built = draft.build();
      expect(built.size).toBeUndefined();
      expect(built.describe()).toBe('Take first (blank) row(s)');
    },
  );

  test('Keeps sizes the node refuses, for the panel to report', () => {
    const draft = new CubeRowCountDraft(new Limit('limit101', 10));
    draft.setSizeText('0');
    expect(draft.build().size).toBe(0);
    draft.setSizeText('-3');
    expect(draft.build().size).toBe(-3);
  });

  test('Opens a cleared size as an empty field', () => {
    const limit = new Limit('limit101', undefined);
    const draft = new CubeRowCountDraft(limit);
    expect(draft.sizeText).toBe('');
    expect(draft.build()).toBe(limit);
    // still cleared after typing nothing useful: the same content
    draft.setSizeText(' ');
    expect(draft.build()).toBe(limit);
    draft.setSizeText('20');
    expect(draft.build().size).toBe(20);
  });
});
