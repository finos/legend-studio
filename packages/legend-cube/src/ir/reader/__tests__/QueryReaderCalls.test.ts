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
  lambda,
  literal,
  storeAccessor,
  variable,
  type IR,
} from '../../CubeIR.js';
import { CubeLambdaReadError } from '../CubeLambdaReadError.js';
import {
  CUBE_QUERY_READER_MESSAGE,
  findCubeFreeVariables,
  getCubeRelationInputCount,
  readCubeQuery,
  type CubeCallStep,
  type CubeQueryReadOptions,
} from '../QueryReader.js';

// A call the host reads as one step (PLAN §11.33): e.g. a user-defined
// function a definition's flow can't open, drawn as one box, whose relations
// are its inputs

const ORDERS = storeAccessor(['test::Store', 'default', 'ORDERS']);
const CUSTOMERS = storeAccessor(['test::Store', 'default', 'CUSTOMERS']);

const bindSource = (source: IR) => ({
  type: 'relational',
  create: (id: string) =>
    resolvedTable(
      id,
      source.k === 'storeAccessor' ? (source.path.at(-1) ?? '') : 'OTHER',
      [column('ID'), column('AMOUNT')],
    ),
});

const NO_EXPRESSIONS: CubeQueryReadOptions['expressions'] = {
  read: () => {
    throw new Error('no expression is read here');
  },
  write: () => {
    throw new Error('no expression is written here');
  },
};

/** `my::onlyOpen(rows)`, `my::merge(left, right)`: one step, its relations its inputs */
const bindCall = (
  call: Extract<IR, { readonly k: 'func' }>,
): CubeCallStep | undefined => {
  const inputs =
    call.name === 'my::onlyOpen'
      ? [0]
      : call.name === 'my::merge'
        ? [0, 1]
        : undefined;
  return inputs
    ? {
        type: UnknownNode.TYPE,
        inputs,
        create: (id) =>
          new UnknownNode(id, inputs.length, {
            kind: 'function',
            function: call.name,
          }),
      }
    : undefined;
};

const read = (relation: IR, withCalls = true) =>
  readCubeQuery(
    { relation, lets: new Map(), limitBesideFrom: false },
    {
      bindSource,
      ...(withCalls ? { bindCall } : {}),
      expressions: NO_EXPRESSIONS,
      forDrawing: true,
    },
  );

describe(unitTest('A call the host reads as one step'), () => {
  test('Reads its relations first, as its inputs in order, then the steps after it', () => {
    const { query } = read(
      func('limit', [
        func('my::merge', [
          ORDERS,
          CUSTOMERS,
          literal({ kind: 'string', value: 'EMEA' }),
        ]),
        literal({ kind: 'integer', value: '10' }),
      ]),
    );
    expect(query.nodes.map((node) => node.id)).toEqual([
      'relational101',
      'relational102',
      'unknown101',
      'limit101',
    ]);
    expect(
      query.connections.map((connection) => connection.toString()),
    ).toEqual([
      'relational101 → unknown101 (in0)',
      'relational102 → unknown101 (in1)',
      'unknown101 → limit101 (tds)',
    ]);
    expect(query.selected).toBe('limit101');
  });

  test('Takes a call with no relation as a step with no input, before any source is bound', () => {
    const { query } = read(
      func('my::onlyOpen', [func('my::onlyOpen', [ORDERS])]),
    );
    expect(query.nodes.map((node) => node.id)).toEqual([
      'relational101',
      'unknown101',
      'unknown102',
    ]);
  });

  test('Reads any other call as before: a call the host takes no step for is a source', () => {
    const sources: IR[] = [];
    readCubeQuery(
      {
        relation: func('limit', [
          func('my::other', [ORDERS]),
          literal({ kind: 'integer', value: '5' }),
        ]),
        lets: new Map(),
        limitBesideFrom: false,
      },
      {
        bindSource: (source) => {
          sources.push(source);
          return bindSource(source);
        },
        bindCall,
        expressions: NO_EXPRESSIONS,
        forDrawing: true,
      },
    );
    expect(
      sources.map((source) => (source.k === 'func' ? source.name : source.k)),
    ).toEqual(['my::other']);
  });

  test("Refuses a call that takes the rows of the lambda's parameter, as any other read of them", () => {
    expect(() =>
      readCubeQuery(
        {
          relation: func('my::onlyOpen', [variable('rows')]),
          lets: new Map(),
          limitBesideFrom: false,
          parameters: ['rows'],
        },
        { bindSource, bindCall, expressions: NO_EXPRESSIONS, forDrawing: true },
      ),
    ).toThrow(CUBE_QUERY_READER_MESSAGE.PARAMETER_ROWS('rows'));
  });

  test('Refuses a call whose relation is missing', () => {
    expect(() => read(func('my::merge', [ORDERS]))).toThrow(
      CubeLambdaReadError,
    );
  });
});

describe(unitTest("The reader's helpers, for a host that opens calls"), () => {
  test('Tells how many relations a function Cube reads as a step takes first', () => {
    expect(getCubeRelationInputCount('filter')).toBe(1);
    expect(getCubeRelationInputCount('join')).toBe(2);
    expect(
      getCubeRelationInputCount('meta::pure::functions::relation::concatenate'),
    ).toBe(2);
    expect(getCubeRelationInputCount('my::onlyOpen')).toBeUndefined();
  });

  test('Lists the variables an expression reads that it does not bind, in order', () => {
    expect(
      findCubeFreeVariables(
        func('and', [
          func('greaterThan', [variable('x'), variable('since')]),
          lambda(['x'], [func('equal', [variable('x'), variable('region')])]),
        ]),
        () => literal({ kind: 'integer', value: '0' }),
      ),
    ).toEqual(['x', 'since', 'region']);
  });
});
