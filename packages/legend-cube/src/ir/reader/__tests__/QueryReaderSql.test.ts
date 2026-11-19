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
import { unitTest } from '../../../__test-utils__/CubeTestUtils.js';
import {
  column,
  resolvedTable,
} from '../../../__test-utils__/CubeTestNodes.js';
import { UnknownNode } from '../../../nodes/UnknownNode.js';
import {
  func,
  literal,
  sqlAccessor,
  storeAccessor,
  variable,
  type IR,
} from '../../CubeIR.js';
import { printIR } from '../../IRPrinter.js';
import { isSameCubeIR } from '../CubeIRComparison.js';
import {
  CUBE_QUERY_READER_MESSAGE,
  findCubeFreeVariables,
  findCubeLambdaSources,
  isCubeLambdaSource,
  readCubeQuery,
  type CubeQueryReadOptions,
} from '../QueryReader.js';
import type { CubeLambdaParts } from '../CubeLambdaParts.js';

// The engine's SQL island, `#SQL{…}#`: a source Cube keeps as written, whose
// step reads the lets its SQL names

const ORDERS = storeAccessor(['test::Store', 'default', 'ORDERS']);

const NO_EXPRESSIONS: CubeQueryReadOptions['expressions'] = {
  read: () => {
    throw new Error('no expression is read here');
  },
  write: () => {
    throw new Error('no expression is written here');
  },
};

/** The host's step for each source: a table, or one box for SQL, a port per let it reads */
const bindSource: CubeQueryReadOptions['bindSource'] = (source: IR) =>
  source.k === 'sqlAccessor'
    ? {
        type: UnknownNode.TYPE,
        create: (id, inputCount) =>
          new UnknownNode(id, inputCount ?? 0, {
            kind: 'sql',
            sql: source.sql,
          }),
      }
    : {
        type: 'relational',
        create: (id) =>
          resolvedTable(id, 'ORDERS', [column('ID'), column('AMOUNT')]),
      };

const read = (parts: Partial<CubeLambdaParts> & { relation: IR }) =>
  readCubeQuery(
    { lets: new Map(), limitBesideFrom: false, ...parts },
    { bindSource, expressions: NO_EXPRESSIONS, forDrawing: true },
  );

const limit = (rows: IR): IR =>
  func('limit', [rows, literal({ kind: 'integer', value: '10' })]);

describe(unitTest('An SQL island in a lambda'), () => {
  test('Is a source, printed and compared as its SQL is written', () => {
    const island = sqlAccessor('select * from t');
    expect(isCubeLambdaSource(island)).toBe(true);
    expect(printIR(island)).toBe('#SQL{select * from t}#');
    expect(isSameCubeIR(island, sqlAccessor('select * from t'))).toBe(true);
    // Cube reads none of it, so another wording is another relation
    expect(isSameCubeIR(island, sqlAccessor('SELECT * FROM t'))).toBe(false);
    expect(
      findCubeLambdaSources({
        relation: limit(island),
        lets: new Map(),
        limitBesideFrom: false,
      }),
    ).toEqual([island]);
  });

  test('Is one step with no input, the steps after it read as usual', () => {
    const { query, unchecked } = read({
      relation: limit(sqlAccessor('select * from t')),
    });
    expect(query.nodes.map((node) => node.id)).toEqual([
      'unknown101',
      'limit101',
    ]);
    expect(
      query.connections.map((connection) => connection.toString()),
    ).toEqual(['unknown101 → limit101 (tds)']);
    // its columns aren't known
    expect(unchecked).toEqual(['limit101']);
  });

  test('Reads the lets its SQL names as its inputs, in the order it names them', () => {
    const { query } = read({
      relation: sqlAccessor(
        "select * from var('big') b join var('all') a on a.ID = b.ID",
        ['big', 'all'],
      ),
      lets: new Map([
        ['all', ORDERS],
        ['big', limit(variable('all'))],
      ]),
    });
    // the sources of the lets it reads are found for the host to bind
    expect(
      findCubeLambdaSources({
        relation: sqlAccessor("select * from var('all')", ['all']),
        lets: new Map([['all', ORDERS]]),
        limitBesideFrom: false,
      }).map((source) => source.k),
    ).toEqual(['sqlAccessor', 'storeAccessor']);
    // a let is read where it is read, as any step reads one: `all` twice
    expect(query.nodes.map((node) => node.id)).toEqual([
      'relational101',
      'limit101',
      'relational102',
      'unknown101',
    ]);
    expect(
      query.connections.map((connection) => connection.toString()),
    ).toEqual([
      'relational101 → limit101 (tds)',
      'limit101 → unknown101 (in0)',
      'relational102 → unknown101 (in1)',
    ]);
  });

  test('Reads a let that binds a value without taking it as an input', () => {
    // no refusal for a let no step reads: the SQL reads it
    const { query } = read({
      relation: sqlAccessor("select * from t where D > var('cutoff')", [
        'cutoff',
      ]),
      lets: new Map([['cutoff', literal({ kind: 'integer', value: '5' })]]),
    });
    expect(query.nodes.map((node) => node.id)).toEqual(['unknown101']);
    expect(query.connections).toEqual([]);
  });

  test('Still refuses a let that nothing reads, the SQL included', () => {
    expect(() =>
      read({
        relation: sqlAccessor('select * from t'),
        lets: new Map([['unused', ORDERS]]),
      }),
    ).toThrow(CUBE_QUERY_READER_MESSAGE.UNREAD_LET('unused'));
  });

  test("Notes the lambda's parameters its SQL reads, and ignores a name nothing binds", () => {
    const island = sqlAccessor(
      "select * from t where D > var('since') and R = var('other')",
      ['since', 'other'],
    );
    const { query, parameterReads } = read({
      relation: limit(island),
      parameters: ['since', 'region'],
    });
    expect(query.nodes.map((node) => node.id)).toEqual([
      'unknown101',
      'limit101',
    ]);
    expect([...parameterReads.entries()]).toEqual([['unknown101', ['since']]]);
    expect(findCubeFreeVariables(island, NO_EXPRESSIONS.read)).toEqual([
      'since',
      'other',
    ]);
  });
});
