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

import {
  TEST__getGenericApplicationConfig,
  TEST__getTestApplicationStore,
  TEST__LegendApplicationPluginManager,
} from '@finos/legend-application';
import {
  type RawLambda,
  type RawMappingModelCoverageAnalysisResult,
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '@finos/legend-graph';
import { createSpy } from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import { flowResult } from 'mobx';
import { QueryBuilder_GraphManagerPreset } from '../graphManager/QueryBuilder_GraphManagerPreset.js';
import {
  INTERNAL__BasicQueryBuilderState,
  type QueryBuilderState,
} from './QueryBuilderState.js';

export const TEST__setUpQueryBuilderState = async (
  entities: Entity[],
  rawLambda?: RawLambda | undefined,
  executionContext?:
    | {
        _class: string;
        mapping: string;
        runtime?: string | undefined;
      }
    | undefined,
  rawMappingModelCoverageAnalysisResult?:
    | RawMappingModelCoverageAnalysisResult
    | undefined,
): Promise<QueryBuilderState> => {
  const pluginManager = TEST__LegendApplicationPluginManager.create();
  pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();
  const applicationStore = TEST__getTestApplicationStore(
    TEST__getGenericApplicationConfig(),
    pluginManager,
  );
  const graphManagerState = TEST__getTestGraphManagerState(pluginManager);
  await TEST__buildGraphWithEntities(graphManagerState, entities);
  const queryBuilderState = new INTERNAL__BasicQueryBuilderState(
    applicationStore,
    graphManagerState,
  );
  if (rawLambda) {
    queryBuilderState.initializeWithQuery(rawLambda);
  }
  if (executionContext) {
    const graph = queryBuilderState.graphManagerState.graph;
    queryBuilderState.class = graph.getClass(executionContext._class);
    queryBuilderState.mapping = graph.getMapping(executionContext.mapping);
    if (executionContext.runtime) {
      queryBuilderState.runtimeValue = graph.getRuntime(
        executionContext.runtime,
      );
    }
  }

  if (rawMappingModelCoverageAnalysisResult) {
    createSpy(
      queryBuilderState.graphManagerState.graphManager,
      'analyzeMappingModelCoverage',
    ).mockResolvedValue(
      queryBuilderState.graphManagerState.graphManager.buildMappingModelCoverageAnalysisResult(
        rawMappingModelCoverageAnalysisResult,
      ),
    );
  }

  if (rawMappingModelCoverageAnalysisResult) {
    await flowResult(
      queryBuilderState.explorerState.analyzeMappingModelCoverage(),
    );
  }

  return queryBuilderState;
};
