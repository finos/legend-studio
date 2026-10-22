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

import { ApplicationStore } from '@finos/legend-application';
import type { JsonObject } from '@finos/legend-cube';
import {
  DSL_DataSpace_GraphManagerPreset,
  getDataSpace,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  Core_GraphManagerPreset,
  GraphManagerState,
} from '@finos/legend-graph';
import { QueryBuilder_GraphManagerPreset } from '@finos/legend-query-builder';
import { guaranteeNonNullable, LogService } from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import { LegendAnalyticsPluginManager } from '../../../application/LegendAnalyticsPluginManager.js';
import { TEST__getTestLegendAnalyticsApplicationConfig } from '../../../application/__test-utils__/LegendAnalyticsApplicationTestUtils.js';
import type { LegendAnalyticsApplicationStore } from '../../LegendAnalyticsBaseStore.js';
import { LegendAnalyticsCubeQueryBuilderState } from '../LegendAnalyticsCubeQueryBuilderState.js';
import TEST_DATA__CubeDataSpace_Entities from './TEST_DATA__CubeDataSpace_Entities.json' with { type: 'json' };

// A data space of COVID data (from Legend Query's tests): two classes on an
// H2 database whose connection loads its rows, in two execution contexts

export const TEST__COVID_DATA_SPACE = 'domain::COVIDDatapace';

/** Legend Analytics' application store, its graph's plugins installed */
export const TEST__createAnalyticsApplicationStore =
  (): LegendAnalyticsApplicationStore => {
    const pluginManager = LegendAnalyticsPluginManager.create();
    pluginManager
      .usePresets([
        new Core_GraphManagerPreset(),
        new QueryBuilder_GraphManagerPreset(),
        new DSL_DataSpace_GraphManagerPreset(),
      ])
      .install();
    return new ApplicationStore(
      TEST__getTestLegendAnalyticsApplicationConfig(),
      pluginManager,
    );
  };

/** The COVID data space's graph, built in the browser as the editor builds it, with no engine */
export const TEST__buildCovidGraph = async (
  applicationStore: LegendAnalyticsApplicationStore,
): Promise<GraphManagerState> => {
  const graphManagerState = new GraphManagerState(
    applicationStore.pluginManager,
    new LogService(),
  );
  await graphManagerState.graphManager.initialize(
    {
      env: 'test',
      tabSize: 2,
      clientConfig: {},
    },
    { tracerService: applicationStore.tracerService },
  );
  await graphManagerState.initializeSystem();
  await graphManagerState.graphManager.buildGraph(
    graphManagerState.graph,
    TEST_DATA__CubeDataSpace_Entities as unknown as Entity[],
    graphManagerState.graphBuildState,
  );
  return graphManagerState;
};

/** The query builder of a Cube data space source on the COVID data space, its first context's class picked */
export const TEST__setUpCubeQueryBuilder =
  async (): Promise<LegendAnalyticsCubeQueryBuilderState> => {
    const applicationStore = TEST__createAnalyticsApplicationStore();
    const graphManagerState = await TEST__buildCovidGraph(applicationStore);
    const dataSpace = getDataSpace(
      TEST__COVID_DATA_SPACE,
      graphManagerState.graph,
    );
    const state = new LegendAnalyticsCubeQueryBuilderState(
      applicationStore,
      graphManagerState,
      dataSpace,
      guaranteeNonNullable(dataSpace.defaultExecutionContext),
    );
    await state.propagateExecutionContextChange();
    return state;
  };

export const TEST__func = (
  name: string,
  parameters: readonly unknown[],
): JsonObject => ({
  _type: 'func',
  function: name,
  parameters: parameters as JsonObject[],
});

const x: JsonObject = { _type: 'var', name: 'x' };

const property = (name: string): JsonObject => ({
  _type: 'property',
  property: name,
  parameters: [x],
});

/** `domain::COVIDData.all()` */
export const TEST__COVID_DATA: JsonObject = TEST__func('getAll', [
  { _type: 'packageableElementPtr', fullPath: 'domain::COVIDData' },
]);

/** `<rows>->filter(x|$x.<property> == '<value>')` */
export const TEST__filter = (
  rows: JsonObject,
  name: string,
  value: string,
): JsonObject =>
  TEST__func('filter', [
    rows,
    {
      _type: 'lambda',
      parameters: [x],
      body: [TEST__func('equal', [property(name), { _type: 'string', value }])],
    },
  ]);

/** `<rows>->project([x|$x.<property>, …], ['<alias>', …])`, as the query builder writes a TDS */
export const TEST__project = (
  rows: JsonObject,
  columns: readonly [string, string][],
): JsonObject =>
  TEST__func('project', [
    rows,
    {
      _type: 'collection',
      multiplicity: { lowerBound: columns.length, upperBound: columns.length },
      values: columns.map(([name]) => ({
        _type: 'lambda',
        parameters: [x],
        body: [property(name)],
      })),
    },
    {
      _type: 'collection',
      multiplicity: { lowerBound: columns.length, upperBound: columns.length },
      values: columns.map(([, alias]) => ({ _type: 'string', value: alias })),
    },
  ]);

/** A lambda of the expression, with no parameters */
export const TEST__covidQuery = (
  body: JsonObject,
): { parameters: JsonObject[]; body: JsonObject[] } => ({
  parameters: [],
  body: [body],
});
