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
  CubeLambdaReadErrorKind,
  IngestDatasetSource,
} from '@finos/legend-cube';
import type { PlainObject } from '@finos/legend-shared';
import {
  CUBE_DEFINITION_FLOW_LABEL,
  CUBE_DEFINITION_FLOW_MESSAGE,
} from '../../__lib__/LegendCubeDefinitionFlowLabels.js';
import {
  CubeDefinitionFunctionClosedReason,
  loadCubeDefinitionFunctions,
  type CubeDefinitionFunctionElement,
} from '../CubeDefinitionFunctions.js';
import {
  CUBE_DEFINITION_SQL_OPEN_STEPS,
  describeCubeDefinitionUncheckedSql,
  findCubeDefinitionIngestDefinitions,
  findCubeDefinitionSql,
  getCubeDefinitionSqlFoldedAtFirst,
  readCubeDefinition,
  type CubeDefinitionFlowReading,
  type CubeDefinitionReading,
  type CubeDefinitionReadOptions,
  type CubeDefinitionSqlIsland,
} from '../CubeDefinitionReader.js';
import { CubeSqlStepKind } from '../CubeSqlStructure.js';
import FIXTURE from './CubeDefinitionFunctions.json' with { type: 'json' };
import TREES from './CubeSqlTrees.json' with { type: 'json' };

// The engine's SQL island in a definition's flow, `#SQL{select … from …}#`:
// one box, never a refusal. The JSON is as the engine's grammar writes an
// island: its SQL as one string. The data is made up.

const INGEST = FIXTURE.ingestDefinition;
const ELEMENTS = FIXTURE.functions as CubeDefinitionFunctionElement[];

const getIngestDefinition = (path: string): PlainObject | undefined =>
  path === INGEST
    ? (FIXTURE.ingestDefinitionContent as PlainObject)
    : undefined;

/** `#SQL{…}#`, as the engine's grammar writes one */
const sqlOf = (sql: string): PlainObject => ({
  _type: 'classInstance',
  type: 'SQL',
  value: { sql },
});
/** `#I{shop::ingest::OrdersIngest.<dataSet>}#` */
const dataSetOf = (dataSet: string): PlainObject => ({
  _type: 'classInstance',
  type: 'I',
  value: { metadata: false, path: [INGEST, dataSet] },
});
const call = (name: string, ...parameters: PlainObject[]): PlainObject => ({
  _type: 'func',
  function: name,
  parameters,
});
const variable = (name: string): PlainObject => ({ _type: 'var', name });
const property = (name: string, of: string): PlainObject => ({
  _type: 'property',
  property: name,
  parameters: [variable(of)],
});
const lambdaOf = (
  body: PlainObject[],
  parameters: PlainObject[] = [],
): PlainObject => ({ _type: 'lambda', parameters, body });
/** `x|$x.STATUS == 'ACTIVE'` */
const IS_ACTIVE = lambdaOf(
  [
    call('equal', property('STATUS', 'x'), {
      _type: 'string',
      value: 'ACTIVE',
    }),
  ],
  [variable('x')],
);
/** `let name = value` */
const letOf = (name: string, value: PlainObject): PlainObject =>
  call('letFunction', { _type: 'string', value: name }, value);

const ORDERS_SQL = `select STATUS, sum(AMOUNT) as total from i('${INGEST}.ORDERS') group by STATUS`;

const asFlow = (reading: CubeDefinitionReading): CubeDefinitionFlowReading => {
  if (reading.kind !== 'flow') {
    throw new Error(`Refused: ${reading.message}`);
  }
  return reading;
};
const read = (
  lambda: PlainObject,
  options: CubeDefinitionReadOptions = {},
): CubeDefinitionFlowReading =>
  asFlow(readCubeDefinition(lambda, { getIngestDefinition, ...options }));
const stepsOf = (flow: CubeDefinitionFlowReading): string[] =>
  flow.steps.map(
    (step) =>
      `${step.id}${step.inputs.length ? ` < ${step.inputs.join(', ')}` : ''}`,
  );

