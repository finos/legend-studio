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
  CubeDefinitionFunctionClosedReason,
  CUBE_DEFINITION_FUNCTION_DEPTH,
  loadCubeDefinitionFunctions,
  type CubeDefinitionFunctionElement,
} from '../CubeDefinitionFunctions.js';
import {
  CUBE_DEFINITION_CALL_OPEN_STEPS,
  countCubeDefinitionCallSteps,
  findCubeDefinitionIngestDefinitions,
  getCubeDefinitionCallsFoldedAtFirst,
  readCubeDefinition,
  type CubeDefinitionFlowReading,
  type CubeDefinitionFunctionContainer,
  type CubeDefinitionReading,
} from '../CubeDefinitionReader.js';
import FIXTURE from './CubeDefinitionFunctions.json' with { type: 'json' };

// User-defined functions in a definition's flow (PLAN §11.33): each call Cube
// can open drawn as a container of its body's steps, each it can't as one box.
// The fixture is a made-up data product's: its access points' lambdas, the
// functions they call, from its project and a dependency, and its ingest
// definition, as the engine's grammar writes them (`topActiveOrders` was put
// together from pieces the engine wrote).

const ELEMENTS = FIXTURE.functions as CubeDefinitionFunctionElement[];
const ACCESS_POINTS = FIXTURE.accessPoints as Record<string, PlainObject>;

const getIngestDefinition = (path: string): PlainObject | undefined =>
  path === FIXTURE.ingestDefinition
    ? (FIXTURE.ingestDefinitionContent as PlainObject)
    : undefined;

/** A host's loader over these elements, recording the names it is asked for */
const loaderOver =
  (
    elements: readonly CubeDefinitionFunctionElement[],
    asked: string[][] = [],
  ) =>
  async (
    names: readonly string[],
  ): Promise<CubeDefinitionFunctionElement[]> => {
    asked.push([...names]);
    return elements.filter((element) =>
      names.some((name) => element.path.startsWith(`${name}_`)),
    );
  };

const readWithFunctions = async (
  lambda: PlainObject,
  elements: readonly CubeDefinitionFunctionElement[] = ELEMENTS,
): Promise<CubeDefinitionReading> =>
  readCubeDefinition(lambda, {
    functions: await loadCubeDefinitionFunctions(lambda, loaderOver(elements)),
    getIngestDefinition,
  });

const asFlow = (reading: CubeDefinitionReading): CubeDefinitionFlowReading => {
  if (reading.kind !== 'flow') {
    throw new Error(`Refused: ${reading.message}`);
  }
  return reading;
};

const read = async (
  accessPoint: string,
  elements?: readonly CubeDefinitionFunctionElement[],
): Promise<CubeDefinitionFlowReading> =>
  asFlow(
    await readWithFunctions(
      ACCESS_POINTS[accessPoint] as PlainObject,
      elements,
    ),
  );

const stepTypes = (flow: CubeDefinitionFlowReading): string[] =>
  flow.steps.map((step) => step.type);

/** Each call as `name(values) opened|closed:reason [steps] <parent` */
const callsOf = (flow: CubeDefinitionFlowReading): string[] =>
  flow.functionCalls.map(
    (call: CubeDefinitionFunctionContainer) =>
      `${call.shortName}(${call.values.join(', ')}) ${
        call.opened ? 'opened' : `closed:${call.closedReason}`
      } [${call.stepIds.join(', ')}]${call.parentId ? ` <${call.parentId}` : ''}`,
  );

// ---------------------------------------- the elements of the synthetic cases ----------------------------------------

const ACTIVE_ORDERS = ELEMENTS.find(
  (element) => element.path === 'shop::orders::activeOrders__Relation_1_',
) as CubeDefinitionFunctionElement;
const ACTIVE_ORDERS_BODY = (
  ACTIVE_ORDERS.content.body as PlainObject[]
)[0] as PlainObject;
/** `#I{shop::ingest::OrdersIngest.ORDERS}#` */
const ORDERS = (
  ACTIVE_ORDERS_BODY.parameters as PlainObject[]
)[0] as PlainObject;
/** `o|$o.STATUS == 'ACTIVE'` */
const IS_ACTIVE = (
  ACTIVE_ORDERS_BODY.parameters as PlainObject[]
)[1] as PlainObject;

