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
  aggregationColSpec,
  colSpec,
  colSpecArray,
  collection,
  columnAccess,
  ColumnComparisonFilter,
  EmitRole,
  elementPtr,
  enumValue,
  FilterOperator,
  func,
  genericType,
  type IR,
  lambda,
  literal,
  NotFilter,
  type Origin,
  QueryEmitter,
  storeAccessor,
  variable,
} from '@finos/legend-cube';
import { stringifyLosslessJSON, type PlainObject } from '@finos/legend-shared';
import {
  fullJoinQuery,
  NORTHWIND_RUNTIME,
  sliceQuery,
} from '../../../../../__test-utils__/CubeNorthwindTestQueries.js';
import {
  V1_buildCubeSourceId,
  V1_parseCubeSourceId,
  V1_serializeCubeLambda,
} from '../V1_CubeLambdaSerializer.js';

const ORIGIN: Origin = { nodeId: 'filter101', role: EmitRole.PREDICATE };
const SOURCE_ID = 'cube:filter101:predicate';

/** The JSON a request body would hold, numbers written digit for digit */
const text = (ir: IR): string =>
  stringifyLosslessJSON(V1_serializeCubeLambda(ir));

/** The body of `{| <ir>}`, as plain JSON (numbers must be safe) */
const bodyOf = (ir: IR): unknown =>
  (JSON.parse(text(lambda([], [ir]))) as { body: unknown[] }).body[0];

const withoutSourceInformation = (json: unknown): unknown =>
  JSON.parse(
    JSON.stringify(json, (key, value: unknown) =>
      key === 'sourceInformation' ? undefined : value,
    ),
  );

/** Every source id in the JSON, in document order */
const sourceIds = (json: unknown): string[] => {
  const ids: string[] = [];
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (value && typeof value === 'object') {
      Object.entries(value as PlainObject).forEach(([key, child]) => {
        if (key === 'sourceInformation') {
          ids.push((child as { sourceId: string }).sourceId);
        } else {
          visit(child);
        }
      });
    }
  };
  visit(json);
  return ids;
};

/** The column specs a class instance holds: its own value, or each spec of its column list */
const columnSpecsOf = (object: PlainObject): unknown[] => {
  if (object._type === 'classInstance' && object.type === 'colSpec') {
    return [object.value];
  } else if (
    object._type === 'classInstance' &&
    object.type === 'colSpecArray'
  ) {
    return (object.value as { colSpecs: unknown[] }).colSpecs;
  }
  return [];
};

/**
 * The protocol nodes that carry no stamp, under the root: the objects with a
 * `_type`, and the column specs, which have none but take a stamp
 */
