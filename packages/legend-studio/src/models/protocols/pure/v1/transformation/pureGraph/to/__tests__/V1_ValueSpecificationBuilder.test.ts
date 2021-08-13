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

import { unitTest } from '@finos/legend-studio-shared';
import { flowResult } from 'mobx';
import { SilentLogger } from '../../../../../../../../utils/Logger';
import {
  CoreModel,
  PureModel,
  SystemModel,
} from '../../../../../../../metamodels/pure/graph/PureModel';
import type { Entity } from '../../../../../../../sdlc/models/entity/Entity';
import { V1_PureGraphManager } from '../../../../V1_PureGraphManager';
import { V1_unsupportedFunctionExpression } from './V1_ValueSpecificationBuilderTestData';

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
    V1_unsupportedFunctionExpression,
    {
      errorMessage: `Can't find expression builder for function 'getAll': no compatible function expression builder available from plugins`,
    },
  ],
];

describe(unitTest('Lambda processing roundtrip test'), () => {
  test.each(cases)('%s', async (testName, context, lambdaJson, result) => {
    const { entities } = context;
    const { errorMessage } = result;
    const graph = new PureModel(new CoreModel([]), new SystemModel([]), []);
    const logger = new SilentLogger();
    // setup
    const graphManager = new V1_PureGraphManager([], [], logger);
    await flowResult(
      graphManager.buildGraph(graph, entities, {
        TEMPORARY__keepSectionIndex: true,
      }),
    );
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