const call = (name: string, ...parameters: PlainObject[]): PlainObject => ({
  _type: 'func',
  function: name,
  parameters,
});
const variable = (name: string): PlainObject => ({ _type: 'var', name });
const string = (value: string): PlainObject => ({ _type: 'string', value });
const integer = (value: number): PlainObject => ({ _type: 'integer', value });
const lambdaOf = (
  body: PlainObject[],
  parameters: PlainObject[] = [],
): PlainObject => ({
  _type: 'lambda',
  body,
  parameters,
});
const parameterOf = (name: string, type: string): PlainObject => ({
  _type: 'var',
  name,
  genericType: {
    rawType: { _type: 'packageableType', fullPath: type },
    typeArguments: [],
    multiplicityArguments: [],
    typeVariableValues: [],
  },
  multiplicity: { lowerBound: 1, upperBound: 1 },
});

/**
 * A function of the `shop::test` package returning what `activeOrders`
 * declares, named as the engine names it: its name and its signature
 */
const functionOf = (
  name: string,
  parameters: [string, string][],
  body: PlainObject[],
): CubeDefinitionFunctionElement => {
  const signature = `_${parameters
    .map(([, type]) => `${type}_1_`)
    .join('_')}_Relation_1_`;
  return {
    path: `shop::test::${name}${signature}`,
    content: {
      ...ACTIVE_ORDERS.content,
      package: 'shop::test',
      name: `${name}${signature}`,
      parameters: parameters.map(([parameter, type]) =>
        parameterOf(parameter, type),
      ),
      body,
    },
  };
};

const filterActive = (rows: PlainObject): PlainObject =>
  call('filter', rows, IS_ACTIVE);

