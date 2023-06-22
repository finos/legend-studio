/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import { test, describe, expect } from '@jest/globals';
import type { Entity } from '@finos/legend-storage';
import { LogService, ActionState } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import {
  CoreModel,
  PureModel,
  SystemModel,
} from '../../../../../../../../graph/PureModel.js';
import { TEST__GraphManagerPluginManager } from '../../../../../../../__test-utils__/GraphManagerTestUtils.js';
import { buildPureGraphManager } from '../../../../../PureGraphManagerBuilder.js';
import {
  V1_TEST_DATA__unsupportedFunctionExpression,
  V1_TEST_DATA__valueSpecificationWithLatestDate,
} from './V1_TEST_DATA__ValueSpecificationBuilder.js';
import {
  Numeric,
  Decimal,
  Binary,
  VarBinary,
  Char,
  VarChar,
} from '../../../../../../../../STO_Relational_Exports.js';
import { V1_parseDataType } from '../V1_ExecutionPlanBuilder.js';

type RoundtripTestCase = [
  string,
  {
    entities: Entity[];
  },
  { parameters?: object; body?: object },
  {
    errorMessage?: string;
  },
];

const cases: RoundtripTestCase[] = [
  [
    'Unsupported function expression',
    { entities: [] },
    V1_TEST_DATA__unsupportedFunctionExpression,
    {
      errorMessage: `Can't find expression builder for function 'getAll': no compatible function expression builder available from plugins`,
    },
  ],
  [
    'ValueSpecification with LatestDate',
    { entities: [] },
    V1_TEST_DATA__valueSpecificationWithLatestDate,
    {},
  ],
];

describe(unitTest('Lambda processing roundtrip test'), () => {
  test.each(cases)(
    '%s',
    async (
      testName: RoundtripTestCase[0],
      context: RoundtripTestCase[1],
      lambdaJson: RoundtripTestCase[2],
      result: RoundtripTestCase[3],
    ) => {
      const { entities } = context;
      const { errorMessage } = result;
      const graph = new PureModel(new CoreModel([]), new SystemModel([]), []);
      // setup
      const graphManager = buildPureGraphManager(
        new TEST__GraphManagerPluginManager(),
        new LogService(),
      );
      await graphManager.buildGraph(graph, entities, ActionState.create());
      const fn = (): void => {
        graphManager.buildValueSpecification(lambdaJson, graph);
      };
      if (errorMessage) {
        expect(fn).toThrow(errorMessage);
      } else {
        fn();
      }
    },
  );
});

test(unitTest('Parse data type from string'), () => {
  expect(V1_parseDataType('NUMERIC(52,8)') === new Numeric(52, 8));
  expect(V1_parseDataType('DECIMAL(49,1)') === new Decimal(49, 1));
  expect(V1_parseDataType('BINARY(0)') === new Binary(0));
  expect(V1_parseDataType('VARBINARY(0)') === new VarBinary(0));
  expect(V1_parseDataType('CHAR(0)') === new Char(0));
  expect(V1_parseDataType('VARCHAR(0)') === new VarChar(0));
});
