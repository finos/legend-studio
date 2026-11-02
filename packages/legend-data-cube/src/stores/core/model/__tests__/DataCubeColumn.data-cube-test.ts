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

import { unitTest } from '@finos/legend-shared/test';
import { describe, expect, test } from '@jest/globals';
import {
  _findCol,
  reuseTypeVariableValues,
  _sortByColName,
  _toCol,
} from '../DataCubeColumn.js';

describe(unitTest('Column model utils'), () => {
  test('finds a column by name', () => {
    const columns = [
      { name: 'id', type: 'Integer' },
      { name: 'name', type: 'String' },
    ];
    expect(_findCol(columns, 'name')).toBe(columns[1]);
    expect(_findCol(columns, 'missing')).toBeUndefined();
    expect(_findCol(undefined, 'name')).toBeUndefined();
  });

  test('sorts columns by name', () => {
    const columns = [{ name: 'b' }, { name: 'a' }, { name: 'c' }];
    expect([...columns].sort(_sortByColName).map((col) => col.name)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  test('builds a column without type variable values', () => {
    expect(_toCol({ name: 'id', type: 'Integer' })).toEqual({
      name: 'id',
      type: 'Integer',
    });
    expect(
      _toCol({ name: 'id', type: 'Integer', typeVariableValues: [] }),
    ).toEqual({ name: 'id', type: 'Integer' });
  });

  test('builds a column with a copy of its type variable values', () => {
    const typeVariableValues = [18, 4];
    const column = _toCol({
      name: 'price',
      type: 'Numeric',
      typeVariableValues,
    });
    expect(column).toEqual({
      name: 'price',
      type: 'Numeric',
      typeVariableValues: [18, 4],
    });
    // the array is copied, not referenced
    typeVariableValues.push(0);
    expect(column.typeVariableValues).toEqual([18, 4]);
  });

  test('reuses the type variable values of a matching known column', () => {
    const knownColumn = {
      type: 'Varchar',
      typeVariableValues: [200],
    };
    expect(reuseTypeVariableValues(knownColumn, 'Varchar')).toEqual([200]);
  });

  test('does not reuse type variable values when the type does not match', () => {
    const knownColumn = {
      type: 'Varchar',
      typeVariableValues: [200],
    };
    expect(reuseTypeVariableValues(knownColumn, 'Numeric')).toBeUndefined();
  });

  test('does not reuse type variable values when there is no known column', () => {
    expect(reuseTypeVariableValues(undefined, 'Varchar')).toBeUndefined();
  });

  test('does not reuse type variable values when the known column has none', () => {
    expect(
      reuseTypeVariableValues({ type: 'Varchar' }, 'Varchar'),
    ).toBeUndefined();
  });
});
