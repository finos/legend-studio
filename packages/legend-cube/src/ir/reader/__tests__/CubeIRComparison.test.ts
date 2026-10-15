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
import {
  collection,
  colSpec,
  columnAccess,
  EmitRole,
  enumValue,
  func,
  lambda,
  lambdaJson,
  letBinding,
  literal,
  storeAccessor,
  variable,
  type IR,
} from '../../CubeIR.js';
import { JOIN_KIND_PATH } from '../../emitters/JoinEmitter.js';
import { getCanonicalNumberText, isSameCubeIR } from '../CubeIRComparison.js';

const TABLE = storeAccessor(['db::Store', 'S', 'T']);
const keep = (predicate: IR, row = 'row'): IR =>
  func('filter', [TABLE, lambda([row], [predicate])]);

describe('Comparing lambdas Cube reads with the ones it writes', () => {
  test('Writes each number one way, whatever its digits', () => {
    expect(getCanonicalNumberText('1.50')).toBe(getCanonicalNumberText('1.5'));
    expect(getCanonicalNumberText('15e-1')).toBe(getCanonicalNumberText('1.5'));
    expect(getCanonicalNumberText('0.0')).toBe('0');
    expect(getCanonicalNumberText('-0')).toBe('0');
    expect(getCanonicalNumberText('1000')).toBe(getCanonicalNumberText('1e3'));
    expect(getCanonicalNumberText('-42')).toBe('-42');
    expect(getCanonicalNumberText('2')).not.toBe(getCanonicalNumberText('20'));
  });

  test('Compares numbers by value, within their kind', () => {
    const float = (value: string): IR => literal({ kind: 'float', value });
    expect(isSameCubeIR(float('0.0'), float('0'))).toBe(true);
    expect(
      isSameCubeIR(
        literal({ kind: 'decimal', value: '1.50' }),
        literal({ kind: 'decimal', value: '1.5' }),
      ),
    ).toBe(true);
    expect(
      isSameCubeIR(float('0'), literal({ kind: 'integer', value: '0' })),
    ).toBe(false);
    expect(isSameCubeIR(float('1'), float('2'))).toBe(false);
  });

  test('Compares bound variables and lets by position, origins aside', () => {
    const condition = (row: string): IR =>
      func('greaterThan', [
        columnAccess(row, 'QTY'),
        literal({ kind: 'integer', value: '10' }),
      ]);
    expect(
      isSameCubeIR(keep(condition('row')), keep(condition('x'), 'x')),
    ).toBe(true);
    // a variable bound on one side only isn't the same
    expect(
      isSameCubeIR(keep(condition('row')), keep(condition('row'), 'x')),
    ).toBe(false);
    expect(
      isSameCubeIR(
        func('limit', [TABLE, literal({ kind: 'integer', value: '5' })], {
          nodeId: 'limit1',
          role: EmitRole.TAKE,
        }),
        func('limit', [TABLE, literal({ kind: 'integer', value: '5' })]),
      ),
    ).toBe(true);
    const withLet = (name: string): IR =>
      lambda(
        [],
        [
          letBinding(name, TABLE),
          func('limit', [
            variable(name),
            literal({ kind: 'integer', value: '1' }),
          ]),
        ],
      );
    expect(isSameCubeIR(withLet('n_partition1'), withLet('n_1'))).toBe(true);
  });

  test("Reads a sort's one key alone or in a list, and an enumeration's short path as its full one", () => {
    const key = func('ascending', [colSpec('A')]);
    expect(
      isSameCubeIR(
        func('sort', [TABLE, key]),
        func('sort', [TABLE, collection([key])]),
      ),
    ).toBe(true);
    expect(
      isSameCubeIR(
        enumValue('JoinKind', 'INNER'),
        enumValue(JOIN_KIND_PATH, 'INNER'),
      ),
    ).toBe(true);
    expect(
      isSameCubeIR(
        func('meta::pure::functions::relation::limit', [TABLE]),
        func('limit', [TABLE]),
      ),
    ).toBe(true);
  });

  test("Compares an expression's JSON with the IR it reads to", () => {
    const json = { _type: 'lambda', parameters: [], body: [] };
    expect(
      isSameCubeIR(lambdaJson(json), lambda([], []), {
        readExpression: () => lambda([], []),
      }),
    ).toBe(true);
    // without a reader, as JSON, source information aside
    expect(
      isSameCubeIR(
        lambdaJson({ ...json, sourceInformation: { sourceId: 'cube:a:b' } }),
        lambdaJson(json),
      ),
    ).toBe(true);
  });
});