describe('Calls of user-defined functions in a definition', () => {
  test('Draws a call as a container of its body, the steps after it checked against its columns', async () => {
    const flow = await read('active_orders_by_region');
    expect(stepTypes(flow)).toEqual(['ingestDataset', 'filter', 'group']);
    expect(callsOf(flow)).toEqual([
      'activeOrders() opened [ingestDataset101, filter101]',
    ]);
    expect(flow.uncheckedStepIds).toEqual([]);
    expect(flow.unknownDataSets).toEqual([]);
    expect(flow.functionCalls[0]).toMatchObject({
      name: 'shop::orders::activeOrders',
      path: 'shop::orders::activeOrders__Relation_1_',
      origin: undefined,
      declaredColumns: [
        'ORDER_ID',
        'CUSTOMER_ID',
        'REGION',
        'STATUS',
        'ORDER_DATE',
        'AMOUNT',
      ],
    });
  });

  test("Puts a call's values in place of its parameters, and shows them on top", async () => {
    const flow = await read('emea_orders_since');
    expect(callsOf(flow)).toEqual([
      "ordersSince(%2026-01-01, 'EMEA') opened [ingestDataset101, filter101]",
    ]);
    // with the values put in, Cube writes the condition as a Filter by Column
    expect(stepTypes(flow)).toEqual(['ingestDataset', 'filter', 'restrict']);
    expect(flow.functionCalls[0]?.signature).toBe(
      'ordersSince(since: StrictDate[1], region: String[1]): Relation<(ORDER_ID, CUSTOMER_ID, REGION, STATUS, ORDER_DATE, AMOUNT)>[1]',
    );
  });

  test('Draws a call in a function as a container inside the call of that function', async () => {
    const flow = await read('large_active_orders');
    expect(callsOf(flow)).toEqual([
      'largeActiveOrders(10000.0) opened [expressionFilter101]',
      'activeOrders() opened [ingestDataset101, filter101] <call1',
    ]);
    expect(countCubeDefinitionCallSteps(flow.functionCalls, 'call1')).toBe(3);
  });

  test("Reads the relation a function takes before its container, its function's project named", async () => {
    const flow = await read('open_orders');
    expect(stepTypes(flow)).toEqual(['ingestDataset', 'filter', 'restrict']);
    expect(callsOf(flow)).toEqual(['onlyOpen() opened [filter101]']);
    expect(flow.functionCalls[0]?.origin).toBe(
      'org.example.shop:shop-common:2.1.0',
    );
  });

  test("Draws a call that is a join's input", async () => {
    const flow = await read('customer_orders');
    expect(stepTypes(flow)).toEqual([
      'ingestDataset',
      'ingestDataset',
      'filter',
      'rename',
      'join',
      'restrict',
    ]);
    expect(callsOf(flow)).toEqual([
      'activeOrders() opened [ingestDataset102, filter101]',
    ]);
  });

  test('Keeps a scalar function an expression calls as written, naming it on the step', async () => {
    const flow = await read('recent_orders');
    expect(flow.functionCalls).toEqual([]);
    expect(stepTypes(flow)).toEqual([
      'ingestDataset',
      'expressionFilter',
      'restrict',
    ]);
    expect(flow.scalarFunctions.get('expressionFilter101')).toEqual([
      {
        name: 'shop::orders::defaultCutoff',
        path: 'shop::orders::defaultCutoff__StrictDate_1_',
        signature: 'defaultCutoff(): StrictDate[1]',
        origin: undefined,
      },
    ]);
  });

  test('Names a scalar function on the step whose expression calls it, not on a join it feeds', async () => {
    // customers joined to the recent orders: the call is in the right input
    const recent = (
      (ACCESS_POINTS.recent_orders?.body as PlainObject[])[0]
        ?.parameters as PlainObject[]
    )[0] as PlainObject;
    const replace = (value: unknown): unknown =>
      Array.isArray(value)
        ? value.map(replace)
        : value && typeof value === 'object'
          ? (value as PlainObject).function === 'shop::orders::activeOrders'
            ? recent
            : Object.fromEntries(
                Object.entries(value).map(([key, child]) => [
                  key,
                  replace(child),
                ]),
              )
          : value;
    const flow = asFlow(
      await readWithFunctions(
        replace(ACCESS_POINTS.customer_orders) as PlainObject,
      ),
    );
    expect(stepTypes(flow)).toContain('join');
    expect([...flow.scalarFunctions.keys()]).toEqual(['expressionFilter101']);
  });

  test('Folds at first a call holding more steps than it opens', async () => {
    const flow = await read('top_customers');
    expect(countCubeDefinitionCallSteps(flow.functionCalls, 'call1')).toBe(6);
    expect(CUBE_DEFINITION_CALL_OPEN_STEPS).toBe(5);
    expect(getCubeDefinitionCallsFoldedAtFirst(flow.functionCalls)).toEqual([
      'call1',
    ]);
    expect(
      getCubeDefinitionCallsFoldedAtFirst(
        (await read('large_active_orders')).functionCalls,
      ),
    ).toEqual([]);
  });

  test('Finds the ingest definitions the bodies of the functions read', async () => {
    for (const accessPoint of ['active_orders_by_region', 'open_orders']) {
      const lambda = ACCESS_POINTS[accessPoint] as PlainObject;
      const functions = await loadCubeDefinitionFunctions(
        lambda,
        loaderOver(ELEMENTS),
      );
      expect(
        findCubeDefinitionIngestDefinitions(lambda, { functions }),
      ).toEqual(['shop::ingest::OrdersIngest']);
      // without them, a call is a source, which the finder doesn't look into
      expect(findCubeDefinitionIngestDefinitions(lambda)).toEqual([]);
    }
  });

  test('Refuses a call as before when the host gives no functions', () => {
    const reading = readCubeDefinition(ACCESS_POINTS.active_orders_by_region, {
      getIngestDefinition,
    });
    expect(reading).toMatchObject({
      kind: 'refused',
      reason: CubeLambdaReadErrorKind.SOURCE,
    });
  });
});

