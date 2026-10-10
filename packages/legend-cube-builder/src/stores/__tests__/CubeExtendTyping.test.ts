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
  AggregationFunction,
  Connection,
  createNodeRegistry,
  ERR_TYPING,
  Extend,
  type ExtendColumn,
  getExtendSignature,
  type JsonObject,
  type ModelContext,
  type NodeRegistry,
  Partition,
  PrimitiveType,
  printIR,
  Query,
  QueryEmitter,
  Schema,
  SchemaColumn,
  SortDirection,
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
  createStaleCubeExtendTypingRule,
  getCubeExtendUpstream,
  isCubeExtendTypingCurrent,
  isSameCubeExtendTyping,
  readCubeExtendTyping,
} from '../CubeExtendTyping.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';

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
      'upstream1',
    );
    expect(error).toBeUndefined();
    expect(typing).toEqual({
      kind: 'typed',
      signature: getExtendSignature(INPUT, COLUMNS),
      types: [PrimitiveType.get('Integer'), PrimitiveType.get('Integer')],
      upstream: 'upstream1',
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
      'upstream1',
    );
    expect(error === failure).toBe(true);
    expect(typing).toEqual({
      kind: 'failed',
      signature: getExtendSignature(INPUT, COLUMNS),
      message: "The column 'NOPE' can't be found\nmore",
      column: 1,
      upstream: 'upstream1',
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
      undefined,
    );
    expect(typing.kind === 'failed' && typing.column).toBeUndefined();
  });
});

/** `x | $x.<column>`, as the engine's JSON */
const columnLambda = (column: string, toOne = false): JsonObject => {
  const access: JsonObject = {
    _type: 'property',
    property: column,
    parameters: [{ _type: 'var', name: 'x' }],
  };
  return {
    _type: 'lambda',
    parameters: [{ _type: 'var', name: 'x' }],
    body: [
      toOne
        ? { _type: 'func', function: 'toOne', parameters: [access] }
        : access,
    ],
  };
};

/** ORDERS, then extend101 (a = SHIP_CITY, with `->toOne()` or not), then extend102 (b = a) */
const chainOf = (toOne: boolean): Query => {
  const first: ExtendColumn[] = [
    {
      name: 'a',
      code: 'x | $x.SHIP_CITY',
      lambda: columnLambda('SHIP_CITY', toOne),
    },
  ];
  const second: ExtendColumn[] = [
    { name: 'b', code: 'x | $x.a', lambda: columnLambda('a') },
  ];
  return new Query(
    [
      northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
      new Extend('extend101', first),
      new Extend('extend102', second),
    ],
    [
      new Connection('relational101', 'extend101', 'tds'),
      new Connection('extend101', 'extend102', 'tds'),
    ],
    'extend102',
  );
};

const VARCHAR = PrimitiveType.get('Varchar', [15]);

/** The query with each Extend typed for its input as it is, recording what the engine is given */
const typedChain = (query: Query, model: ModelContext): Query => {
  let input = INPUT;
  return ['extend101', 'extend102'].reduce((typed, id) => {
    // the Extend above is typed by now, so the input can be emitted
    const emitter = new QueryEmitter(typed, registry());
    const node = typed.getNode(id) as Extend;
    const next = typed.replace(
      node.withTyping({
        kind: 'typed',
        signature: getExtendSignature(input, node.columns),
        types: [VARCHAR],
        upstream: getCubeExtendUpstream(emitter, id, model),
      }),
    );
    input = new Schema([
      ...input.columns,
      new SchemaColumn(node.columns[0]?.name ?? '', VARCHAR, true),
    ]);
    return next;
  }, query);
};