/** A function of the fixture's project, its body and parameters replaced */
const functionOf = (
  path: string,
  parameters: PlainObject[],
  body: PlainObject[],
): CubeDefinitionFunctionElement => {
  const template = ELEMENTS.find(
    (element) => element.path === 'shop::orders::activeOrders__Relation_1_',
  ) as CubeDefinitionFunctionElement;
  const name = path.slice(path.lastIndexOf('::') + 2);
  return {
    path,
    content: { ...template.content, name, parameters, body },
  };
};
const loadFunctions = (
  lambda: PlainObject,
  elements: readonly CubeDefinitionFunctionElement[],
): ReturnType<typeof loadCubeDefinitionFunctions> =>
  loadCubeDefinitionFunctions(lambda, async (names) =>
    elements.filter((element) =>
      names.some((name) => element.path.startsWith(`${name}_`)),
    ),
  );
const readWithFunctions = async (
  lambda: PlainObject,
  elements: readonly CubeDefinitionFunctionElement[],
  options: CubeDefinitionReadOptions = {},
): Promise<CubeDefinitionFlowReading> =>
  read(lambda, {
    functions: await loadFunctions(lambda, elements),
    ...options,
  });

describe('SQL in a definition, drawn as one box', () => {
  test('SQL alone is one step: its SQL as written, and what its text names', () => {
    const sql = `select o.ORDER_ID, c.NAME from i('${INGEST}.ORDERS') o join p('shop::Product.customers') c on o.CUSTOMER_ID = c.CUSTOMER_ID`;
    const flow = read(lambdaOf([sqlOf(sql)]));
    expect(stepsOf(flow)).toEqual(['unknown101']);
    expect(flow.outputStepId).toBe('unknown101');
    expect(flow.uncheckedStepIds).toEqual([]);
    expect(flow.sqlIslands).toEqual([
      {
        id: 'unknown101',
        stepId: 'unknown101',
        sql,
        dataSets: [{ ingestDefinition: INGEST, dataSet: 'ORDERS' }],
        accessPoints: [
          { dataProduct: 'shop::Product', accessPoint: 'customers' },
        ],
      },
    ]);
    // nothing is read after it
    expect(describeCubeDefinitionUncheckedSql(flow)).toBeUndefined();
    // the definition's own data sets are none: Cube loads no definition for what SQL names
    expect(findCubeDefinitionIngestDefinitions(lambdaOf([sqlOf(sql)]))).toEqual(
      [],
    );
  });

  test('The Pure steps after SQL are drawn, unchecked, and the host is told', () => {
    const flow = read(
      lambdaOf([
        call('select', call('filter', sqlOf(ORDERS_SQL), IS_ACTIVE), {
          _type: 'classInstance',
          type: 'colSpecArray',
          value: { colSpecs: [{ name: 'STATUS' }] },
        }),
      ]),
    );
    expect(stepsOf(flow)).toEqual([
      'unknown101',
      'filter101 < unknown101',
      'restrict101 < filter101',
    ]);
    expect(flow.uncheckedStepIds).toEqual(['filter101', 'restrict101']);
    expect(describeCubeDefinitionUncheckedSql(flow)).toBe(
      CUBE_DEFINITION_FLOW_LABEL.SQL_UNCHECKED(1),
    );
    expect(flow.sqlIslands.map((island) => island.stepId)).toEqual([
      'unknown101',
    ]);
  });

  test("SQL as a join's other side: the data set beside it keeps its columns", () => {
    const lambda = lambdaOf([
      call(
        'join',
        dataSetOf('ORDERS'),
        sqlOf(`select CUSTOMER_ID as CID from i('${INGEST}.CUSTOMERS')`),
        { _type: 'enumValue', fullPath: 'JoinKind', value: 'INNER' },
        lambdaOf(
          [call('equal', property('CUSTOMER_ID', 'a'), property('CID', 'b'))],
          [variable('a'), variable('b')],
        ),
      ),
    ]);
    const flow = read(lambda);
    expect(stepsOf(flow)).toEqual([
      'ingestDataset101',
      'unknown101',
      'join101 < ingestDataset101, unknown101',
    ]);
    expect(flow.unknownDataSets).toEqual([]);
    expect(flow.uncheckedStepIds).toEqual(['join101']);
    // the data set Pure reads is loaded; the one SQL names isn't
    expect(findCubeDefinitionIngestDefinitions(lambda)).toEqual([INGEST]);
    expect(flow.sqlIslands[0]?.dataSets).toEqual([
      { ingestDefinition: INGEST, dataSet: 'CUSTOMERS' },
    ]);
  });

  test("A let SQL reads by name is its input, so the let isn't refused as unread", () => {
    const flow = read(
      lambdaOf([
        letOf('active', call('filter', dataSetOf('ORDERS'), IS_ACTIVE)),
        sqlOf("select STATUS, AMOUNT from var('active')"),
      ]),
    );
    expect(stepsOf(flow)).toEqual([
      'ingestDataset101',
      'filter101 < ingestDataset101',
      'unknown101 < filter101',
    ]);
    expect(flow.outputStepId).toBe('unknown101');
    // the let's data set is typed: nothing before the SQL is unchecked
    expect(flow.unknownDataSets).toEqual([]);
    expect(flow.uncheckedStepIds).toEqual([]);
  });

  test('The ingest definition of a let is found for the host to load, with or without functions', async () => {
    const pure = lambdaOf([
      letOf('active', call('filter', dataSetOf('ORDERS'), IS_ACTIVE)),
      call('limit', variable('active'), { _type: 'integer', value: 5 }),
    ]);
    const sql = lambdaOf([
      letOf('active', call('filter', dataSetOf('ORDERS'), IS_ACTIVE)),
      sqlOf("select STATUS, AMOUNT from var('active')"),
    ]);
    const functions = await loadCubeDefinitionFunctions(pure, async () => []);
    expect(findCubeDefinitionIngestDefinitions(sql)).toEqual([INGEST]);
    expect(findCubeDefinitionIngestDefinitions(sql, { functions })).toEqual([
      INGEST,
    ]);
    // a let read by a Pure step, too, when the host loads functions
    expect(findCubeDefinitionIngestDefinitions(pure)).toEqual([INGEST]);
    expect(findCubeDefinitionIngestDefinitions(pure, { functions })).toEqual([
      INGEST,
    ]);
  });

  test('A parameter SQL reads by name is wired to its step', () => {
    const flow = read(
      lambdaOf(
        [sqlOf(`select * from i('${INGEST}.ORDERS') where D > var('since')`)],
        [variable('since'), variable('region')],
      ),
    );
    expect(
      flow.parameters.map((parameter) => [parameter.name, parameter.stepIds]),
    ).toEqual([
      ['since', ['unknown101']],
      ['region', []],
    ]);
  });

  test('Two SQL steps with steps after them: the note says each', () => {
    const flow = read(
      lambdaOf([
        call(
          'limit',
          call('concatenate', sqlOf('select 1 as A'), sqlOf('select 2 as A')),
          { _type: 'integer', value: 5 },
        ),
      ]),
    );
    expect(flow.sqlIslands.map((island) => island.stepId)).toEqual([
      'unknown101',
      'unknown102',
    ]);
    expect(describeCubeDefinitionUncheckedSql(flow)).toBe(
      CUBE_DEFINITION_FLOW_LABEL.SQL_UNCHECKED(2),
    );
  });

  test('An island that holds no SQL is refused, as a source', () => {
    const reading = readCubeDefinition(
      lambdaOf([{ _type: 'classInstance', type: 'SQL', value: {} }]),
    );
    expect(reading).toMatchObject({
      kind: 'refused',
      reason: CubeLambdaReadErrorKind.SOURCE,
    });
  });
});