describe("Calls Cube can't open: one box each", () => {
  test('A function whose body has statements other than lets, typed by the columns it declares', async () => {
    const flow = await read('checked_orders');
    expect(stepTypes(flow)).toEqual(['function', 'restrict']);
    expect(callsOf(flow)).toEqual([
      'checkedOrders(0.0) closed:statements [function101]',
    ]);
    expect(flow.uncheckedStepIds).toEqual([]);
  });

  test("A function whose body Cube can't draw, in Cube's words; the steps after it unchecked", async () => {
    const flow = await read('latest_customer_orders');
    expect(callsOf(flow)).toEqual([
      'latestCustomerOrders() closed:notDrawable [function101]',
    ]);
    expect(flow.functionCalls[0]?.closedMessage).toContain('asOfJoin');
    expect(flow.uncheckedStepIds).toEqual(['limit101']);
  });

  test("A function the host doesn't have", async () => {
    const flow = await read('archived_orders');
    expect(callsOf(flow)).toEqual([
      'archivedOrders() closed:notFound [function101]',
    ]);
    expect(flow.functionCalls[0]?.path).toBeUndefined();
  });

  test('Two functions of that name taking as many values', async () => {
    const twin: CubeDefinitionFunctionElement = {
      path: 'shop::orders::activeOrders__Relation_MANY_',
      content: {
        ...ACTIVE_ORDERS.content,
        name: 'activeOrders__Relation_MANY_',
        returnMultiplicity: { lowerBound: 0 },
      },
    };
    const flow = await read('active_orders_by_region', [...ELEMENTS, twin]);
    expect(callsOf(flow)).toEqual([
      'activeOrders() closed:ambiguous [function101]',
    ]);
  });

  test('A function calling itself', async () => {
    const loop = functionOf(
      'loop',
      [],
      [filterActive(call('shop::test::loop'))],
    );
    const flow = asFlow(
      await readWithFunctions(lambdaOf([call('shop::test::loop')]), [loop]),
    );
    expect(callsOf(flow)).toEqual([
      'loop() opened [filter101]',
      'loop() closed:recursion [function101] <call1',
    ]);
  });

  test(`A call deeper than ${CUBE_DEFINITION_FUNCTION_DEPTH} calls`, async () => {
    const chain = Array.from(
      { length: CUBE_DEFINITION_FUNCTION_DEPTH + 1 },
      (_, index) =>
        functionOf(
          `level${index}`,
          [],
          [
            filterActive(
              index === CUBE_DEFINITION_FUNCTION_DEPTH
                ? ORDERS
                : call(`shop::test::level${index + 1}`),
            ),
          ],
        ),
    );
    const flow = asFlow(
      await readWithFunctions(lambdaOf([call('shop::test::level0')]), chain),
    );
    expect(flow.functionCalls.filter((each) => each.opened)).toHaveLength(
      CUBE_DEFINITION_FUNCTION_DEPTH,
    );
    expect(flow.functionCalls.at(-1)?.closedReason).toBe(
      CubeDefinitionFunctionClosedReason.DEPTH,
    );
  });

  test('A value that reads a name the body binds', async () => {
    // byRegion(region) filters `o|$o.REGION == $region`, and the definition
    // passes its own `$o`
    const byRegion = functionOf(
      'byRegion',
      [['region', 'String']],
      [
        call('filter', ORDERS, {
          ...IS_ACTIVE,
          body: [
            call(
              'equal',
              {
                _type: 'property',
                property: 'REGION',
                parameters: [variable('o')],
              },
              variable('region'),
            ),
          ],
        }),
      ],
    );
    const flow = asFlow(
      await readWithFunctions(
        lambdaOf(
          [call('shop::test::byRegion', variable('o'))],
          [parameterOf('o', 'String')],
        ),
        [byRegion],
      ),
    );
    expect(callsOf(flow)).toEqual([
      'byRegion($o) closed:capture [function101]',
    ]);
  });

  test('A body that reads the relation it takes twice', async () => {
    const twice = functionOf(
      'twice',
      [['rows', 'Relation']],
      [call('concatenate', variable('rows'), variable('rows'))],
    );
    const flow = asFlow(
      await readWithFunctions(lambdaOf([call('shop::test::twice', ORDERS)]), [
        twice,
      ]),
    );
    expect(stepTypes(flow)).toEqual(['ingestDataset', 'unknown']);
    expect(callsOf(flow)).toEqual(['twice() closed:sharedInput [unknown101]']);
  });
});

