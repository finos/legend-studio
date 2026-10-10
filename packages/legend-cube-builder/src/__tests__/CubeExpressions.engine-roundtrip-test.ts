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

import { beforeEach, describe, expect, test } from '@jest/globals';
import {
  buildSchemasAndValidity,
  createNodeRegistry,
  Extend,
  type ExtendColumn,
  type ModelContext,
  type NodeRegistry,
  type Query,
  QueryEmitter,
  type QueryNode,
  Restrict,
  type Schema,
} from '@finos/legend-cube';
import {
  TEST__chainOf,
  TEST__columnValues,
  TEST__northwindTable,
  TEST__resolveSources,
} from '../__test-utils__/CubeOperationsTestUtils.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../graph-manager/CubeEngine.js';
import { V1_createEngineBackedCubeEngine } from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeEngineTestUtils.js';
import type { V1_LegendCubeEngine } from '../graph-manager/protocol/pure/v1/V1_LegendCubeEngine.js';
import {
  buildCubeExtendTypingLambdas,
  type CubeExtendTypingColumn,
  readCubeExtendTyping,
} from '../stores/CubeExtendTyping.js';
import {
  CUBE_NORTHWIND_MODEL,
  CUBE_NORTHWIND_MODEL_CODE,
  CUBE_NORTHWIND_RUNTIME,
} from '../stores/fixtures/CubeNorthwindModel.js';

// Extend's expressions on the engine (PLAN §11.7): parsed with their
// locations and their numbers' digits, typed over the cube's model as a chain
// of extends after the input, the failing column found, and planned for the
// database before a run.

/** The fixture, with an enumeration and a function of its own, which an empty model can't type */
const MODEL: ModelContext = {
  _type: 'text',
  code: `${CUBE_NORTHWIND_MODEL_CODE}
###Pure
Enum test::Size
{
  S,
  M,
  L
}

function test::double(n: Integer[1]): Integer[1]
{
  $n * 2
}
`,
};

let engine: V1_LegendCubeEngine;

beforeEach(() => {
  ({ engine } = V1_createEngineBackedCubeEngine());
});

const registry = (): NodeRegistry => createNodeRegistry();

/** ORDERS, restricted to a few columns, then the nodes */
const orders = async (...nodes: QueryNode[]): Promise<Query> => {
  const [source] = await TEST__resolveSources(engine, [
    TEST__northwindTable('relational101', 'ORDERS'),
  ]);
  return TEST__chainOf([
    source as QueryNode,
    new Restrict('restrict101', [
      'ORDER_ID',
      'SHIP_VIA',
      'FREIGHT',
      'SHIP_CITY',
      'ORDER_DATE',
      'REQUIRED_DATE',
    ]),
    ...nodes,
  ]);
};

/** The texts, parsed as an Extend's columns a, b, … */
const parsed = async (
  ...codes: string[]
): Promise<{ stored: ExtendColumn[]; located: CubeExtendTypingColumn[] }> => {
  const columns = await Promise.all(
    codes.map(async (code, index) => ({
      code,
      name: String.fromCharCode(97 + index),
      expression: await engine.parseExpression(code, `extend101:${index}`),
    })),
  );
  return {
    stored: columns.map(({ name, code, expression }) => ({
      name,
      code,
      lambda: expression.lambda,
    })),
    located: columns.map(({ name, expression }) => ({
      name,
      lambda: expression.located,
    })),
  };
};

/** Types an Extend of these texts after ORDERS, on a model; located or as stored */
const typeOf = async (
  codes: string[],
  { model = MODEL, located = false } = {},
): Promise<ReturnType<typeof readCubeExtendTyping>> => {
  const { stored, located: withLocations } = await parsed(...codes);
  const extend = new Extend('extend101', stored);
  const query = await orders(extend);
  const columns = located
    ? withLocations
    : stored.map(({ name, lambda }) => ({
        name,
        lambda: lambda as NonNullable<typeof lambda>,
      }));
  const answers = await engine.typeLambdas(
    model,
    buildCubeExtendTypingLambdas(query, extend, columns, registry(), located),
  );
  // the input as Cube infers it: the typing is for it
  const inputSchema = buildSchemasAndValidity(
    query,
    registry().queryRules,
  ).schemas.get('restrict101') as Schema;
  return readCubeExtendTyping(answers, extend, inputSchema, columns, undefined);
};

const typesOf = async (
  codes: string[],
  options?: Parameters<typeof typeOf>[1],
): Promise<string[]> => {
  const { typing } = await typeOf(codes, options);
  if (typing.kind !== 'typed') {
    throw new Error(`Not typed: ${JSON.stringify(typing)}`);
  }
  return typing.types.map((type) => type.displayName);
};

