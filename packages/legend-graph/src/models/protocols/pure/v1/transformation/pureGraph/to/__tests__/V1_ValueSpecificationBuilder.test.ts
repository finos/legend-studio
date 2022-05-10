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

import type { Entity } from '@finos/legend-model-storage';
import { unitTest, Log, ActionState } from '@finos/legend-shared';
import {
  CoreModel,
  PureModel,
  SystemModel,
} from '../../../../../../../../graph/PureModel';
import { TEST__GraphPluginManager } from '../../../../../../../../GraphManagerTestUtils';
import { getGraphManager } from '../../../../../Pure';
import {
  V1_TEST_DATA__unsupportedFunctionExpression,
  V1_TEST_DATA__valueSpecificationWithLatestDate,
} from './V1_TEST_DATA__ValueSpecificationBuilder';

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
  test.each(cases)('%s', async (testName, context, lambdaJson, result) => {
    const { entities } = context;
    const { errorMessage } = result;
    const graph = new PureModel(new CoreModel([]), new SystemModel([]), []);
    // setup
    const graphManager = getGraphManager(
      new TEST__GraphPluginManager(),
      new Log(),
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
  });
});