describe('SQL in the body of a user-defined function', () => {
  test('A function whose body is SQL opens: the SQL is the one step in its container', async () => {
    const flow = await readWithFunctions(
      lambdaOf([
        call('limit', call('shop::orders::bySql'), {
          _type: 'integer',
          value: 5,
        }),
      ]),
      [functionOf('shop::orders::bySql__Relation_1_', [], [sqlOf(ORDERS_SQL)])],
    );
    expect(stepsOf(flow)).toEqual(['unknown101', 'limit101 < unknown101']);
    expect(
      flow.functionCalls.map((each) => [
        each.shortName,
        each.opened,
        each.stepIds,
      ]),
    ).toEqual([['bySql', true, ['unknown101']]]);
    expect(flow.sqlIslands.map((island) => island.stepId)).toEqual([
      'unknown101',
    ]);
  });

  test("A function whose SQL reads one of its values by name stays one box: Cube doesn't rewrite SQL", async () => {
    const since = {
      ...variable('since'),
      genericType: {
        rawType: { _type: 'packageableType', fullPath: 'StrictDate' },
        typeArguments: [],
        multiplicityArguments: [],
        typeVariableValues: [],
      },
      multiplicity: { lowerBound: 1, upperBound: 1 },
    };
    const flow = await readWithFunctions(
      lambdaOf([
        call('shop::orders::sinceBySql', {
          _type: 'strictDate',
          value: '2026-01-01',
        }),
      ]),
      [
        functionOf(
          'shop::orders::sinceBySql_StrictDate_1__Relation_1_',
          [since],
          [sqlOf(`select * from i('${INGEST}.ORDERS') where D > var('since')`)],
        ),
      ],
    );
    expect(
      flow.functionCalls.map((each) => [
        each.shortName,
        each.opened,
        each.closedReason,
        each.closedMessage,
      ]),
    ).toEqual([
      [
        'sinceBySql',
        false,
        CubeDefinitionFunctionClosedReason.NOT_DRAWABLE,
        CUBE_DEFINITION_FLOW_MESSAGE.SQL_READS_VALUE('since'),
      ],
    ]);
    // the function is the box: its SQL isn't a step of the flow
    expect(flow.sqlIslands).toEqual([]);
  });
});

