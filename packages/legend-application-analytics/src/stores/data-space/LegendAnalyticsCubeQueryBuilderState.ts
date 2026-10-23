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

import type { GenericLegendApplicationStore } from '@finos/legend-application';
import {
  type DataSpace,
  type DataSpaceAnalysisResult,
  type DataSpaceExecutionContext,
  DataSpaceQueryBuilderState,
  resolveExecutionContextMapping,
  resolveUsableDataSpaceClasses,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  type GraphManagerState,
  type PureModel,
  RuntimePointer,
} from '@finos/legend-graph';
import {
  type FetchStructureLayoutConfig,
  QueryBuilderActionConfig,
  QueryBuilderConfig,
  type QueryBuilderState,
  QueryBuilderWorkflowState,
} from '@finos/legend-query-builder';

/**
 * The query builder as a Legend Cube data space source's editor shows it
 * (PLAN §11.25): its data space, entity, explorer, columns and filter. What
 * else a query does, the cube's own steps do after the source, so the
 * header's menus, a column's aggregate, the query options, the fetch
 * structure's modes and the status bar are hidden.
 */
export class LegendAnalyticsCubeQueryBuilderWorkflow extends QueryBuilderWorkflowState {
  static readonly INSTANCE = new LegendAnalyticsCubeQueryBuilderWorkflow();

  override get showStatusBar(): boolean {
    return false;
  }

  override getFetchStructureLayoutConfig(
    state: QueryBuilderState,
  ): FetchStructureLayoutConfig {
    return {
      label: state.fetchStructureState.implementation.fetchLabel,
      showInFetchPanel: false,
    };
  }

  override get showHeaderMenus(): boolean {
    return false;
  }

  override get showProjectionAggregation(): boolean {
    return false;
  }

  override get showQueryOptions(): boolean {
    return false;
  }
}

/** The query builder's options: no assistant chat, which could write anything */
const buildCubeQueryBuilderConfig = (): QueryBuilderConfig => {
  const config = new QueryBuilderConfig();
  config.TEMPORARY__disableQueryBuilderAgentChat = true;
  return config;
};

/**
 * A data space's query builder for a Legend Cube data space source (PLAN
 * §11.25): on one data space, which its setup panel doesn't change, and
 * with no results panel: the cube runs the source with the steps after it.
 * Its graph is the light graph of the data space's analytics, for one
 * mapping, whose classes the analysis says.
 */
export class LegendAnalyticsCubeQueryBuilderState extends DataSpaceQueryBuilderState {
  /** Builds into a new graph the light graph of another execution context */
  private readonly buildContextGraph: (
    graph: PureModel,
    executionContext: string,
  ) => Promise<void>;
  /** The mapping whose classes the graph holds */
  private graphMapping: string | undefined;

  constructor(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
    dataSpace: DataSpace,
    executionContext: DataSpaceExecutionContext,
    dataSpaceAnalysisResult: DataSpaceAnalysisResult,
    buildContextGraph: (
      graph: PureModel,
      executionContext: string,
    ) => Promise<void>,
  ) {
    super(
      applicationStore,
      graphManagerState,
      LegendAnalyticsCubeQueryBuilderWorkflow.INSTANCE,
      QueryBuilderActionConfig.INSTANCE,
      dataSpace,
      executionContext,
      true,
      undefined,
      // its data space is fixed: the setup panel doesn't offer another
      async () => Promise.resolve(),
      dataSpaceAnalysisResult,
      undefined,
      undefined,
      undefined,
      buildCubeQueryBuilderConfig(),
    );
    this.buildContextGraph = buildContextGraph;
    this.graphMapping = resolveExecutionContextMapping(executionContext)?.path;
    this.setRestrictToCurrentDataSpace(true);
  }

  override get isResultPanelHidden(): boolean {
    return true;
  }

  /**
   * After the execution context changes, as Legend Query does it on a light
   * graph: a context of another mapping gets that mapping's light graph,
   * which starts the query again on one of its classes, while a context of
   * the same mapping keeps the query; then the context's mapping and default
   * runtime, the explorer's mapped properties, and a class of the mapping if
   * the one picked isn't. A context whose mapping comes from a data product
   * is left as it is: Cube can't run it, and says so.
   */
  override async propagateExecutionContextChange(): Promise<void> {
    const mapping = resolveExecutionContextMapping(this.executionContext);
    if (!mapping) {
      return;
    }
    const sameMapping =
      mapping.path === this.executionContextState.mapping?.path;
    if (mapping.path !== this.graphMapping) {
      const graph = this.graphManagerState.createNewGraph();
      await this.buildContextGraph(graph, this.executionContext.name);
      this.graphManagerState.graph = graph;
      this.graphMapping = mapping.path;
    }
    const coverage =
      this.dataSpaceAnalysisResult?.mappingToMappingCoverageResult?.get(
        mapping.path,
      );
    if (coverage) {
      this.explorerState.mappingModelCoverageAnalysisResult = coverage;
    }
    const classes = resolveUsableDataSpaceClasses(
      this.dataSpace,
      mapping,
      this.graphManagerState,
      this,
    );
    this.changeMapping(mapping, { keepQueryContent: sameMapping });
    const { defaultRuntime } = this.executionContext;
    if (defaultRuntime) {
      this.changeRuntime(new RuntimePointer(defaultRuntime));
    }
    if (!this.sourceClass || !classes.includes(this.sourceClass)) {
      const [first] = classes;
      if (first) {
        this.changeSourceElement(first);
      }
    }
    this.explorerState.refreshTreeData();
  }
}