describe('Extend typing upstreams', () => {
  const OTHER_MODEL: ModelContext = { ...CUBE_NORTHWIND_MODEL, code: '' };

  test('Digests the input as the engine is given it: its relation and the model', () => {
    const emitterOf = (toOne: boolean): QueryEmitter =>
      new QueryEmitter(
        typedChain(chainOf(toOne), CUBE_NORTHWIND_MODEL),
        registry(),
      );
    const emitter = emitterOf(true);
    const upstream = getCubeExtendUpstream(
      emitter,
      'extend102',
      CUBE_NORTHWIND_MODEL,
    );
    expect(upstream).toMatch(/^[0-9a-f]{13,14}$/u);
    expect(
      getCubeExtendUpstream(emitterOf(true), 'extend102', CUBE_NORTHWIND_MODEL),
    ).toBe(upstream);
    // an Extend above that drops ->toOne(): Cube's schema is the same
    expect(
      getCubeExtendUpstream(
        emitterOf(false),
        'extend102',
        CUBE_NORTHWIND_MODEL,
      ),
    ).not.toBe(upstream);
    // an Extend above that waits to be typed can't be emitted
    expect(
      getCubeExtendUpstream(
        new QueryEmitter(chainOf(true), registry()),
        'extend102',
        CUBE_NORTHWIND_MODEL,
      ),
    ).toBeUndefined();
    expect(getCubeExtendUpstream(emitter, 'extend102', OTHER_MODEL)).not.toBe(
      upstream,
    );
    // no input to emit
    expect(
      getCubeExtendUpstream(
        new QueryEmitter(new Query([EXTEND], [], 'extend101'), registry()),
        'extend101',
        CUBE_NORTHWIND_MODEL,
      ),
    ).toBeUndefined();
  });

  test('Digests the input the same whichever node runs, a window above it included', () => {
    // a run binds a Partition that isn't the one run with a let; typing never does
    const partition = new Partition(
      'partition101',
      ['SHIP_COUNTRY'],
      [{ column: 'ORDER_DATE', direction: SortDirection.ASC }],
      [
        {
          column: 'ORDER_DATE',
          function: AggregationFunction.MIN,
          name: 'First order',
        },
      ],
    );
    const nodes = [
      northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
      partition,
      new Extend('extend101', [COLUMNS[0] as ExtendColumn]),
    ];
    const query = new Query(
      nodes,
      [
        new Connection('relational101', 'partition101', 'tds'),
        new Connection('partition101', 'extend101', 'tds'),
      ],
      'extend101',
    );
    const upstreamOf = (of: Query): string | undefined =>
      getCubeExtendUpstream(
        new QueryEmitter(of, registry()),
        'extend101',
        CUBE_NORTHWIND_MODEL,
      );
    const upstream = upstreamOf(query);
    expect(upstream).toBeDefined();
    expect(upstreamOf(query.select('relational101'))).toBe(upstream);
    expect(upstreamOf(query.select('partition101'))).toBe(upstream);
  });

  test('Makes an Extend typed for another input wait, but not one typed for this input or recorded without it', () => {
    let model = CUBE_NORTHWIND_MODEL;
    const rule = createStaleCubeExtendTypingRule(registry(), () => model);
    const typed = typedChain(chainOf(true), model);
    expect(rule(typed)).toEqual(new Map());
    // extend101 drops ->toOne(), and is typed again: extend102 is stale,
    // though Cube's schema for its input is the same
    const edited = typedChain(chainOf(false), model).replace(
      typed.getNode('extend102') as Extend,
    );
    expect(rule(edited)).toEqual(new Map([['extend102', [ERR_TYPING]]]));
    // another model: both
    model = OTHER_MODEL;
    expect([...rule(typed).keys()]).toEqual(['extend101', 'extend102']);
    // a typing that recorded nothing, as one loaded, is used as it is
    const second = edited.getNode('extend102') as Extend;
    const loaded = edited.replace(
      second.withTyping({
        kind: 'typed',
        signature:
          second.typing.kind === 'typed' ? second.typing.signature : '',
        types: [VARCHAR],
      }),
    );
    model = CUBE_NORTHWIND_MODEL;
    expect(rule(loaded)).toEqual(new Map());
  });

  test('Tells typings apart by what the engine was given, and keeps one current for this input', () => {
    const typing = {
      kind: 'typed' as const,
      signature: getExtendSignature(INPUT, COLUMNS),
      types: [PrimitiveType.get('Integer'), PrimitiveType.get('Integer')],
    };
    expect(
      isSameCubeExtendTyping(
        { ...typing, upstream: 'a' },
        { ...typing, upstream: 'a' },
      ),
    ).toBe(true);
    expect(isSameCubeExtendTyping({ ...typing, upstream: 'a' }, typing)).toBe(
      false,
    );
    expect(
      isSameCubeExtendTyping(
        { ...typing, upstream: 'a' },
        { ...typing, upstream: 'b' },
      ),
    ).toBe(false);
    const recorded = EXTEND.withTyping({ ...typing, upstream: 'a' });
    expect(isCubeExtendTypingCurrent(recorded, INPUT, 'a')).toBe(true);
    expect(isCubeExtendTypingCurrent(recorded, INPUT, 'b')).toBe(false);
    expect(
      isCubeExtendTypingCurrent(EXTEND.withTyping(typing), INPUT, 'b'),
    ).toBe(true);
    expect(isCubeExtendTypingCurrent(recorded, withColumns('c'), 'a')).toBe(
      false,
    );
  });
});
