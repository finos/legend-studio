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
  ColumnComparisonFilter,
  CompositeFilter,
  CompositeFilterOperator,
  FilterOperator,
  type IR,
  JoinType,
  NotFilter,
  printIR,
  QueryEmitter,
} from '@finos/legend-cube';
import { parseLosslessJSON, stringifyLosslessJSON } from '@finos/legend-shared';
import { CUBE_ENGINE_TEST__grammarToJson_lambda } from '../../../../../__test-utils__/CubeEngineTestSupport.js';
import {
  fullJoinQuery,
  NORTHWIND_RUNTIME,
  sliceQuery,
} from '../../../../../__test-utils__/CubeNorthwindTestQueries.js';
import { V1_serializeCubeLambda } from '../V1_CubeLambdaSerializer.js';

// The serializer's JSON equals the engine's own parse of the same lambda as
// Pure text (the core's debug printer), source information aside (PLAN
// §11.2 A.11). None of these lambdas has a negative number or a quoted dotted
// table, which Pure text can't carry as the JSON does

const withoutSourceInformation = (json: unknown): unknown =>
  parseLosslessJSON(
    stringifyLosslessJSON(json, (key: string, value: unknown) =>
      key === 'sourceInformation' ? undefined : value,
    ),
  );

const expectAsParsed = async (ir: IR): Promise<void> => {
  expect(withoutSourceInformation(V1_serializeCubeLambda(ir))).toEqual(
    await CUBE_ENGINE_TEST__grammarToJson_lambda(printIR(ir)),
  );
};

const NEGATIONS = new CompositeFilter(CompositeFilterOperator.OR, [
  new NotFilter(
    new ColumnComparisonFilter('SHIP_REGION', FilterOperator.EQUAL, {
      kind: 'string',
      value: 'BC',
    }),
  ),
  new ColumnComparisonFilter('EMPLOYEE_ID', FilterOperator.NOT_IN, [
    { kind: 'integer', value: '32767' },
  ]),
  new ColumnComparisonFilter('FREIGHT', FilterOperator.GREATER_THAN, {
    kind: 'float',
    value: '50.5',
  }),
  new ColumnComparisonFilter('SHIP_NAME', FilterOperator.STARTS_WITH, {
    kind: 'string',
    value: "it's",
  }),
]);

describe('Cube lambda serializer, against the engine parser', () => {
  test('Writes the slice execution lambda as the engine parses it', async () => {
    await expectAsParsed(
      new QueryEmitter(sliceQuery()).emitExecutionLambda({
        rowLimit: 1000,
        runtime: NORTHWIND_RUNTIME,
      }),
    );
  });

  test.each([JoinType.LEFT_OUTER, JoinType.RIGHT_OUTER])(
    'Writes a %s join as the engine parses it',
    async (joinType) => {
      await expectAsParsed(
        new QueryEmitter(sliceQuery(undefined, joinType)).emitTypingLambda(
          'filter101',
        ),
      );
    },
  );

  test('Writes a FULL join, with toOne, the merge and its cast, as the engine parses it', async () => {
    await expectAsParsed(
      new QueryEmitter(fullJoinQuery()).emitTypingLambda('join101'),
    );
  });

  test('Writes negations, with their isEmpty guards, as the engine parses them', async () => {
    await expectAsParsed(
      new QueryEmitter(sliceQuery(NEGATIONS)).emitTypingLambda('filter101'),
    );
  });
});
