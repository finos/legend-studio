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
  aggregationColSpec,
  buildSchemasAndValidity,
  colSpec,
  colSpecArray,
  collection,
  ColumnComparisonFilter,
  columnAccess,
  Connection,
  CUBE_QUERY_READER_MESSAGE,
  CubeLambdaReadError,
  CubeLambdaReadErrorKind,
  Explode,
  ExpressionFilter,
  Extend,
  Filter,
  FilterOperator,
  findCubeLambdaExtends,
  findCubeLambdaSources,
  func,
  genericType,
  getExtendSignature,
  Group,
  isSameCubeIR,
  lambda,
  literal,
  PrimitiveType,
  Query,
  QueryEmitter,
  readCubeQuery,
  RelationalTableSource,
  Schema,
  SchemaColumn,
  Sort,
  splitCubeLambda,
  storeAccessor,
  variable,
  letBinding,
  type CubeDocument,
  type CubeSourceStep,
  type IR,
  type QueryNode,
} from '@finos/legend-cube';
import {
  TEST__bindSampleSources,
  TEST__checkedAsTheEngineWould,
  TEST__cubeIngestLambdaSamples,
  TEST__cubeLambdaSamples,
} from '../__test-utils__/CubeLambdaCorpus.js';
import { CUBE_EXPRESSION_CODEC } from '../graph-manager/protocol/pure/CubeProtocolJson.js';

// Import Pure's steps (PLAN §11.18): what Cube writes for each node of the
// core's samples reads back into steps that Cube writes the same way again

/** Every step the samples hold, which the reader reads */
const READ_STEPS = new Set([
  'relational',
  'ingestDataset',
  'extend',
  'explode',
  'pivot',
  'concat',
  'join',
  'difference',
  'partition',
  'filter',
  'expressionFilter',
  'group',
  'restrict',
  'sort',
  'limit',
  'drop',
  'slice',
  'distinct',
  'rename',
]);

const SAMPLES = [
  ...TEST__cubeLambdaSamples(),
  ...TEST__cubeIngestLambdaSamples(),
].map((sample) => {
  const upstream = new Set<string>();
  const visit = (id: string): void => {
    upstream.add(id);
    sample.document.query
      .getInputIds(id)
      .forEach((input) => input !== undefined && visit(input));
  };
  visit(sample.nodeId);
  const types = [...upstream].map(
    (id) => sample.document.query.getNode(id)?.type ?? '',
  );
  return { ...sample, readable: types.every((type) => READ_STEPS.has(type)) };
});

