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
  ExpressionFilter,
  type ModelContext,
  type NodeRegistry,
  Partition,
  type Query,
  QueryEmitter,
  type QueryNode,
  type Schema,
  SortDirection,
  WindowRankFunction,
} from '@finos/legend-cube';
import {
  TEST__checkedExpressionFilter,
  TEST__expression,
  TEST__typedExtend,
} from '../__test-utils__/CubeExpressionTestUtils.js';
import {
  TEST__chainOf,
  TEST__columnValues,
  TEST__northwindTable,
  TEST__resolveSources,
} from '../__test-utils__/CubeOperationsTestUtils.js';
import {
  type CubeResult,
  CubeEngineErrorKind,
} from '../graph-manager/CubeEngine.js';
import { V1_createEngineBackedCubeEngine } from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeEngineTestUtils.js';
import type { V1_LegendCubeEngine } from '../graph-manager/protocol/pure/v1/V1_LegendCubeEngine.js';
import {
  buildCubeConditionCheckLambdas,
  readCubeConditionCheck,
} from '../stores/CubeExpressionFilterCheck.js';
import {
  CUBE_NORTHWIND_MODEL,
  CUBE_NORTHWIND_MODEL_CODE,
  CUBE_NORTHWIND_RUNTIME,
} from '../stores/fixtures/CubeNorthwindModel.js';

// Filter by Expression on the engine (PLAN §11.11): a condition parsed with
// its locations, checked over the cube's model after the input, its type
// named when it isn't one Boolean, then run on H2, empty values and windows
// included. Values as the probes found them (filter-expr-requirements/).

/** The fixture, with a function of its own, which only the cube's model knows */
const MODEL: ModelContext = {
  _type: 'text',
  code: `${CUBE_NORTHWIND_MODEL_CODE}
###Pure
function test::isLate(shipped: StrictDate[1], required: StrictDate[1]): Boolean[1]
{
  $shipped > $required
}
`,
};

let engine: V1_LegendCubeEngine;

beforeEach(() => {
  ({ engine } = V1_createEngineBackedCubeEngine());
});

const registry = (): NodeRegistry => createNodeRegistry();

const ordersSource = async (): Promise<QueryNode> => {
  const [source] = await TEST__resolveSources(engine, [
    TEST__northwindTable('relational101', 'ORDERS'),
  ]);
  return source as QueryNode;
};

/** Checks the condition after ORDERS and the nodes, as the editor does: located, or as stored */
const checkOf = async (
  code: string,
  {
    before = [],
    located = false,
    model = MODEL,
  }: {
    before?: QueryNode[];
    located?: boolean;
    model?: ModelContext;
  } = {},
): Promise<ReturnType<typeof readCubeConditionCheck>> => {
  const expression = await engine.parseExpression(
    code,
    'expressionFilter101:condition',
  );
  const filter = new ExpressionFilter(
    'expressionFilter101',
    code,
    expression.lambda,
  );
  const query = TEST__chainOf([await ordersSource(), ...before, filter]);
  const [inputId] = query.getInputIds(filter.id);
  const input = buildSchemasAndValidity(
    query,
    registry().queryRules,
  ).schemas.get(inputId ?? '') as Schema;
  const answers = await engine.typeLambdas(
    model,
    buildCubeConditionCheckLambdas(
      query,
      filter,
      located ? expression.located : expression.lambda,
      input,
      registry(),
      located,
    ),
  );
  return readCubeConditionCheck(answers, filter, input, undefined);
};

/** ORDERS, the nodes, then the condition, checked; run on H2 */
const runFiltered = async (
  code: string,
  before: QueryNode[] = [],
  model: ModelContext = CUBE_NORTHWIND_MODEL,
): Promise<CubeResult> => {
  const expression = await engine.parseExpression(
    code,
    'expressionFilter101:condition',
  );
  const nodes = [await ordersSource(), ...before];
  const query: Query = TEST__chainOf([
    ...nodes,
    TEST__checkedExpressionFilter(
      'expressionFilter101',
      TEST__chainOf(nodes),
      code,
      expression.lambda,
    ),
  ]);
  return engine.execute(
    model,
    new QueryEmitter(query, registry()).emitExecutionLambda({
      rowLimit: 1000,
      runtime: CUBE_NORTHWIND_RUNTIME,
      databaseType: 'H2',
    }),
  );
};

const rowCount = async (code: string): Promise<number> =>
  (await runFiltered(code)).rows.length;

