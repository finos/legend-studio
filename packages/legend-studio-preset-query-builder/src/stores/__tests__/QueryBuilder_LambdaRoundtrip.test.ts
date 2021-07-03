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

import type { Entity } from '@finos/legend-studio';
import {
  getTestApplicationConfig,
  PluginManager,
  getTestEditorStore,
} from '@finos/legend-studio';
import { unitTest } from '@finos/legend-studio-shared';
import { QueryBuilder_Preset } from '../../QueryBuilder_Preset';
import {
  M2MModel,
  ComplexRelationalModel,
  projectWithCols,
  simpleAllFunc,
  simpleFilterFunc,
  simpleProjection,
  simpleProjectionWithFilter,
  simpleGraphFetch,
  firmPersonGraphFetch,
} from './QueryBuilder_LambdaRoundtripTestData';

const pluginManager = PluginManager.create();
pluginManager.usePresets([new QueryBuilder_Preset()]).install();

type RoundtripTestCase = [
  string,
  {
    entities: Entity[];
  },
  { parameters?: object; body?: object },
];

const relationalCtx = {
  entities: ComplexRelationalModel,
};

const m2mCtx = {
  entities: M2MModel,
};

const cases: RoundtripTestCase[] = [
  ['Simple all() function', relationalCtx, simpleAllFunc],
  ['Simple filter() function', relationalCtx, simpleFilterFunc],
  ['Simple project() function', relationalCtx, simpleProjection],
  ['Simple project() function with columns', relationalCtx, projectWithCols],
  ['Simple project() and filter()', relationalCtx, simpleProjectionWithFilter],
  ['Simple graph fetch', m2mCtx, simpleGraphFetch],
  ['Complex graph fetch', m2mCtx, firmPersonGraphFetch],
];

describe(unitTest('Lambda processing roundtrip test'), () => {
  test.each(cases)('%s', async (testName, context, lambdaJson) => {
    const { entities } = context;
    // setup
    const editorStore = getTestEditorStore(
      getTestApplicationConfig(),
      pluginManager,
    );
    await editorStore.graphState.initializeSystem();
    await editorStore.graphState.graphManager.buildGraph(
      editorStore.graphState.graph,
      entities,
      { TEMPORARY__keepSectionIndex: true },
    );
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