describe('Reading the steps of a lambda', () => {
  test.each(
    SAMPLES.filter((sample) => sample.readable).map(
      (sample) => [sample.key, sample] as const,
    ),
  )(
    'Reads %s into steps Cube writes the same way, as a matview and as Show Pure',
    (_key, sample) => {
      [sample.relation, sample.run].forEach((written) => {
        const parts = splitCubeLambda(written);
        expect(findCubeLambdaSources(parts).length).toBeGreaterThan(0);
        const { query, unchecked, rewritten } = readCubeQuery(parts, {
          bindSource: TEST__bindSampleSources(sample.document),
          expressions: CUBE_EXPRESSION_CODEC,
        });
        // every step's columns were known, so every step was checked, and
        // each was written back the same
        expect(unchecked).toEqual([]);
        expect(rewritten).toEqual([]);
        const emitter = new QueryEmitter(TEST__checkedAsTheEngineWould(query));
        const selected = query.selected as string;
        expect(emitter.canEmit(selected)).toBe(true);
        const again =
          written === sample.relation
            ? lambda(
                [],
                [emitter.emitRelation(selected, { withRowOrder: true })],
              )
            : emitter.emitExecutionLambda({
                runtime: parts.runtime as string,
              });
        expect(
          isSameCubeIR(again, written, {
            readExpression: CUBE_EXPRESSION_CODEC.read,
          }),
        ).toBe(true);
        // as many steps as the lambda was written from
        const steps = new Set<string>();
        const visit = (id: string): void => {
          steps.add(id);
          sample.document.query
            .getInputIds(id)
            .forEach((input) => input !== undefined && visit(input));
        };
        visit(sample.nodeId);
        // but a Sort that ends a matview: a matview has no row order, so Cube
        // doesn't write one there
        const endsWithSort =
          written === sample.relation &&
          sample.document.query.getNode(sample.nodeId)?.type === Sort.TYPE;
        expect(query.nodes.length).toBe(steps.size - (endsWithSort ? 1 : 0));
      });
    },
  );

  test('Reads every sample', () => {
    expect(SAMPLES.filter((sample) => !sample.readable)).toEqual([]);
  });

  test("Keeps a plainly negated condition as it is when the columns aren't known", () => {
    const table = storeAccessor(['db::Store', 'S', 'T']);
    // the table bound without its columns
    const bindSource = (): CubeSourceStep => ({
      type: RelationalTableSource.TYPE,
      create: (id) =>
        new RelationalTableSource(id, {
          database: 'db::Store',
          schema: 'S',
          table: 'T',
        }),
    });
    const read = (predicate: IR): QueryNode | undefined => {
      const { query, unchecked } = readCubeQuery(
        splitCubeLambda(
          lambda([], [func('filter', [table, lambda(['x'], [predicate])])]),
        ),
        { bindSource, expressions: CUBE_EXPRESSION_CODEC },
      );
      expect(unchecked).toEqual([query.selected]);
      return query.getNode(query.selected as string);
    };
    const equal = func('equal', [
      columnAccess('x', 'DESK'),
      literal({ kind: 'string', value: 'A' }),
    ]);
    expect(read(equal)).toBeInstanceOf(Filter);
    // `!(…)` keeps no empty rows; Cube's own NotEqual would, on a column that
    // can be empty, so it can't be read as one without knowing the column
    expect(read(func('not', [equal]))).toBeInstanceOf(ExpressionFilter);
  });

  test('Reads an Extend, typed by the host before reading, so the steps after it are checked', () => {
    const sample = SAMPLES.find((each) =>
      each.key.endsWith('operations.cube.json/relational101'),
    ) as (typeof SAMPLES)[number];
    const source = sample.document.query.getNode(
      sample.nodeId,
    ) as RelationalTableSource;
    // FREIGHT doubled, then the rows where it is over 100
    const doubled = new Extend('extend1', [
      {
        name: 'DOUBLE_FREIGHT',
        code: 'x|$x.FREIGHT * 2',
        lambda: CUBE_EXPRESSION_CODEC.write(
          lambda(
            ['x'],
            [
              func('times', [
                collection([
                  columnAccess('x', 'FREIGHT'),
                  literal({ kind: 'integer', value: '2' }),
                ]),
              ]),
            ],
          ),
        ),
      },
    ]);
    const input = buildSchemasAndValidity(
      new Query([source], [], source.id),
    ).schemas.get(source.id) as Schema;
    const typed = doubled.withTyping({
      kind: 'typed',
      signature: getExtendSignature(input, doubled.columns),
      types: [PrimitiveType.get('Float')],
    });
    const over = new Filter(
      'filter1',
      new ColumnComparisonFilter(
        'DOUBLE_FREIGHT',
        FilterOperator.GREATER_THAN,
        {
          kind: 'float',
          value: '100',
        },
      ),
    );
    const query = new Query(
      [source, typed, over],
      [
        new Connection(source.id, typed.id, 'tds'),
        new Connection(typed.id, over.id, 'tds'),
      ],
      over.id,
    );
    const written = lambda(
      [],
      [new QueryEmitter(query).emitRelation(over.id, { withRowOrder: true })],
    );
    const parts = splitCubeLambda(written);
    const chains = findCubeLambdaExtends(parts);
    expect(chains).toHaveLength(1);
    const options = {
      bindSource: TEST__bindSampleSources(sample.document),
      expressions: CUBE_EXPRESSION_CODEC,
    };

    // typed as the host types it: every step checked
    const read = readCubeQuery(parts, {
      ...options,
      relationSchemas: new Map([
        [
          (chains[0] as { read: IR }).read,
          buildSchemasAndValidity(query).schemas.get(typed.id) as Schema,
        ],
      ]),
    });
    expect(read.unchecked).toEqual([]);
    expect(read.rewritten).toEqual([]);
    expect(read.query.nodes.map((node) => node.type)).toEqual([
      RelationalTableSource.TYPE,
      Extend.TYPE,
      Filter.TYPE,
    ]);
    const extend = read.query.nodes[1] as Extend;
    expect(extend.columns.map(({ name }) => name)).toEqual(['DOUBLE_FREIGHT']);
    // the step imported waits for the editor to type it, as any Extend does
    expect(extend.typing.kind).toBe('unresolved');

    // untyped, neither it nor the steps after it can be checked
    expect(readCubeQuery(parts, options).unchecked).toEqual([
      read.query.nodes[1]?.id,
      read.query.nodes[2]?.id,
    ]);
  });

  test('Reads an Explode Array of a JSON column, checked, and names the lateral it reads when it is another', () => {
    const table = storeAccessor(['db::Store', 'S', 'EVENTS']);
    const schema = new Schema([
      new SchemaColumn(
        'ID',
        PrimitiveType.get('meta::pure::precisePrimitives::Int'),
        false,
      ),
      new SchemaColumn('PAYLOAD', PrimitiveType.get('Variant'), true),
    ]);
    const bindSource = (): CubeSourceStep => ({
      type: RelationalTableSource.TYPE,
      create: (id) =>
        new RelationalTableSource(
          id,
          { database: 'db::Store', schema: 'S', table: 'EVENTS' },
          { kind: 'resolved', schema },
        ),
    });
    const source = bindSource().create('relational101');
    const explode = new Explode(
      'explode101',
      'PAYLOAD',
      ['order', 'items'],
      'item',
    );
    const written = lambda(
      [],
      [
        new QueryEmitter(
          new Query(
            [source, explode],
            [new Connection(source.id, explode.id, 'tds')],
            explode.id,
          ),
        ).emitRelation(explode.id, { withRowOrder: true }),
      ],
    );
    const options = { bindSource, expressions: CUBE_EXPRESSION_CODEC };
    const read = readCubeQuery(splitCubeLambda(written), options);
    expect(read.unchecked).toEqual([]);
    expect(read.rewritten).toEqual([]);
    const step = read.query.getNode(read.query.selected as string) as Explode;
    expect(step).toBeInstanceOf(Explode);
    expect([step.column, step.path, step.name]).toEqual([
      'PAYLOAD',
      ['order', 'items'],
      'item',
    ]);
    // a lateral of another function: of integers, not Variants
    const ofIntegers = func('lateral', [
      table,
      lambda(
        ['x'],
        [
          func('flatten', [
            func('toMany', [
              columnAccess('x', 'PAYLOAD'),
              genericType('Integer'),
            ]),
            colSpec('n'),
          ]),
        ],
      ),
    ]);
    expect(() =>
      readCubeQuery(splitCubeLambda(lambda([], [ofIntegers])), options),
    ).toThrow(
      CUBE_QUERY_READER_MESSAGE.UNREADABLE(
        'lateral',
        CUBE_QUERY_READER_MESSAGE.EXPLODE,
      ),
    );
  });

  test('Names a function Cube has no step for', () => {
    const sample = SAMPLES.find((each) => each.key.endsWith('relational101'));
    const relation = (sample?.relation as Extract<IR, { k: 'lambda' }>)
      .body[0] as IR;
    expect(() =>
      readCubeQuery(
        splitCubeLambda(
          lambda([], [{ k: 'func', name: 'olapGroupBy', params: [relation] }]),
        ),
        {
          bindSource: TEST__bindSampleSources(sample?.document as CubeDocument),
          expressions: CUBE_EXPRESSION_CODEC,
        },
      ),
    ).toThrow(CUBE_QUERY_READER_MESSAGE.NO_STEP('olapGroupBy'));
  });
  test("Reads PLAN §11.28's Group functions as Cube writes them, the setting a literal, and refuses their other forms", () => {
    const sample = SAMPLES.find((each) =>
      each.key.endsWith('operations.cube.json/relational101'),
    ) as (typeof SAMPLES)[number];
    const relation = (sample.relation as Extract<IR, { k: 'lambda' }>)
      .body[0] as IR;
    const read = (column: string, reduce: IR): QueryNode | undefined => {
      const { query } = readCubeQuery(
        splitCubeLambda(
          lambda(
            [],
            [
              func('groupBy', [
                relation,
                colSpecArray([colSpec('SHIP_COUNTRY')]),
                colSpecArray([
                  aggregationColSpec(
                    'n',
                    lambda(['x'], [columnAccess('x', column)]),
                    lambda(['y'], [reduce]),
                  ),
                ]),
              ]),
            ],
          ),
        ),
        {
          bindSource: TEST__bindSampleSources(sample.document),
          expressions: CUBE_EXPRESSION_CODEC,
        },
      );
      return query.getNode(query.selected as string);
    };
    const y = variable('y');
    const float = (value: string): IR => literal({ kind: 'float', value });
    const text = (value: string): IR => literal({ kind: 'string', value });
    expect(
      (read('FREIGHT', func('percentile', [y, float('0.25')])) as Group)
        .aggregations,
    ).toEqual([
      {
        column: 'FREIGHT',
        function: AggregationFunction.PERCENTILE,
        name: 'n',
        percentile: 0.25,
      },
    ]);
    expect(
      (read('SHIP_CITY', func('joinStrings', [y, text(' | ')])) as Group)
        .aggregations,
    ).toEqual([
      {
        column: 'SHIP_CITY',
        function: AggregationFunction.JOIN_TEXT,
        name: 'n',
        separator: ' | ',
      },
    ]);
    (
      [
        ['median', AggregationFunction.MEDIAN],
        ['stdDevSample', AggregationFunction.STD_DEV],
        ['varianceSample', AggregationFunction.VARIANCE],
      ] as const
    ).forEach(([name, fn]) =>
      expect((read('FREIGHT', func(name, [y])) as Group).aggregations).toEqual([
        { column: 'FREIGHT', function: fn, name: 'n' },
      ]),
    );
    const refused = CUBE_QUERY_READER_MESSAGE.UNREADABLE(
      'groupBy',
      CUBE_QUERY_READER_MESSAGE.AGGREGATION('n'),
    );
    [
      // an Integer percentile doesn't type on the engine
      func('percentile', [y, literal({ kind: 'integer', value: '1' })]),
      // ascending and continuous, which Cube doesn't write
      func('percentile', [
        y,
        float('0.9'),
        literal({ kind: 'boolean', value: true }),
        literal({ kind: 'boolean', value: false }),
      ]),
      func('percentile', [y, columnAccess('x', 'FREIGHT')]),
      // the population ones, which Cube doesn't offer
      func('stdDevPopulation', [y]),
      func('variancePopulation', [y]),
      func('median', [y, float('0.5')]),
    ].forEach((reduce) =>
      expect(() => read('FREIGHT', reduce)).toThrow(refused),
    );
    [func('joinStrings', [y]), func('joinStrings', [y, float('1.0')])].forEach(
      (reduce) => expect(() => read('SHIP_CITY', reduce)).toThrow(refused),
    );
  });
});