describe('Filter by Expression conditions, checked by the engine', () => {
  test.each([
    ['two columns compared', 'x | $x.SHIPPED_DATE > $x.REQUIRED_DATE'],
    ['a string function', "x | $x.SHIP_COUNTRY->toOne()->startsWith('F')"],
    [
      'a column that can be empty, compared without toOne()',
      'x | $x.SHIP_VIA > 1',
    ],
    ['an isEmpty()', 'x | $x.SHIP_REGION->isEmpty()'],
    [
      "the cube model's own function",
      'x | test::isLate($x.SHIPPED_DATE->toOne(), $x.REQUIRED_DATE->toOne())',
    ],
    ['any parameter name', 'row | $row.ORDER_ID > 10300'],
  ])('Checks %s', async (_, code) => {
    const { check, error } = await checkOf(code);
    expect(error).toBeUndefined();
    expect(check.kind).toBe('checked');
  });

  test("Needs the cube's model for its functions", async () => {
    const { check } = await checkOf(
      'x | test::isLate($x.SHIPPED_DATE->toOne(), $x.REQUIRED_DATE->toOne())',
      { model: CUBE_NORTHWIND_MODEL },
    );
    expect(check.kind).toBe('failed');
  });

  test.each([
    ['a number', 'x | $x.ORDER_ID + 1', 'Integer'],
    ['a text', "x | $x.SHIP_CITY->toOne() + '!'", 'String'],
    [
      'a Boolean that can be empty',
      'x | $x.SHIP_VIA->map(v | $v > 1)',
      'Boolean[0..1]',
    ],
  ])("Names the condition's type when it is %s", async (_, code, type) => {
    const { check } = await checkOf(code);
    expect(check).toMatchObject({ kind: 'failed', resultType: type });
  });

  test('Places an unknown column in the text, under the source id it was given', async () => {
    const { check, error } = await checkOf('x | $x.NOPE > 1', {
      located: true,
    });
    expect(check).toMatchObject({ kind: 'failed', resultType: undefined });
    expect(error?.kind).toBe(CubeEngineErrorKind.COMPILE);
    expect(error?.location?.sourceId).toBe('expressionFilter101:condition');
  });

  test("Refuses comparisons joined by && without parentheses: Pure's && binds as tightly as >", async () => {
    const { check } = await checkOf(
      'x | $x.ORDER_ID > 10300 && $x.SHIP_VIA > 1',
    );
    expect(check.kind).toBe('failed');
    expect(check.kind === 'failed' && check.message).toMatch(
      /Can't find a match for function 'and\(Boolean\[1\],SmallInt/u,
    );
    // with them, it is one Boolean
    expect(
      (await checkOf('x | ($x.ORDER_ID > 10300) && ($x.SHIP_VIA > 1)')).check
        .kind,
    ).toBe('checked');
  });
});

describe('Filter by Expression conditions, run', () => {
  test('Keeps the rows for which the condition is true: 37 orders shipped late, of 830', async () => {
    expect(await rowCount('x | true')).toBe(830);
    const late = await runFiltered('x | $x.SHIPPED_DATE > $x.REQUIRED_DATE');
    expect(late.rows).toHaveLength(37);
    // the cube model's function, the same rows
    expect(
      (
        await runFiltered(
          'x | test::isLate($x.SHIPPED_DATE->toOne(), $x.REQUIRED_DATE->toOne())',
          [],
          MODEL,
        )
      ).rows,
    ).toHaveLength(37);
  });

  test('Keeps rows with an empty value in a negation when the column is compared directly, and in neither after toOne()', async () => {
    // 507 orders have no SHIP_REGION, 34 have RJ
    expect(await rowCount('x | $x.SHIP_REGION->isEmpty()')).toBe(507);
    expect(await rowCount("x | $x.SHIP_REGION == 'RJ'")).toBe(34);
    expect(await rowCount("x | !($x.SHIP_REGION == 'RJ')")).toBe(796);
    // 21 orders have no SHIPPED_DATE: neither late nor not late after toOne()
    expect(
      await rowCount(
        'x | !($x.SHIPPED_DATE->toOne() > $x.REQUIRED_DATE->toOne())',
      ),
    ).toBe(772);
    expect(await rowCount('x | !($x.SHIP_VIA > 1)')).toBe(
      830 - (await rowCount('x | $x.SHIP_VIA > 1')),
    );
  });

  test("Runs after a Partition, on its window column, after the window: each country's first order", async () => {
    const all = await runFiltered('x | true');
    const firstOrder = new Map<unknown, number>();
    const countries = TEST__columnValues(all, 'SHIP_COUNTRY');
    TEST__columnValues(all, 'ORDER_ID').forEach((id, index) => {
      const country = countries[index];
      const known = firstOrder.get(country);
      if (known === undefined || Number(id) < known) {
        firstOrder.set(country, Number(id));
      }
    });
    const firsts = await runFiltered('x | $x.rn <= 1', [
      new Partition(
        'partition101',
        ['SHIP_COUNTRY'],
        [{ column: 'ORDER_ID', direction: SortDirection.ASC }],
        [
          {
            column: undefined,
            function: WindowRankFunction.ROW_NUMBER,
            name: 'rn',
          },
        ],
      ),
    ]);
    expect(TEST__columnValues(firsts, 'rn').map(Number)).toEqual(
      firsts.rows.map(() => 1),
    );
    expect(TEST__columnValues(firsts, 'ORDER_ID').map(Number).sort()).toEqual(
      [...firstOrder.values()].sort(),
    );
  });

  test("Runs on an Extend's column", async () => {
    const source = await ordersSource();
    const extend = TEST__typedExtend('extend101', TEST__chainOf([source]), [
      [
        'a',
        TEST__expression.lambda(
          TEST__expression.call(
            'plus',
            TEST__expression.pair(
              TEST__expression.column('ORDER_ID'),
              TEST__expression.integer(1),
            ),
          ),
        ),
        'Integer',
      ],
    ]);
    const extended = await runFiltered('x | $x.a > 10300', [extend]);
    expect(extended.rows).toHaveLength(
      await rowCount('x | $x.ORDER_ID >= 10300'),
    );
  });
});
