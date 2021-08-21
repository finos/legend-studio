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
import {
  TEST__buildGraphBasic,
  TEST__getTestEditorStore,
  StudioPluginManager,
} from '@finos/legend-studio';
import { unitTest } from '@finos/legend-shared';
import { QueryBuilder_Preset } from '../../QueryBuilder_Preset';
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
} from './QueryBuilder_LambdaProcessingRoundtripTestData';
import {
  simpleDerivationProjection,
  groupByWithDerivationProjection,
  groupByWithDerivationAndAggregation,
} from './QueryBuilder_ProcessingRoundtrip_TestDerivation';

const pluginManager = StudioPluginManager.create();
pluginManager.usePresets([new QueryBuilder_Preset()]).install();

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
];

describe(unitTest('Lambda processing roundtrip test'), () => {
  test.each(cases)('%s', async (testName, context, lambdaJson) => {
    const { entities } = context;
    // setup
    const editorStore = TEST__getTestEditorStore(pluginManager);
    await TEST__buildGraphBasic(entities, editorStore, {
      TEMPORARY__keepSectionIndex: true,
    });
    // roundtrip check
    const lambda = editorStore.graphState.graphManager.buildValueSpecification(
      lambdaJson,
      editorStore.graphState.graph,
    );
    const _lambdaJson =
      editorStore.graphState.graphManager.serializeRawValueSpecification(
        editorStore.graphState.graphManager.buildRawValueSpecification(
          lambda,
          editorStore.graphState.graph,
        ),
      );
    expect(_lambdaJson).toEqual(lambdaJson);
  });
});