describe('Reading the bodies of functions', () => {
  test('Puts the value of each let where the body reads it', async () => {
    const withLet = functionOf(
      'withLet',
      [],
      [
        call('letFunction', string('rows'), filterActive(ORDERS)),
        call('limit', variable('rows'), integer(10)),
      ],
    );
    const flow = asFlow(
      await readWithFunctions(lambdaOf([call('shop::test::withLet')]), [
        withLet,
      ]),
    );
    expect(callsOf(flow)).toEqual([
      'withLet() opened [ingestDataset101, filter101, limit101]',
    ]);
  });

  test("Wires the definition's parameters to the steps that read them inside a container", async () => {
    const lambda = lambdaOf(
      [call('shop::orders::ordersSince', variable('since'), string('EMEA'))],
      [parameterOf('since', 'StrictDate')],
    );
    const flow = asFlow(await readWithFunctions(lambda));
    expect(callsOf(flow)).toEqual([
      "ordersSince($since, 'EMEA') opened [ingestDataset101, expressionFilter101]",
    ]);
    expect(flow.parameters.map((each) => [each.name, each.stepIds])).toEqual([
      ['since', ['expressionFilter101']],
    ]);
  });

  test('Gives each call of one function its own container', async () => {
    const flow = asFlow(
      await readWithFunctions(
        lambdaOf([
          call(
            'concatenate',
            call('shop::orders::activeOrders'),
            call('shop::orders::activeOrders'),
          ),
        ]),
      ),
    );
    expect(callsOf(flow)).toEqual([
      'activeOrders() opened [ingestDataset101, filter101]',
      'activeOrders() opened [ingestDataset102, filter102]',
    ]);
  });
});

describe('Loading the functions a definition calls', () => {
  test('Asks for each name once, then for the names their bodies call', async () => {
    const asked: string[][] = [];
    const functions = await loadCubeDefinitionFunctions(
      ACCESS_POINTS.large_active_orders as PlainObject,
      loaderOver(ELEMENTS, asked),
    );
    expect(asked).toEqual([
      ['shop::orders::largeActiveOrders'],
      ['shop::orders::activeOrders'],
    ]);
    expect(functions.all.map((each) => each.path)).toEqual([
      'shop::orders::largeActiveOrders_Float_1__Relation_1_',
      'shop::orders::activeOrders__Relation_1_',
    ]);
  });

  test("Asks for no function of the engine's own, and for none in a lambda Cube can't read", async () => {
    const asked: string[][] = [];
    await loadCubeDefinitionFunctions(
      lambdaOf([
        call('meta::pure::functions::relation::limit', ORDERS, integer(1)),
      ]),
      loaderOver(ELEMENTS, asked),
    );
    await loadCubeDefinitionFunctions(
      { not: 'a lambda' },
      loaderOver(ELEMENTS, asked),
    );
    expect(asked).toEqual([]);
  });

  test('Keeps each function once, by its path', async () => {
    const functions = await loadCubeDefinitionFunctions(
      ACCESS_POINTS.active_orders_by_region as PlainObject,
      async () => [ACTIVE_ORDERS, ACTIVE_ORDERS],
    );
    expect(functions.named('shop::orders::activeOrders')).toHaveLength(1);
    expect(functions.named('shop::orders::other')).toEqual([]);
  });
});