describe('Extend expressions, parsed by the engine', () => {
  test('Keeps every digit of a number literal as its text, and the locations apart', async () => {
    const { lambda, located } = await engine.parseExpression(
      'x | $x.ORDER_ID * 9007199254740993 + 1.10',
      'extend101:0',
    );
    const text = JSON.stringify(lambda);
    expect(lambda._type).toBe('lambda');
    expect(text).toContain('"value":"9007199254740993"');
    // as the engine reads 1.10: a float of 1.1
    expect(text).toContain('{"_type":"float","value":"1.1"}');
    expect(text).not.toContain('sourceInformation');
    expect(JSON.stringify(located)).toContain('"sourceId":"extend101:0"');
  });

  test('Places a parse error in the text, under the source id it was given', async () => {
    const error = await engine
      .parseExpression('x | $x.ORDER_ID +', 'extend101:2')
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(CubeEngineError);
    const { kind, location } = error as CubeEngineError;
    expect(kind).toBe(CubeEngineErrorKind.COMPILE);
    expect(location?.sourceId).toBe('extend101:2');
    expect(location?.startLine).toBe(1);
  });
});

describe('Extend expressions, typed by the engine', () => {
  test('Types each column as the engine does: arithmetic, text, dates', async () => {
    expect(
      await typesOf([
        'x | $x.ORDER_ID + 1',
        'x | $x.FREIGHT->toOne() * 2',
        'x | $x.SHIP_CITY->toOne()->toUpper()',
        'x | $x.ORDER_DATE->toOne()->adjust(1, DurationUnit.DAYS)',
        'x | $x.SHIP_VIA->toOne() > 1',
      ]),
    ).toEqual(['Integer', 'Number', 'String', 'Date', 'Boolean']);
  });

  test('Lets a column use the one before it', async () => {
    expect(await typesOf(['x | $x.ORDER_ID + 1', 'x | $x.a * 2'])).toEqual([
      'Integer',
      'Integer',
    ]);
  });

  test("Types the model's own enumeration and function, which only the cube's model knows", async () => {
    const codes = [
      'x | test::double($x.ORDER_ID->toOne())',
      'x | test::Size.M->toString()',
    ];
    expect(await typesOf(codes)).toEqual(['Integer', 'String']);
    const { typing } = await typeOf(codes, { model: CUBE_NORTHWIND_MODEL });
    expect(typing.kind).toBe('failed');
  });

  test('Finds the column the engine fails on, and places the error in its text when located', async () => {
    const codes = ['x | $x.ORDER_ID + 1', 'x | $x.NOPE + 1', 'x | $x.a + 1'];
    const stored = await typeOf(codes);
    expect(stored.typing.kind).toBe('failed');
    expect(stored.typing.kind === 'failed' && stored.typing.column).toBe(1);
    expect(stored.error?.nodeId).toBe('extend101');
    expect(stored.error?.firstLine).toContain('NOPE');
    const located = await typeOf(codes, { located: true });
    expect(located.typing.kind === 'failed' && located.typing.column).toBe(1);
    expect(located.error?.location).toEqual({
      sourceId: 'extend101:1',
      startLine: 1,
      startColumn: 8,
      endLine: 1,
      endColumn: 11,
    });
  });

  test('Refuses arithmetic on a nullable column, until toOne()', async () => {
    const { typing, error } = await typeOf(['x | $x.SHIP_VIA + 1']);
    expect(typing.kind).toBe('failed');
    expect(error?.firstLine).toContain('multiplicity');
    expect(await typesOf(['x | $x.SHIP_VIA->toOne() + 1'])).toEqual([
      'Integer',
    ]);
  });
});

describe('Extend expressions, planned and run', () => {
  /** ORDERS and a typed Extend of these texts, run up to it */
  const typedQuery = async (codes: string[]): Promise<Query> => {
    const { stored } = await parsed(...codes);
    const { typing } = await typeOf(codes);
    return orders(new Extend('extend101', stored, typing));
  };
  const executionLambda = (query: Query) =>
    new QueryEmitter(query, registry()).emitExecutionLambda({
      rowLimit: 10,
      runtime: CUBE_NORTHWIND_RUNTIME,
      databaseType: 'H2',
    });

  test("Plans an expression the database runs, and refuses one it types but H2 can't plan", async () => {
    await expect(
      engine.planLambda(
        MODEL,
        executionLambda(
          await typedQuery(['x | $x.ORDER_DATE->toOne()->dayOfWeekNumber()']),
        ),
      ),
    ).resolves.toBeUndefined();
    const error = await engine
      .planLambda(
        MODEL,
        executionLambda(
          // a number, though a row's list reduced by stdDevSample() doesn't plan on H2 ✅
          await typedQuery(['x | [$x.ORDER_ID->toOne(), 1]->stdDevSample()']),
        ),
      )
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(CubeEngineError);
    expect((error as CubeEngineError).nodeId).toBe('extend101');
  });

  test('Runs the columns, the second using the first, a number literal beyond 2^53 exact', async () => {
    const query = await typedQuery([
      'x | $x.ORDER_ID + 9007199254740993',
      'x | $x.a - 9007199254740993',
    ]);
    const result = await engine.execute(MODEL, executionLambda(query));
    const ids = TEST__columnValues(result, 'ORDER_ID').map(String);
    expect(TEST__columnValues(result, 'b').map(String)).toEqual(ids);
    expect(TEST__columnValues(result, 'a').map(String)[0]).toBe(
      String(BigInt(ids[0] ?? '0') + 9007199254740993n),
    );
  });
});
