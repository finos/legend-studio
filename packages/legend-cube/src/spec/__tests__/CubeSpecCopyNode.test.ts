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
import { UnknownNode } from '../../nodes/UnknownNode.js';
import { RelationalTableSource } from '../../nodes/sources/RelationalTableSource.js';
import { Limit } from '../../nodes/transforms/Limit.js';
import { Sort, SortDirection } from '../../nodes/transforms/Sort.js';
import { Schema } from '../../schema/Schema.js';
import { copyQueryNode } from '../CubeSpecCodec.js';

describe('Copying a node', () => {
  test('Copies a transform under a new id, its settings the same', () => {
    const sort = new Sort('sort101', [
      { column: 'FREIGHT', direction: SortDirection.DESC },
    ]);
    const copy = copyQueryNode(sort, 'sort102') as Sort;
    expect(copy).toBeInstanceOf(Sort);
    expect(copy.id).toBe('sort102');
    expect(copy.sorts).toEqual(sort.sorts);
    expect(copy).not.toBe(sort);
    expect(
      (copyQueryNode(new Limit('limit101', 5), 'limit102') as Limit).size,
    ).toBe(5);
  });

  test('Keeps the columns a source was typed with', () => {
    const schema = new Schema([]);
    const table = new RelationalTableSource(
      'relational101',
      { database: 'db::Db', schema: 'S', table: 'T' },
      { kind: 'resolved', schema },
    );
    const copy = copyQueryNode(table, 'relational102') as RelationalTableSource;
    expect(copy.id).toBe('relational102');
    expect(copy.table).toBe('T');
    expect(copy.resolution).toEqual({ kind: 'resolved', schema });
  });

  test("Doesn't copy a node of a type Cube doesn't know", () => {
    expect(
      copyQueryNode(new UnknownNode('mystery101', 0, { kind: 'mystery' }), 'x'),
    ).toBeUndefined();
  });
});
