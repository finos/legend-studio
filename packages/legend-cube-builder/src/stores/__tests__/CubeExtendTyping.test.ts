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
  Connection,
  createNodeRegistry,
  Extend,
  type ExtendColumn,
  getExtendSignature,
  type JsonObject,
  type NodeRegistry,
  PrimitiveType,
  printIR,
  Query,
  Schema,
  SchemaColumn,
} from '@finos/legend-cube';
import {
  northwindTable,
  ORDERS_COLUMNS,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../../graph-manager/CubeEngine.js';
import {
  buildCubeExtendTypingLambdas,
  readCubeExtendTyping,
} from '../CubeExtendTyping.js';

const registry = (): NodeRegistry => createNodeRegistry();

const LAMBDA: JsonObject = {
  _type: 'lambda',
  parameters: [{ _type: 'var', name: 'x' }],
  body: [{ _type: 'integer', value: '1' }],
};
const COLUMNS: ExtendColumn[] = [
  { name: 'a', code: 'x | 1', lambda: LAMBDA },
  { name: 'b', code: 'x | 1', lambda: LAMBDA },
];
const TYPING_COLUMNS = COLUMNS.map(({ name }) => ({ name, lambda: LAMBDA }));
const EXTEND = new Extend('extend101', COLUMNS);
const INPUT = new Schema(ORDERS_COLUMNS);
const QUERY = new Query(
  [northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS), EXTEND],
  [new Connection('relational101', 'extend101', 'tds')],
  'extend101',
);

const withColumns = (...names: string[]): Schema =>
  new Schema([
    ...ORDERS_COLUMNS,
    ...names.map(
      (name) => new SchemaColumn(name, PrimitiveType.get('Integer'), false),
    ),
  ]);

describe('Extend typing lambdas', () => {
  test("Types the input's relation, then the first k columns, for every k, the stored lambdas marked with the Extend", () => {
    const lambdas = buildCubeExtendTypingLambdas(
      QUERY,
      EXTEND,
      TYPING_COLUMNS,
      registry(),
      false,
    );
    expect([...lambdas.keys()]).toEqual(['extend101#1', 'extend101#2']);
    const second = printIR(lambdas.get('extend101#2') as never);
    expect(second).toMatch(
      /^\{\| #>\{.*ORDERS\}#->extend\(~\[a: <lambda .*>\]\)->extend\(~\[b: <lambda .*>\]\)\}$/u,
    );
  });
});

describe('Extend typing answers', () => {
  test("Gives every column's type from the whole chain, for the input and the Extend's columns", () => {
    const { typing, error } = readCubeExtendTyping(
      new Map([
        ['extend101#1', withColumns('a')],
        ['extend101#2', withColumns('a', 'b')],
      ]),
      EXTEND,
      INPUT,
      TYPING_COLUMNS,
    );
    expect(error).toBeUndefined();
    expect(typing).toEqual({
      kind: 'typed',
      signature: getExtendSignature(INPUT, COLUMNS),
      types: [PrimitiveType.get('Integer'), PrimitiveType.get('Integer')],
    });
  });

  test('Names the first column whose chain fails, with its error', () => {
    const failure = new CubeEngineError(
      CubeEngineErrorKind.COMPILE,
      "The column 'NOPE' can't be found - Context:[Processing return type]\nmore",
      'extend101',
    );
    const { typing, error } = readCubeExtendTyping(
      new Map<string, Schema | CubeEngineError>([
        ['extend101#1', withColumns('a')],
        ['extend101#2', failure],
      ]),
      EXTEND,
      INPUT,
      TYPING_COLUMNS,
    );
    expect(error === failure).toBe(true);
    expect(typing).toEqual({
      kind: 'failed',
      signature: getExtendSignature(INPUT, COLUMNS),
      message: "The column 'NOPE' can't be found\nmore",
      column: 1,
    });
  });

  test('Names no column when the engine could not be reached', () => {
    const network = new CubeEngineError(
      CubeEngineErrorKind.NETWORK,
      'Failed to fetch',
    );
    const { typing } = readCubeExtendTyping(
      new Map([
        ['extend101#1', network],
        ['extend101#2', network],
      ]),
      EXTEND,
      INPUT,
      TYPING_COLUMNS,
    );
    expect(typing.kind === 'failed' && typing.column).toBeUndefined();
  });
});