const unstampedNodes = (json: unknown): string[] => {
  const found: string[] = [];
  const columnSpecs = new Set<unknown>();
  const visit = (value: unknown, path: string): void => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}[${index}]`));
    } else if (value && typeof value === 'object') {
      const object = value as PlainObject;
      columnSpecsOf(object).forEach((spec) => columnSpecs.add(spec));
      const kind = columnSpecs.has(object) ? 'column spec' : object._type;
      if (
        path &&
        typeof kind === 'string' &&
        // a raw type is left unstamped: the engine reports on it only an
        // unknown type or wrong type parameters, which Cube's casts never have
        kind !== 'packageableType' &&
        !object.sourceInformation
      ) {
        found.push(`${path} (${kind})`);
      }
      Object.entries(object).forEach(([key, child]) => {
        if (key !== 'sourceInformation') {
          visit(child, path ? `${path}.${key}` : key);
        }
      });
    }
  };
  visit(json, '');
  return found;
};

/** Each variable in the JSON as `<name> <source id>`, in document order */
const variableStamps = (json: unknown): string[] => {
  const found: string[] = [];
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (value && typeof value === 'object') {
      const object = value as PlainObject;
      if (object._type === 'var') {
        found.push(
          `${String(object.name)} ${String((object.sourceInformation as { sourceId?: string } | undefined)?.sourceId)}`,
        );
      }
      Object.entries(object).forEach(([key, child]) => {
        if (key !== 'sourceInformation') {
          visit(child);
        }
      });
    }
  };
  visit(json);
  return found;
};

/** `~total: x | $x.B : y | $y->sum()`, a column spec with both functions */
const TOTAL: IR = {
  k: 'colSpec',
  name: 'total',
  fn1: lambda(['x'], [columnAccess('x', 'B')]),
  fn2: lambda(['y'], [func('sum', [variable('y')])]),
};

describe('Cube lambda serializer: shapes', () => {
  test('Writes a lambda with its parameters as variables and each statement in its body', () => {
    expect(JSON.parse(text(lambda(['l', 'r'], [variable('l')])))).toEqual({
      _type: 'lambda',
      parameters: [
        { _type: 'var', name: 'l' },
        { _type: 'var', name: 'r' },
      ],
      body: [{ _type: 'var', name: 'l' }],
    });
  });

  test('Writes a function call with its parameters in order, the receiver first', () => {
    expect(
      bodyOf(
        func('greaterThan', [
          columnAccess('row', 'QTY'),
          literal({ kind: 'integer', value: '5' }),
        ]),
      ),
    ).toEqual({
      _type: 'func',
      function: 'greaterThan',
      parameters: [
        {
          _type: 'property',
          property: 'QTY',
          parameters: [{ _type: 'var', name: 'row' }],
        },
        { _type: 'integer', value: 5 },
      ],
    });
  });

  test.each(['k.ey', 'a b', "it's", 'true', 'function', 'enforcementLevel'])(
    'Writes the column name %j as it is, unquoted',
    (name) => {
      expect(bodyOf(columnAccess('row', name))).toEqual({
        _type: 'property',
        property: name,
        parameters: [{ _type: 'var', name: 'row' }],
      });
    },
  );

  test.each<[string, Parameters<typeof literal>[0], unknown]>([
    ['a string', { kind: 'string', value: 'it\'s \\ "q"\n' }, 'it\'s \\ "q"\n'],
    ['a boolean', { kind: 'boolean', value: false }, false],
    ['an integer', { kind: 'integer', value: '-3' }, -3],
    ['a float', { kind: 'float', value: '1.5' }, 1.5],
    ['a decimal', { kind: 'decimal', value: '12.30' }, 12.3],
    ['a date', { kind: 'strictDate', value: '1997-01-01' }, '1997-01-01'],
    [
      'a date and time',
      { kind: 'dateTime', value: '2024-01-02T03:04:05.678' },
      '2024-01-02T03:04:05.678',
    ],
  ])('Writes %s by its kind', (_, value, written) => {
    expect(bodyOf(literal(value))).toEqual({
      _type: value.kind,
      value: written,
    });
  });

  test.each([
    '9007199254740993',
    '-9223372036854775808',
    '0.10000000000000000001',
    '12.30',
    '-1.5e3',
  ])('Writes the number %s digit for digit, as one token', (value) => {
    const kind =
      value.includes('.') || value.includes('e') ? 'decimal' : 'integer';
    expect(text(lambda([], [literal({ kind, value })]))).toBe(
      `{"_type":"lambda","parameters":[],"body":[{"_type":"${kind}","value":${value}}]}`,
    );
  });

  test('Refuses a number literal that is not a JSON number', () => {
    expect(() =>
      V1_serializeCubeLambda(
        lambda([], [literal({ kind: 'integer', value: '+5' })]),
      ),
    ).toThrow(`"+5" is not a number Cube can send`);
  });

  test('Refuses an enumeration value given as a literal', () => {
    expect(() =>
      V1_serializeCubeLambda(
        lambda([], [literal({ kind: 'enum', value: 'RED' })]),
      ),
    ).toThrow(`Can't send the enumeration value "RED" as a literal`);
  });

  test('Writes a list with its size as its multiplicity, a list of one or none included', () => {
    const one = literal({ kind: 'integer', value: '1' });
    expect(bodyOf(collection([one, one]))).toEqual({
      _type: 'collection',
      multiplicity: { lowerBound: 2, upperBound: 2 },
      values: [
        { _type: 'integer', value: 1 },
        { _type: 'integer', value: 1 },
      ],
    });
    expect(bodyOf(collection([one]))).toHaveProperty('multiplicity', {
      lowerBound: 1,
      upperBound: 1,
    });
    expect(bodyOf(collection([]))).toEqual({
      _type: 'collection',
      multiplicity: { lowerBound: 0, upperBound: 0 },
      values: [],
    });
  });

  test('Writes a column spec, with its functions, and a column list of bare specs', () => {
    expect(bodyOf(colSpec('A'))).toEqual({
      _type: 'classInstance',
      type: 'colSpec',
      value: { name: 'A' },
    });
    expect(
      bodyOf(colSpec('K', lambda(['x'], [columnAccess('x', 'K_1')]))),
    ).toEqual({
      _type: 'classInstance',
      type: 'colSpec',
      value: {
        name: 'K',
        function1: {
          _type: 'lambda',
          parameters: [{ _type: 'var', name: 'x' }],
          body: [
            {
              _type: 'property',
              property: 'K_1',
              parameters: [{ _type: 'var', name: 'x' }],
            },
          ],
        },
      },
    });
    // the second function is its own, never one built from the first
    const total = {
      name: 'total',
      function1: {
        _type: 'lambda',
        parameters: [{ _type: 'var', name: 'x' }],
        body: [
          {
            _type: 'property',
            property: 'B',
            parameters: [{ _type: 'var', name: 'x' }],
          },
        ],
      },
      function2: {
        _type: 'lambda',
        parameters: [{ _type: 'var', name: 'y' }],
        body: [
          {
            _type: 'func',
            function: 'sum',
            parameters: [{ _type: 'var', name: 'y' }],
          },
        ],
      },
    };
    expect(bodyOf(TOTAL)).toEqual({
      _type: 'classInstance',
      type: 'colSpec',
      value: total,
    });
    expect(bodyOf(colSpecArray([colSpec('A'), colSpec('B')]))).toEqual({
      _type: 'classInstance',
      type: 'colSpecArray',
      value: { colSpecs: [{ name: 'A' }, { name: 'B' }] },
    });
    expect(bodyOf(colSpecArray([colSpec('A'), TOTAL]))).toEqual({
      _type: 'classInstance',
      type: 'colSpecArray',
      value: { colSpecs: [{ name: 'A' }, total] },
    });
  });

  test("Writes a Group's aggregation column spec with both its functions, in the groupBy's aggregation list", () => {
    expect(
      bodyOf(
        func('groupBy', [
          storeAccessor(['db::Db', 'S', 'T']),
          colSpecArray([colSpec('K')]),
          colSpecArray([
            aggregationColSpec(
              'n',
              lambda(['x'], [columnAccess('x', 'C')]),
              lambda(['y'], [func('count', [variable('y')])]),
            ),
          ]),
        ]),
      ),
    ).toEqual({
      _type: 'func',
      function: 'groupBy',
      parameters: [
        {
          _type: 'classInstance',
          type: '>',
          value: { path: ['db::Db', 'S', 'T'] },
        },
        {
          _type: 'classInstance',
          type: 'colSpecArray',
          value: { colSpecs: [{ name: 'K' }] },
        },
        {
          _type: 'classInstance',
          type: 'colSpecArray',
          value: {
            colSpecs: [
              {
                name: 'n',
                function1: {
                  _type: 'lambda',
                  parameters: [{ _type: 'var', name: 'x' }],
                  body: [
                    {
                      _type: 'property',
                      property: 'C',
                      parameters: [{ _type: 'var', name: 'x' }],
                    },
                  ],
                },
                function2: {
                  _type: 'lambda',
                  parameters: [{ _type: 'var', name: 'y' }],
                  body: [
                    {
                      _type: 'func',
                      function: 'count',
                      parameters: [{ _type: 'var', name: 'y' }],
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    });
  });

  test('Refuses a column list that holds something other than column specs', () => {
    expect(() =>
      V1_serializeCubeLambda(lambda([], [colSpecArray([variable('x')])])),
    ).toThrow('A column list holds only column specs, not "var"');
  });

  test('Writes a store accessor path as it is, a quoted dotted table whole', () => {
    // never ["db", "S1", "\"a", "b\""], as Pure text would give (PLAN §6.2.1)
    expect(bodyOf(storeAccessor(['db::Db', 'S1', '"a.b"']))).toEqual({
      _type: 'classInstance',
      type: '>',
      value: { path: ['db::Db', 'S1', '"a.b"'] },
    });
  });

  test('Writes the runtime as an element pointer', () => {
    expect(bodyOf(elementPtr('test::Runtime'))).toEqual({
      _type: 'packageableElementPtr',
      fullPath: 'test::Runtime',
    });
  });

  test('Writes a type argument as a generic type, with its parameters as integers', () => {
    expect(
      bodyOf(genericType('meta::pure::precisePrimitives::Varchar', [30])),
    ).toEqual({
      _type: 'genericTypeInstance',
      genericType: {
        rawType: {
          _type: 'packageableType',
          fullPath: 'meta::pure::precisePrimitives::Varchar',
        },
        typeArguments: [],
        multiplicityArguments: [],
        typeVariableValues: [{ _type: 'integer', value: 30 }],
      },
    });
    expect(bodyOf(genericType('String'))).toHaveProperty(
      'genericType.typeVariableValues',
      [],
    );
  });

  test('Writes an enumeration value, a join kind included, as a property of its enumeration', () => {
    expect(
      bodyOf(enumValue('meta::pure::functions::relation::JoinKind', 'INNER')),
    ).toEqual({
      _type: 'property',
      property: 'INNER',
      parameters: [
        {
          _type: 'packageableElementPtr',
          fullPath: 'meta::pure::functions::relation::JoinKind',
        },
      ],
    });
  });

  test('Writes raw JSON as it is', () => {
    const json = { _type: 'string', value: 'from M6' };
    expect(bodyOf({ k: 'raw', json })).toEqual(json);
  });

  test('Refuses let and block, which come with window isolation (M5)', () => {
    const relation = storeAccessor(['db::Db', 'S', 'T']);
    expect(() =>
      V1_serializeCubeLambda(
        lambda([], [{ k: 'let', name: 'x', value: relation }]),
      ),
    ).toThrow(`Can't send "let" yet`);
    expect(() =>
      V1_serializeCubeLambda(
        lambda([], [{ k: 'block', statements: [relation] }]),
      ),
    ).toThrow(`Can't send "block" yet`);
  });

  test('Refuses anything but a lambda at the root', () => {
    expect(() => V1_serializeCubeLambda(variable('x'))).toThrow(
      'Only a lambda can be sent, not "var"',
    );
  });
});

describe('Cube lambda serializer: source stamps', () => {
  test('Stamps a node with its origin, and the nodes under it with the nearest origin above them', () => {
    const json = V1_serializeCubeLambda(
      lambda(
        [],
        [
          func(
            'in',
            [
              columnAccess('row', 'ID'),
              collection([literal({ kind: 'integer', value: '1' })]),
            ],
            ORIGIN,
          ),
        ],
      ),
    );
    expect(json).not.toHaveProperty('sourceInformation');
    expect(unstampedNodes(json)).toEqual([]);
    // in, property, var, collection, integer
    expect(sourceIds(json)).toEqual(Array(5).fill(SOURCE_ID));
  });

  test('Stamps the nodes under two origins with the nearer one, not the farther', () => {
    const filter = 'cube:filter101:filter';
    const key = 'cube:join101:key';
    const json = V1_serializeCubeLambda(
      lambda(
        [],
        [
          func(
            'filter',
            [
              lambda(
                ['x'],
                [
                  func(
                    'equal',
                    [
                      variable('x'),
                      columnAccess('x', 'C', {
                        nodeId: 'join101',
                        role: EmitRole.KEY,
                      }),
                      columnAccess('x', 'D'),
                    ],
                    ORIGIN,
                  ),
                ],
              ),
            ],
            { nodeId: 'filter101', role: EmitRole.FILTER },
          ),
        ],
      ),
    );
    expect(unstampedNodes(json)).toEqual([]);
    expect(sourceIds(json)).toEqual([
      filter, // x, the lambda's parameter
      SOURCE_ID, // x, under equal
      key, // x, under $x.C
      key, // $x.C
      SOURCE_ID, // x, under $x.D
      SOURCE_ID, // $x.D
      SOURCE_ID, // equal
      filter, // the lambda
      filter, // filter
    ]);
  });

  test("Stamps a column spec's value, and each spec of a column list, where the engine reports a missing column", () => {
    const json = V1_serializeCubeLambda(
      lambda(
        [],
        [
          func(
            'rename',
            [colSpec('A'), colSpecArray([colSpec('B'), TOTAL])],
            ORIGIN,
          ),
        ],
      ),
    );
    const stamp = { sourceId: SOURCE_ID };
    expect(json).toHaveProperty(
      'body.0.parameters.0.value.sourceInformation',
      stamp,
    );
    expect(json).toHaveProperty(
      'body.0.parameters.1.value.colSpecs.0.sourceInformation',
      stamp,
    );
    expect(json).toHaveProperty(
      'body.0.parameters.1.value.colSpecs.1.sourceInformation',
      stamp,
    );
    expect(unstampedNodes(json)).toEqual([]);
  });

  test('Leaves raw JSON as it is under a stamped node, keeping its own source information and adding none', () => {
    const at = (startColumn: number, endColumn: number): PlainObject => ({
      sourceId: '',
      startLine: 1,
      startColumn,
      endLine: 1,
      endColumn,
    });
    // built afresh for the input and for the expectation, so a change made
    // to the input in place shows
    const located = (): PlainObject => ({
      _type: 'func',
      function: 'toUpper',
      parameters: [
        { _type: 'string', value: 'from M6', sourceInformation: at(1, 9) },
      ],
      sourceInformation: at(10, 18),
    });
    const written = V1_serializeCubeLambda(
      lambda(
        [],
        [
          func(
            'joinStrings',
            [
              { k: 'raw', json: located() },
              { k: 'raw', json: { _type: 'string', value: ', ' } },
            ],
            ORIGIN,
          ),
        ],
      ),
    );
    expect(written).toHaveProperty('body.0.sourceInformation', {
      sourceId: SOURCE_ID,
    });
    expect(written).toHaveProperty('body.0.parameters.0', located());
    expect(written).toHaveProperty('body.0.parameters.1', {
      _type: 'string',
      value: ', ',
    });
    expect(written).not.toHaveProperty('body.0.parameters.1.sourceInformation');
  });

  test("Stamps a store accessor's value too, where the engine reports a wrong table", () => {
    const json = V1_serializeCubeLambda(
      lambda(
        [],
        [
          storeAccessor(['db::Db', 'S', 'T'], {
            nodeId: 'relational101',
            role: EmitRole.ACCESSOR,
          }),
        ],
      ),
    ) as { body: [{ value: PlainObject }] };
    expect(json.body[0].value.sourceInformation).toEqual({
      sourceId: 'cube:relational101:accessor',
    });
  });

  test('Stamps the enumeration of an enumeration value with its origin', () => {
    expect(
      sourceIds(
        V1_serializeCubeLambda(
          lambda([], [enumValue('test::Color', 'RED', ORIGIN)]),
        ),
      ),
    ).toEqual([SOURCE_ID, SOURCE_ID]);
  });

  test('Stamps every node of an emitted query, each with a node and role of its own query', () => {
    const query = sliceQuery();
    const json = V1_serializeCubeLambda(
      new QueryEmitter(query).emitExecutionLambda({
        rowLimit: 1000,
        runtime: NORTHWIND_RUNTIME,
      }),
    );
    const roles = new Set<string>(Object.values(EmitRole));
    expect(unstampedNodes(json)).toEqual([]);
    const ids = sourceIds(json);
    ids.forEach((id) => {
      const origin = V1_parseCubeSourceId(id);
      expect(origin).toBeDefined();
      expect(query.getNode(origin?.nodeId ?? '')).toBeDefined();
      expect(roles.has(origin?.role ?? '')).toBe(true);
    });
    // each part of the query is stamped
    expect(new Set(ids)).toEqual(
      new Set([
        'cube:relational101:accessor',
        'cube:relational102:accessor',
        'cube:join101:rename',
        'cube:join101:join',
        'cube:join101:condition',
        'cube:join101:key',
        'cube:join101:select',
        'cube:filter101:filter',
        'cube:filter101:predicate',
        'cube:filter101:column',
        'cube:filter101:value',
        'cube:filter101:limit',
        'cube:filter101:from',
      ]),
    );
  });

  test('Stamps each variable of an emitted query with the node and role that read it', () => {
    const json = V1_serializeCubeLambda(
      new QueryEmitter(sliceQuery()).emitExecutionLambda({
        rowLimit: 1000,
        runtime: NORTHWIND_RUNTIME,
      }),
    );
    expect(variableStamps(json)).toEqual([
      // the join condition's parameters, then its keys
      'l cube:join101:join',
      'r cube:join101:join',
      'l cube:join101:key',
      'r cube:join101:key',
      // the filter's parameter, then its columns
      'row cube:filter101:filter',
      'row cube:filter101:column',
      'row cube:filter101:column',
      'row cube:filter101:column',
    ]);
  });

  test.each<[string, Origin | undefined]>([
    ['cube:filter101:predicate', { nodeId: 'filter101', role: 'predicate' }],
    ['cube:a:b:c:key', { nodeId: 'a:b:c', role: 'key' }],
    ['', undefined],
    ['filter101:predicate', undefined],
    ['cube:filter101', undefined],
    ['cube::predicate', undefined],
    ['cube:filter101:', undefined],
  ])('Reads the source id %j back as its origin', (sourceId, origin) => {
    expect(V1_parseCubeSourceId(sourceId)).toEqual(origin);
  });

  test('Reads back the source id of any origin', () => {
    const origin = { nodeId: 'join:101', role: EmitRole.MERGE_KEY };
    expect(V1_parseCubeSourceId(V1_buildCubeSourceId(origin))).toEqual(origin);
  });
});

describe('Cube lambda serializer: emitted queries', () => {
  test('Writes the limit of the execution lambda digit for digit, at the largest row limit', () => {
    expect(
      text(
        new QueryEmitter(sliceQuery()).emitExecutionLambda({
          rowLimit: Number.MAX_SAFE_INTEGER,
          runtime: NORTHWIND_RUNTIME,
        }),
      ),
    ).toContain('{"_type":"integer","value":9007199254740992,');
  });

  test('Writes the slice as the engine parses its Pure text (PLAN §8.5)', () => {
    const json = withoutSourceInformation(
      JSON.parse(
        text(
          new QueryEmitter(sliceQuery()).emitExecutionLambda({
            rowLimit: 1000,
            runtime: NORTHWIND_RUNTIME,
          }),
        ),
      ),
    ) as { body: [{ function: string; parameters: unknown[] }] };
    const [from] = json.body;
    expect(from.function).toBe('from');
    expect(from.parameters[1]).toEqual({
      _type: 'packageableElementPtr',
      fullPath: NORTHWIND_RUNTIME,
    });
    expect(from.parameters[0]).toHaveProperty('function', 'limit');
    expect(from.parameters[0]).toHaveProperty('parameters.1', {
      _type: 'integer',
      value: 1001,
    });
  });

  test('Writes a FULL join with toOne, the merge, its cast and the final select', () => {
    const json = text(
      new QueryEmitter(fullJoinQuery()).emitTypingLambda('join101'),
    );
    expect(json).toContain('"function":"toOne"');
    expect(json).toContain('"function":"coalesce"');
    expect(json).toContain('"function":"cast"');
    expect(json).toContain('"property":"FULL"');
    expect(json).not.toContain('"_type":"enumValue"');
  });

  test('Writes a negation of a nullable column with the isEmpty that keeps its NULL rows', () => {
    const json = text(
      new QueryEmitter(
        sliceQuery(
          new NotFilter(
            new ColumnComparisonFilter('SHIP_REGION', FilterOperator.EQUAL, {
              kind: 'string',
              value: 'BC',
            }),
          ),
        ),
      ).emitTypingLambda('filter101'),
    );
    expect(json).toContain('"function":"isEmpty"');
    expect(json).toContain('"function":"or"');
  });
});