/** The ingest sample's lambda of a node: `#I{…}#` data sets, their columns known */
const ingestSample = (nodeId: string): (typeof SAMPLES)[number] =>
  SAMPLES.find(
    (each) => each.key === `ingest/${nodeId}`,
  ) as (typeof SAMPLES)[number];

/** The relation of a sample's matview */
const relationOf = (sample: (typeof SAMPLES)[number]): IR =>
  (sample.relation as Extract<IR, { k: 'lambda' }>).body[0] as IR;

/** What reading the relation, bound to the sample's sources, refuses: its kind and function */
const refusalOf = (
  sample: (typeof SAMPLES)[number],
  relation: IR,
  bindSource = TEST__bindSampleSources(sample.document),
): [CubeLambdaReadErrorKind, string | undefined, string] | undefined => {
  try {
    readCubeQuery(splitCubeLambda(lambda([], [relation])), {
      bindSource,
      expressions: CUBE_EXPRESSION_CODEC,
    });
  } catch (error) {
    if (error instanceof CubeLambdaReadError) {
      return [error.kind, error.functionName, error.message];
    }
    throw error;
  }
  return undefined;
};

describe('Why Cube refuses a lambda', () => {
  test('Gives each refusal a kind a host can count, with the function it names', () => {
    const sample = ingestSample('filter101');
    const filtered = relationOf(sample);
    expect(refusalOf(sample, func('olapGroupBy', [filtered]))).toEqual([
      CubeLambdaReadErrorKind.NO_STEP,
      'olapGroupBy',
      CUBE_QUERY_READER_MESSAGE.NO_STEP('olapGroupBy'),
    ]);
    // a pivot Cube reads only as it writes one: in a cast
    expect(refusalOf(sample, func('pivot', [filtered]))?.slice(0, 2)).toEqual([
      CubeLambdaReadErrorKind.NOT_YET,
      'pivot',
    ]);
    // a select of a column its input doesn't have
    expect(
      refusalOf(
        sample,
        func('select', [filtered, colSpecArray([colSpec('BOOK_ID')])]),
      ),
    ).toEqual([
      CubeLambdaReadErrorKind.FORM,
      'select',
      CUBE_QUERY_READER_MESSAGE.UNREADABLE(
        'select',
        CUBE_QUERY_READER_MESSAGE.RESTRICT,
      ),
    ]);
    // a variable nothing binds, and a value that isn't a query of rows
    expect(refusalOf(sample, variable('rows'))?.slice(0, 2)).toEqual([
      CubeLambdaReadErrorKind.SHAPE,
      undefined,
    ]);
    expect(
      refusalOf(sample, literal({ kind: 'integer', value: '1' }))?.[0],
    ).toBe(CubeLambdaReadErrorKind.SHAPE);
    // a source the host can't bind, as the host says
    expect(
      refusalOf(sample, storeAccessor(['db::Store', 'S', 'T']))?.slice(0, 2),
    ).toEqual([CubeLambdaReadErrorKind.SOURCE, undefined]);
  });

  test("Refuses, for the editor, a group's sum named like the column it adds up, saying so; reads it when drawing, checked, with the steps after it", () => {
    const sample = ingestSample('filter101');
    const grouped = func('groupBy', [
      relationOf(sample),
      colSpecArray([colSpec('BUSINESS_DATE')]),
      colSpecArray([
        aggregationColSpec(
          'QUANTITY',
          lambda(['p'], [columnAccess('p', 'QUANTITY')]),
          lambda(['q'], [func('sum', [variable('q')])]),
        ),
      ]),
    ]);
    expect(refusalOf(sample, grouped)).toEqual([
      CubeLambdaReadErrorKind.SAME_NAME_SUM,
      'groupBy',
      CUBE_QUERY_READER_MESSAGE.UNREADABLE(
        'groupBy',
        CUBE_QUERY_READER_MESSAGE.SAME_NAME('QUANTITY'),
      ),
    ]);
    // a group Cube can't read for another reason still says that
    expect(
      refusalOf(
        sample,
        func('groupBy', [
          relationOf(sample),
          colSpecArray([colSpec('QUANTITY')]),
          colSpecArray([
            aggregationColSpec(
              'QUANTITY',
              lambda(['p'], [columnAccess('p', 'QUANTITY')]),
              lambda(['q'], [func('sum', [variable('q')])]),
            ),
          ]),
        ]),
      )?.slice(0, 2),
    ).toEqual([CubeLambdaReadErrorKind.FORM, 'groupBy']);

    const { query, unchecked, rewritten } = readCubeQuery(
      splitCubeLambda(
        lambda(
          [],
          [
            func('filter', [
              grouped,
              lambda(
                ['x'],
                [
                  func('greaterThan', [
                    columnAccess('x', 'QUANTITY'),
                    literal({ kind: 'integer', value: '0' }),
                  ]),
                ],
              ),
            ]),
          ],
        ),
      ),
      {
        bindSource: TEST__bindSampleSources(sample.document),
        expressions: CUBE_EXPRESSION_CODEC,
        forDrawing: true,
      },
    );
    expect(unchecked).toEqual([]);
    expect(rewritten).toEqual([]);
    const group = query.nodes.find((node) => node instanceof Group) as Group;
    expect(group.allowsInputNames).toBe(true);
    const { schemas, validity } = buildSchemasAndValidity(query);
    expect([...validity.values()].flat()).toEqual([]);
    expect(schemas.get(group.id)?.names()).toEqual([
      'BUSINESS_DATE',
      'QUANTITY',
    ]);
    // the sum is a column the filter after it reads, as a rule of Cube's
    expect(query.getNode(query.selected as string)).toBeInstanceOf(Filter);
  });
});

