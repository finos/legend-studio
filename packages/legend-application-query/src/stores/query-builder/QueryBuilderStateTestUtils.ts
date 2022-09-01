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

import { TEST__getTestApplicationStore } from '@finos/legend-application';
import {
  type RawLambda,
  type RawMappingModelCoverageAnalysisResult,
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '@finos/legend-graph';
import type { Entity } from '@finos/legend-storage';
import { jest } from '@jest/globals';
import { flowResult } from 'mobx';
import { LegendQueryPluginManager } from '../../application/LegendQueryPluginManager.js';
import { QueryBuilder_GraphManagerPreset } from '../../graphManager/QueryBuilder_GraphManagerPreset.js';
import {
  BasicQueryBuilderState,
  type QueryBuilderState,
} from './QueryBuilderState.js';
import { TEST__getTestLegendQueryApplicationConfig } from '../QueryEditorStoreTestUtils.js';

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
  const pluginManager = LegendQueryPluginManager.create();
  pluginManager.usePresets([new QueryBuilder_GraphManagerPreset()]).install();
  const applicationStore = TEST__getTestApplicationStore(
    TEST__getTestLegendQueryApplicationConfig(),
    LegendQueryPluginManager.create(),
  );
  const graphManagerState = TEST__getTestGraphManagerState(pluginManager);
  await TEST__buildGraphWithEntities(graphManagerState, entities);
  const queryBuilderState = BasicQueryBuilderState.create(
    applicationStore,
    graphManagerState,
  );
  if (rawLambda) {
    queryBuilderState.buildStateFromRawLambda(rawLambda);
  }
  if (executionContext) {
    const graph = queryBuilderState.graphManagerState.graph;
    queryBuilderState.setupState._class = graph.getClass(
      executionContext._class,
    );
    queryBuilderState.setupState.mapping = graph.getMapping(
      executionContext.mapping,
    );
    if (executionContext.runtime) {
      queryBuilderState.setupState.runtimeValue = graph.getRuntime(
        executionContext.runtime,
      );
    }
  }
  if (rawMappingModelCoverageAnalysisResult) {
    jest
      .spyOn(
        queryBuilderState.graphManagerState.graphManager,
        'analyzeMappingModelCoverage',
      )
      .mockResolvedValue(
        queryBuilderState.graphManagerState.graphManager.buildMappingModelCoverageAnalysisResult(
          rawMappingModelCoverageAnalysisResult,
        ),
      );

    await flowResult(
      queryBuilderState.explorerState.analyzeMappingModelCoverage(),
    );
  }
  return queryBuilderState;
};