// With the engine's tree of its SQL, which a host asks the engine for, an
// island is drawn as the steps of its SQL. The trees are the engine's own,
// of the made-up SQL beside each.

/** The engine's tree of each SQL of the fixture, as a host that asked for them gives them */
const getSqlTree: CubeDefinitionReadOptions['getSqlTree'] = (sql) =>
  Object.values(TREES).find((each) => each.sql === sql)?.tree;
const JOINED_SQL = TREES['join-group-order-limit'].sql;
const LET_SQL = TREES['var-let'].sql;
const limitOf = (rows: PlainObject): PlainObject =>
  call('limit', rows, { _type: 'integer', value: 5 });
/** Each step of an island's SQL: its id, its kind, what it says, and its alias */
const sqlStepsOf = (island: CubeDefinitionSqlIsland | undefined): string[] =>
  (island?.steps ?? []).map((step) =>
    [
      step.stepId,
      step.variant === undefined ? step.kind : `${step.kind}:${step.variant}`,
      ...(step.text ? [step.text] : []),
      ...(step.alias === undefined ? [] : [`as ${step.alias}`]),
    ].join(' | '),
  );

describe("SQL in a definition, drawn as the steps of its SQL with the engine's tree", () => {
  test('SQL is its sources, then its clauses in the order they run, its data sets typed', () => {
    const flow = read(lambdaOf([sqlOf(JOINED_SQL)]), { getSqlTree });
    expect(stepsOf(flow)).toEqual([
      'ingestDataset101',
      'ingestDataset102',
      'unknown101 < ingestDataset101, ingestDataset102',
      'unknown102 < unknown101',
      'unknown103 < unknown102',
      'unknown104 < unknown103',
      'unknown105 < unknown104',
      'unknown106 < unknown105',
    ]);
    expect(flow.outputStepId).toBe('unknown106');
    const [island] = flow.sqlIslands;
    expect(flow.sqlIslands).toHaveLength(1);
    expect(island).toMatchObject({
      id: 'sql1',
      // the step the steps after it read
      stepId: 'unknown106',
      sql: JOINED_SQL,
      dataSets: [
        { ingestDefinition: INGEST, dataSet: 'ORDERS' },
        { ingestDefinition: INGEST, dataSet: 'CUSTOMERS' },
      ],
    });
    expect(sqlStepsOf(island)).toEqual([
      `ingestDataset101 | dataSet | ${INGEST}.ORDERS | as o`,
      `ingestDataset102 | dataSet | ${INGEST}.CUSTOMERS | as c`,
      'unknown101 | join:INNER | on o.CUSTOMER_ID = c.CUSTOMER_ID',
      "unknown102 | where | o.STATUS = 'ACTIVE'",
      'unknown103 | groupBy | c.REGION',
      'unknown104 | select | c.REGION, sum(o.AMOUNT) as TOTAL_AMOUNT, count(*) as ORDERS',
      'unknown105 | orderBy | TOTAL_AMOUNT desc',
      'unknown106 | limit | 10',
    ]);
    expect(island?.steps?.[5]?.columns).toEqual([
      'REGION',
      'TOTAL_AMOUNT',
      'ORDERS',
    ]);
    // its data sets are steps as any other, typed by their definition
    ['ingestDataset101', 'ingestDataset102'].forEach((id) => {
      const node = flow.query.getNode(id);
      expect(node).toBeInstanceOf(IngestDatasetSource);
      expect((node as IngestDatasetSource).resolution.kind).toBe('resolved');
    });
    expect(flow.unknownDataSets).toEqual([]);
    // Cube checks none of the SQL's steps: none is listed as unchecked
    expect(flow.uncheckedStepIds).toEqual([]);
    expect(describeCubeDefinitionUncheckedSql(flow)).toBeUndefined();
  });

  test('The Pure steps after it read its last step, unchecked, and the host is told', () => {
    const flow = read(lambdaOf([limitOf(sqlOf(JOINED_SQL))]), { getSqlTree });
    expect(stepsOf(flow).at(-1)).toBe('limit101 < unknown106');
    expect(flow.uncheckedStepIds).toEqual(['limit101']);
    expect(describeCubeDefinitionUncheckedSql(flow)).toBe(
      CUBE_DEFINITION_FLOW_LABEL.SQL_UNCHECKED(1),
    );
  });

  test('A data set whose definition the host has not is drawn by name, as in Pure', () => {
    const flow = read(lambdaOf([sqlOf(TREES['union-all'].sql)]), {
      getSqlTree,
    });
    expect(flow.unknownDataSets).toEqual([
      { ingestDefinition: INGEST, dataSet: 'ARCHIVE' },
    ]);
    expect(sqlStepsOf(flow.sqlIslands[0]).slice(-3)).toEqual([
      'unknown104 | set:union all',
      'unknown105 | orderBy | AMOUNT',
      'unknown106 | limit | 5',
    ]);
  });

  test('Without its tree, or with SQL Cube has no steps for, it stays one box', () => {
    const lambda = lambdaOf([sqlOf(JOINED_SQL)]);
    expect(stepsOf(read(lambda))).toEqual(['unknown101']);
    expect(stepsOf(read(lambda, { getSqlTree: () => undefined }))).toEqual([
      'unknown101',
    ]);
    // a tree that isn't the engine's
    expect(
      read(lambda, { getSqlTree: () => ({ error: 'no' }) }).sqlIslands,
    ).toMatchObject([{ id: 'unknown101', stepId: 'unknown101' }]);
    const refused = read(lambdaOf([sqlOf(TREES['in-subquery'].sql)]), {
      getSqlTree,
    });
    expect(stepsOf(refused)).toEqual(['unknown101']);
    expect(refused.sqlIslands).toMatchObject([
      {
        id: 'unknown101',
        stepId: 'unknown101',
        closedMessage: 'a query inside an expression',
      },
    ]);
    expect(refused.sqlIslands[0]?.steps).toBeUndefined();
  });

  test("A let it reads by name is read where it is: its steps are not the SQL's", () => {
    const lambda = lambdaOf(
      [
        letOf('active', call('filter', dataSetOf('ORDERS'), IS_ACTIVE)),
        sqlOf(LET_SQL),
      ],
      [variable('since')],
    );
    const flow = read(lambda, { getSqlTree });
    expect(stepsOf(flow)).toEqual([
      'ingestDataset101',
      'filter101 < ingestDataset101',
      'unknown101 < filter101',
      'unknown102 < unknown101',
      'unknown103 < unknown102',
    ]);
    expect(sqlStepsOf(flow.sqlIslands[0])).toEqual([
      "unknown101 | where | a.ORDER_DATE > var('since')",
      'unknown102 | groupBy | REGION',
      'unknown103 | select | REGION, sum(AMOUNT) as TOTAL_AMOUNT',
    ]);
    // the parameter its SQL reads is wired to its last step
    expect(flow.parameters.map((each) => [each.name, each.stepIds])).toEqual([
      ['since', ['unknown103']],
    ]);
  });

  test('A name it reads that no let binds is a step of its own', () => {
    const flow = read(lambdaOf([sqlOf(LET_SQL)]), { getSqlTree });
    expect(sqlStepsOf(flow.sqlIslands[0])[0]).toBe(
      `unknown101 | ${CubeSqlStepKind.VARIABLE} | active | as a`,
    );
  });

  test('Two islands are two containers, in the order the flow reads them', () => {
    const flow = read(
      lambdaOf([
        call(
          'concatenate',
          sqlOf(TREES.star.sql),
          sqlOf(TREES['in-subquery'].sql),
        ),
      ]),
      { getSqlTree },
    );
    expect(
      flow.sqlIslands.map((island) => [
        island.id,
        island.stepId,
        island.steps?.length,
      ]),
    ).toEqual([
      ['sql1', 'unknown101', 2],
      ['unknown102', 'unknown102', undefined],
    ]);
  });

  test("The host is told the SQL to ask the engine for, and the definitions its tree's data sets need", async () => {
    const lambda = lambdaOf([
      call('concatenate', sqlOf(JOINED_SQL), limitOf(sqlOf(JOINED_SQL))),
    ]);
    expect(findCubeDefinitionSql(lambda)).toEqual([JOINED_SQL]);
    expect(findCubeDefinitionSql({ _type: 'string', value: 'x' })).toEqual([]);
    expect(findCubeDefinitionIngestDefinitions(lambda)).toEqual([]);
    expect(findCubeDefinitionIngestDefinitions(lambda, { getSqlTree })).toEqual(
      [INGEST],
    );
    // SQL Cube has no steps for needs none
    expect(
      findCubeDefinitionIngestDefinitions(
        lambdaOf([sqlOf(TREES['in-subquery'].sql)]),
        { getSqlTree },
      ),
    ).toEqual([]);
  });

  test("In the body of a function, its container is in the call's", async () => {
    const lambda = lambdaOf([limitOf(call('shop::orders::bySql'))]);
    const elements = [
      functionOf('shop::orders::bySql__Relation_1_', [], [sqlOf(JOINED_SQL)]),
    ];
    const functions = await loadFunctions(lambda, elements);
    expect(findCubeDefinitionSql(lambda)).toEqual([]);
    expect(findCubeDefinitionSql(lambda, { functions })).toEqual([JOINED_SQL]);
    expect(
      findCubeDefinitionIngestDefinitions(lambda, { functions, getSqlTree }),
    ).toEqual([INGEST]);
    const flow = read(lambda, { functions, getSqlTree });
    expect(stepsOf(flow).at(-1)).toBe('limit101 < unknown106');
    const [bySql] = flow.functionCalls;
    // the call holds the SQL's container, and no step of its own
    expect([bySql?.opened, bySql?.stepIds]).toEqual([true, []]);
    expect(flow.sqlIslands).toMatchObject([
      { id: 'sql1', stepId: 'unknown106', parentId: bySql?.id },
    ]);
    expect(flow.sqlIslands[0]?.steps).toHaveLength(8);
  });

  test('SQL of many steps starts folded', () => {
    const islandOf = (id: string, count?: number): CubeDefinitionSqlIsland => ({
      id,
      stepId: id,
      sql: 'select 1',
      dataSets: [],
      accessPoints: [],
      ...(count === undefined
        ? {}
        : {
            steps: Array.from({ length: count }, (_, index) => ({
              stepId: `${id}-${index}`,
              kind: CubeSqlStepKind.WHERE,
              text: '',
            })),
          }),
    });
    expect(
      getCubeDefinitionSqlFoldedAtFirst([
        islandOf('box'),
        islandOf('small', CUBE_DEFINITION_SQL_OPEN_STEPS),
        islandOf('big', CUBE_DEFINITION_SQL_OPEN_STEPS + 1),
      ]),
    ).toEqual(['big']);
  });
});
