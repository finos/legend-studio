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
  type DataSpaceExecutionContext,
  DataSpaceQueryBuilderState,
  resolveExecutionContextMapping,
  resolveUsableDataSpaceClasses,
} from '@finos/legend-extension-dsl-data-space/graph';
import { type GraphManagerState, RuntimePointer } from '@finos/legend-graph';
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
 */
export class LegendAnalyticsCubeQueryBuilderState extends DataSpaceQueryBuilderState {
  constructor(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
    dataSpace: DataSpace,
    executionContext: DataSpaceExecutionContext,
  ) {
    super(
      applicationStore,
      graphManagerState,
      LegendAnalyticsCubeQueryBuilderWorkflow.INSTANCE,
      QueryBuilderActionConfig.INSTANCE,
      dataSpace,
      executionContext,
      false,
      undefined,
      // its data space is fixed: the setup panel doesn't offer another
      async () => Promise.resolve(),
      undefined,
      undefined,
      undefined,
      undefined,
      buildCubeQueryBuilderConfig(),
    );
    this.setRestrictToCurrentDataSpace(true);
  }

  override get isResultPanelHidden(): boolean {
    return true;
  }

  /**
   * After the execution context changes, as Legend Query does it on a data
   * space's full graph: its mapping and default runtime, and a class of the
   * mapping if the one picked isn't. A context whose mapping comes from a
   * data product is left as it is: Cube can't run it, and says so.
   */
  override async propagateExecutionContextChange(): Promise<void> {
    const mapping = resolveExecutionContextMapping(this.executionContext);
    if (!mapping) {
      return;
    }
    const classes = resolveUsableDataSpaceClasses(
      this.dataSpace,
      mapping,
      this.graphManagerState,
      this,
    );
    this.changeMapping(mapping);
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