describe('The relation each step is read from: the Pure up to it', () => {
  test("Keeps each step's relation, which reads back to that step and the steps before it", () => {
    const sample = ingestSample('limit101');
    const parts = splitCubeLambda(sample.run);
    const options = {
      bindSource: TEST__bindSampleSources(sample.document),
      expressions: CUBE_EXPRESSION_CODEC,
    };
    const { query, stepIRs } = readCubeQuery(parts, options);
    expect([...stepIRs.keys()]).toEqual(query.nodes.map((node) => node.id));
    query.nodes.forEach((node) => {
      const upstream = new Set<string>();
      const visit = (id: string): void => {
        upstream.add(id);
        query.getInputIds(id).forEach((input) => input && visit(input));
      };
      visit(node.id);
      const again = readCubeQuery(
        splitCubeLambda(lambda([], [stepIRs.get(node.id) as IR])),
        options,
      ).query;
      expect(again.getNode(again.selected as string)?.type).toBe(node.type);
      expect(again.nodes).toHaveLength(upstream.size);
    });
  });

  test("Keeps a step's relation as read under a let, by the let's name", () => {
    const sample = ingestSample('filter101');
    const { query, stepIRs } = readCubeQuery(
      splitCubeLambda(
        lambda(
          [],
          [
            letBinding('signedOff', relationOf(sample)),
            func('limit', [
              variable('signedOff'),
              literal({ kind: 'integer', value: '5' }),
            ]),
          ],
        ),
      ),
      {
        bindSource: TEST__bindSampleSources(sample.document),
        expressions: CUBE_EXPRESSION_CODEC,
      },
    );
    const limit = query.getNode(query.selected as string);
    expect(
      isSameCubeIR(
        stepIRs.get(limit?.id as string) as IR,
        func('limit', [
          variable('signedOff'),
          literal({ kind: 'integer', value: '5' }),
        ]),
      ),
    ).toBe(true);
  });
});
