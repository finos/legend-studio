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
  buildSchemasAndValidity,
  collection,
  ColumnComparisonFilter,
  columnAccess,
  Connection,
  CUBE_QUERY_READER_MESSAGE,
  CubeLambdaReadError,
  ExpressionFilter,
  Extend,
  Filter,
  FilterOperator,
  findCubeLambdaExtends,
  findCubeLambdaSources,
  func,
  getExpressionFilterSignature,
  getExtendSignature,
  isSameCubeIR,
  lambda,
  literal,
  PrimitiveType,
  Query,
  QueryEmitter,
  readCubeQuery,
  RelationalTableSource,
  Sort,
  splitCubeLambda,
  storeAccessor,
  type CubeDocument,
  type CubeSourceStep,
  type IR,
  type QueryNode,
  type Schema,
} from '@finos/legend-cube';
import { TEST__cubeLambdaSamples } from '../__test-utils__/CubeLambdaCorpus.js';
import { CUBE_EXPRESSION_CODEC } from '../graph-manager/protocol/pure/CubeEngineBuilder.js';

// Import Pure's steps (PLAN §11.18): what Cube writes for each node of the
// core's samples reads back into steps that Cube writes the same way again

/** The steps the reader reads so far (IP.4, IP.6) */
const READ_STEPS = new Set([
  'relational',
  'extend',
  'pivot',
  'concat',
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

/** Each table of the lambda bound to the sample's own source of it, with its saved columns */
const bindSamplesSources =
  (document: CubeDocument) =>
  (source: IR): CubeSourceStep => {
    const table = document.query.nodes.find(
      (node): node is RelationalTableSource =>
        node instanceof RelationalTableSource &&
        source.k === 'storeAccessor' &&
        source.path.join('.') ===
          [node.database, node.schema, node.table].join('.'),
    );
    if (!table) {
      throw new CubeLambdaReadError(`No table for ${JSON.stringify(source)}`);
    }
    return {
      type: RelationalTableSource.TYPE,
      create: (id) =>
        new RelationalTableSource(
          id,
          {
            database: table.database,
            schema: table.schema,
            table: table.table,
          },
          table.resolution,
        ),
    };
  };

/**
 * The query with each Filter by Expression checked, as the editor has the
 * engine check them on import: the samples' conditions are all Booleans
 */
const checkedAsTheEngineWould = (query: Query): Query =>
  query.nodes.reduce((checked, node) => {
    if (!(node instanceof ExpressionFilter) || !node.lambda) {
      return checked;
    }
    const [inputId] = checked.getInputIds(node.id);
    const input =
      inputId === undefined
        ? undefined
        : buildSchemasAndValidity(checked).schemas.get(inputId);
    return input
      ? checked.replace(
          node.withCheck({
            kind: 'checked',
            signature: getExpressionFilterSignature(input, node.lambda),
          }),
        )
      : checked;
  }, query);

const SAMPLES = TEST__cubeLambdaSamples().map((sample) => {
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
          bindSource: bindSamplesSources(sample.document),
          expressions: CUBE_EXPRESSION_CODEC,
        });
        // every step's columns were known, so every step was checked, and
        // each was written back the same
        expect(unchecked).toEqual([]);
        expect(rewritten).toEqual([]);
        const emitter = new QueryEmitter(checkedAsTheEngineWould(query));
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

  test('Refuses, for now, the steps it reads in a later step of the plan', () => {
    const later = SAMPLES.filter((sample) => !sample.readable);
    expect(later.length).toBeGreaterThan(0);
    later.forEach((sample) => {
      expect(() =>
        readCubeQuery(splitCubeLambda(sample.relation), {
          bindSource: bindSamplesSources(sample.document),
          expressions: CUBE_EXPRESSION_CODEC,
        }),
      ).toThrow(CubeLambdaReadError);
    });
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
      bindSource: bindSamplesSources(sample.document),
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
          bindSource: bindSamplesSources(sample?.document as CubeDocument),
          expressions: CUBE_EXPRESSION_CODEC,
        },
      ),
    ).toThrow(CUBE_QUERY_READER_MESSAGE.NO_STEP('olapGroupBy'));
  });
});
