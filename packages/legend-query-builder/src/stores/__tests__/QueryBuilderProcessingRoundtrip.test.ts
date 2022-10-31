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

import { test, expect, describe } from '@jest/globals';
import type { Entity } from '@finos/legend-storage';
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
  TEST_DATA__allFuncOnBusinessTemporalMilestonedClass,
  TEST_DATA__allFuncOnProcessingTemporalMilestonedClass,
  TEST_DATA__allFuncOnBiTemporalMilestonedClass,
  TEST_DATA__graphFetchWithDerivedProperty,
  TEST_DATA__graphFetchWithDerivedPropertyWithParameter,
  TEST_DATA__temporalModel,
  TEST_DATA__personWithSubType,
  TEST_DATA_dateCompabilityForFilterAndPostFilter,
} from './TEST_DATA__QueryBuilder_LambdaProcessingRoundtrip.js';
import TEST_DATA__PostFilterModel from './TEST_DATA__QueryBuilder_Model_PostFilter.json';
import {
  simpleDerivationProjection,
  groupByWithDerivationProjection,
  groupByWithDerivationAndAggregation,
} from './TEST_DATA__QueryBuilder_ProcessingRoundtrip_TestDerivation.js';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '@finos/legend-graph';
import { QueryBuilder_GraphManagerPreset } from '../../graphManager/QueryBuilder_GraphManagerPreset.js';
import { TEST__LegendApplicationPluginManager } from '@finos/legend-application';
import {
  TEST_DATA__lambda_olapGroupBy_MultiStackedGroupBy,
  TEST_DATA__lambda_olapGroupBy_StackedGroupBy,
  TEST_DATA__lambda_olapGroupBy_SimpleStringRankWithPostFilter,
  TEST_DATA__OlapGroupBy_entities,
  TEST_DATA_lambda_olapGroupBy_SimpleStringRankFunc,
} from './TEST_DATA__QueryBuilder_OlapGroupBy.js';

const pluginManager = TEST__LegendApplicationPluginManager.create();
pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();

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

const temporalCtx = {
  entities: TEST_DATA__temporalModel,
};

const m2mCtx = {
  entities: TEST_DATA__M2MModel,
};

const postFilterCtx = {
  entities: TEST_DATA__PostFilterModel,
};

const olapGroupbyCtx = {
  entities: TEST_DATA__OlapGroupBy_entities,
};

const cases: RoundtripTestCase[] = [
  ['Simple all() function', relationalCtx, TEST_DATA__simpleAllFunc],
  [
    'Simple all() function with businesstemporal milestoned class',
    temporalCtx,
    TEST_DATA__allFuncOnBusinessTemporalMilestonedClass,
  ],
  [
    'Simple all() function with processisngtemporal milestoned class',
    temporalCtx,
    TEST_DATA__allFuncOnProcessingTemporalMilestonedClass,
  ],
  [
    'Simple all() function with bitemporal milestoned class',
    temporalCtx,
    TEST_DATA__allFuncOnBiTemporalMilestonedClass,
  ],
  ['Simple filter() function', relationalCtx, TEST_DATA__simpleFilterFunc],
  ['Simple project() function', relationalCtx, TEST_DATA__simpleProjection],
  [
    'Simple project() function with columns',
    relationalCtx,
    TEST_DATA__projectWithCols,
  ],
  [
    'Simple project() with subType()',
    relationalCtx,
    TEST_DATA__personWithSubType,
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
    'Graph fetch with derived property',
    m2mCtx,
    TEST_DATA__graphFetchWithDerivedProperty,
  ],
  [
    'Graph fetch with derived property with parameter',
    m2mCtx,
    TEST_DATA__graphFetchWithDerivedPropertyWithParameter,
  ],
  [
    'Simple project() and filter() with parameter',
    relationalCtx,
    TEST_DATA__personWithParameter,
  ],
  [
    'Date compability for Filter and Post-filter',
    postFilterCtx,
    TEST_DATA_dateCompabilityForFilterAndPostFilter,
  ],
  [
    'OlapGroupBy with simple string with rank operation',
    olapGroupbyCtx,
    TEST_DATA_lambda_olapGroupBy_SimpleStringRankFunc('rank'),
  ],
  [
    'OlapGroupBy with stacked olapGroupBy function',
    olapGroupbyCtx,
    TEST_DATA__lambda_olapGroupBy_StackedGroupBy,
  ],
  [
    'OlapGroupBy with multi stacked olapGroupBy function',
    olapGroupbyCtx,
    TEST_DATA__lambda_olapGroupBy_MultiStackedGroupBy,
  ],
  [
    'OlapGroupBy with simple string with rank operation and post filter()',
    olapGroupbyCtx,
    TEST_DATA__lambda_olapGroupBy_SimpleStringRankWithPostFilter,
  ],
];

describe(unitTest('Lambda processing roundtrip'), () => {
  test.each(cases)(
    '%s',
    async (
      testName: RoundtripTestCase[0],
      context: RoundtripTestCase[1],
      lambdaJson: RoundtripTestCase[2],
    ) => {
      const { entities } = context;
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
    },
  );
});
