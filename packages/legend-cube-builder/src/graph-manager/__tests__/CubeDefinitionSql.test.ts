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
import { CubeLambdaReadErrorKind } from '@finos/legend-cube';
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
  describeCubeDefinitionUncheckedSql,
  findCubeDefinitionIngestDefinitions,
  readCubeDefinition,
  type CubeDefinitionFlowReading,
  type CubeDefinitionReading,
} from '../CubeDefinitionReader.js';
import FIXTURE from './CubeDefinitionFunctions.json' with { type: 'json' };

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
const read = (lambda: PlainObject): CubeDefinitionFlowReading =>
  asFlow(readCubeDefinition(lambda, { getIngestDefinition }));
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
const readWithFunctions = async (
  lambda: PlainObject,
  elements: readonly CubeDefinitionFunctionElement[],
): Promise<CubeDefinitionFlowReading> =>
  asFlow(
    readCubeDefinition(lambda, {
      functions: await loadCubeDefinitionFunctions(lambda, async (names) =>
        elements.filter((element) =>
          names.some((name) => element.path.startsWith(`${name}_`)),
        ),
      ),
      getIngestDefinition,
    }),
  );

describe('SQL in a definition, drawn as one box', () => {
  test('SQL alone is one step: its SQL as written, and what its text names', () => {
    const sql = `select o.ORDER_ID, c.NAME from i('${INGEST}.ORDERS') o join p('shop::Product.customers') c on o.CUSTOMER_ID = c.CUSTOMER_ID`;
    const flow = read(lambdaOf([sqlOf(sql)]));
    expect(stepsOf(flow)).toEqual(['unknown101']);
    expect(flow.outputStepId).toBe('unknown101');
    expect(flow.uncheckedStepIds).toEqual([]);
    expect(flow.sqlIslands).toEqual([
      {
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
