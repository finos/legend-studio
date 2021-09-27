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
import { unitTest } from '@finos/legend-shared';
import {
  TEST_DATA__M2MModel,
  TEST_DATA__complexRelationalModel,
  TEST_DATA__projectWithCols,
  TEST_DATA__simpleAllFunc,
  TEST_DATA__simpleFilterFunc,
  TEST_DATA__simpleProjection,
  TEST_DATA__simpleProjectionWithFilter,
  TEST_DATA__simpleGroupBy,
  TEST_DATA__simpleGraphFetch,
  TEST_DATA__firmPersonGraphFetch,
  TEST_DATA__personWithParameter,
} from './TEST_DATA__QueryBuilder_LambdaProcessingRoundtrip';
import {
  simpleDerivationProjection,
  groupByWithDerivationProjection,
  groupByWithDerivationAndAggregation,
} from './TEST_DATA__QueryBuilder_ProcessingRoundtrip_TestDerivation';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '@finos/legend-graph';
import { Query_GraphPreset } from '../../models/Query_GraphPreset';
import { QueryPluginManager } from '../../application/QueryPluginManager';

const pluginManager = QueryPluginManager.create();
pluginManager.usePresets([new Query_GraphPreset()]).install();

type RoundtripTestCase = [
  string,
  {
    entities: Entity[];
  },
  { parameters?: object; body?: object },
];

const relationalCtx = {
  entities: TEST_DATA__complexRelationalModel,
};

const m2mCtx = {
  entities: TEST_DATA__M2MModel,
};

const cases: RoundtripTestCase[] = [
  ['Simple all() function', relationalCtx, TEST_DATA__simpleAllFunc],
  ['Simple filter() function', relationalCtx, TEST_DATA__simpleFilterFunc],
  ['Simple project() function', relationalCtx, TEST_DATA__simpleProjection],
  [
    'Simple project() function with columns',
    relationalCtx,
    TEST_DATA__projectWithCols,
  ],
  [
    'Simple project() and filter()',
    relationalCtx,
    TEST_DATA__simpleProjectionWithFilter,
  ],
  [
    'Simple project() with derivation',
    relationalCtx,
    simpleDerivationProjection,
  ],
  ['Simple groupBy()', relationalCtx, TEST_DATA__simpleGroupBy],
  [
    'groupBy() with derivation projection',
    relationalCtx,
    groupByWithDerivationProjection,
  ],
  [
    'groupBy() with derivation projection and aggregation',
    relationalCtx,
    groupByWithDerivationAndAggregation,
  ],
  ['Simple graph fetch', m2mCtx, TEST_DATA__simpleGraphFetch],
  ['Complex graph fetch', m2mCtx, TEST_DATA__firmPersonGraphFetch],
  [
    'Simple project() and filter() with parameter',
    relationalCtx,
    TEST_DATA__personWithParameter,
  ],
];

describe(unitTest('Lambda processing roundtrip test'), () => {
  test.each(cases)('%s', async (testName, context, lambdaJson) => {
    const { entities } = context;
    const pluginManager = QueryPluginManager.create();
    pluginManager.usePresets([new Query_GraphPreset()]).install();
    const graphManagerState = TEST__getTestGraphManagerState(pluginManager);
    await TEST__buildGraphWithEntities(graphManagerState, entities);
    // roundtrip check
    const lambda = graphManagerState.graphManager.buildValueSpecification(
      lambdaJson,
      graphManagerState.graph,
    );
    const _lambdaJson =
      graphManagerState.graphManager.serializeRawValueSpecification(
        graphManagerState.graphManager.buildRawValueSpecification(
          lambda,
          graphManagerState.graph,
        ),
      );
    expect(_lambdaJson).toEqual(lambdaJson);
  });
});
