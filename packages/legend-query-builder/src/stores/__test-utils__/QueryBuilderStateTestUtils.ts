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
  ApplicationStore,
  LegendApplicationConfig,
  type LegendApplicationPlugin,
  LegendApplicationPluginManager,
} from '@finos/legend-application';
import { TEST__getApplicationVersionData } from '@finos/legend-application/test';
import {
  type RawLambda,
  type RawMappingModelCoverageAnalysisResult,
  type GraphManagerPluginManager,
  type PureProtocolProcessorPlugin,
  type PureGraphManagerPlugin,
  type PureGraphPlugin,
} from '@finos/legend-graph';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '@finos/legend-graph/test';
import { createSpy } from '@finos/legend-shared/test';
import type { Entity } from '@finos/legend-storage';
import { flowResult } from 'mobx';
import { QueryBuilder_GraphManagerPreset } from '../../graph-manager/QueryBuilder_GraphManagerPreset.js';
import {
  INTERNAL__BasicQueryBuilderState,
  type QueryBuilderState,
} from '../QueryBuilderState.js';
import { QueryBuilderAdvancedWorkflowState } from '../query-workflow/QueryBuilderWorkFlowState.js';

export class TEST__LegendApplicationPluginManager
  extends LegendApplicationPluginManager<LegendApplicationPlugin>
  implements GraphManagerPluginManager
{
  private pureProtocolProcessorPlugins: PureProtocolProcessorPlugin[] = [];
  private pureGraphManagerPlugins: PureGraphManagerPlugin[] = [];
  private pureGraphPlugins: PureGraphPlugin[] = [];

  private constructor() {
    super();
  }

  static create(): TEST__LegendApplicationPluginManager {
    return new TEST__LegendApplicationPluginManager();
  }

  registerPureProtocolProcessorPlugin(
    plugin: PureProtocolProcessorPlugin,
  ): void {
    this.pureProtocolProcessorPlugins.push(plugin);
  }

  registerPureGraphManagerPlugin(plugin: PureGraphManagerPlugin): void {
    this.pureGraphManagerPlugins.push(plugin);
  }

  registerPureGraphPlugin(plugin: PureGraphPlugin): void {
    this.pureGraphPlugins.push(plugin);
  }

  getPureGraphManagerPlugins(): PureGraphManagerPlugin[] {
    return [...this.pureGraphManagerPlugins];
  }

  getPureProtocolProcessorPlugins(): PureProtocolProcessorPlugin[] {
    return [...this.pureProtocolProcessorPlugins];
  }

  getPureGraphPlugins(): PureGraphPlugin[] {
    return [...this.pureGraphPlugins];
  }
}

class TEST__LegendApplicationConfig extends LegendApplicationConfig {
  override getDefaultApplicationStorageKey(): string {
    return 'test';
  }
}

export const TEST__getGenericApplicationConfig = (
  extraConfigData = {},
): LegendApplicationConfig => {
  const config = new TEST__LegendApplicationConfig({
    configData: {
      env: 'TEST',
      appName: 'TEST',
      ...extraConfigData,
    },
    versionData: TEST__getApplicationVersionData(),
    baseAddress: '/',
  });
  return config;
};

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
  const applicationStore = new ApplicationStore(
    TEST__getGenericApplicationConfig(),
    pluginManager,
  );
  const graphManagerState = TEST__getTestGraphManagerState(pluginManager);
  await TEST__buildGraphWithEntities(graphManagerState, entities);
  const queryBuilderState = new INTERNAL__BasicQueryBuilderState(
    applicationStore,
    graphManagerState,
    QueryBuilderAdvancedWorkflowState.INSTANCE,
    undefined,
  );
  if (rawLambda) {
    queryBuilderState.initializeWithQuery(rawLambda);
  }
  if (executionContext) {
    const graph = queryBuilderState.graphManagerState.graph;
    queryBuilderState.class = graph.getClass(executionContext._class);
    queryBuilderState.executionContextState.mapping = graph.getMapping(
      executionContext.mapping,
    );
    if (executionContext.runtime) {
      queryBuilderState.executionContextState.runtimeValue = graph.getRuntime(
        executionContext.runtime,
      );
    }
  }

  if (rawMappingModelCoverageAnalysisResult && executionContext) {
    const graph = queryBuilderState.graphManagerState.graph;
    createSpy(
      queryBuilderState.graphManagerState.graphManager,
      'analyzeMappingModelCoverage',
    ).mockResolvedValue(
      queryBuilderState.graphManagerState.graphManager.buildMappingModelCoverageAnalysisResult(
        rawMappingModelCoverageAnalysisResult,
        graph.getMapping(executionContext.mapping),
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
