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
  type Accessor,
  type AccessorOwner,
  type GraphManagerState,
  type IngestDefinition,
  type PackageableElement,
  type PackageableRuntime,
  type QueryExecutionContext,
  LakehouseRuntime,
  QueryIngestExecutionContext,
} from '@finos/legend-graph';
import {
  AccessorQueryBuilderState,
  type QueryBuilderActionConfig,
  type QueryBuilderConfig,
  type QueryBuilderWorkflowState,
} from '@finos/legend-query-builder';
import type { GenericLegendApplicationStore } from '@finos/legend-application';
import type {
  ProjectGAVCoordinates,
  QueryableSourceInfo,
} from '@finos/legend-storage';
import { action, makeObservable, observable, runInAction } from 'mobx';
import { assertErrorThrown } from '@finos/legend-shared';
import { renderIngestQueryBuilderSetupPanelContent } from '../../components/ingest/IngestQueryBuilderSetupPanel.js';
import { generateIngestQueryCreatorRoute } from '../../__lib__/LegendQueryNavigation.js';

/**
 * Query builder state for an ingest-backed query.
 *
 * Extends {@link AccessorQueryBuilderState} because an ingest definition is
 * already an `AccessorOwner` (see `AccessorQueryBuilderState.accessorOwners`)
 * and ingest queries don't require a mapping (`requiresMappingForExecution`
 * is already `false` in the base class).
 *
 * The execution context produced here is a {@link QueryIngestExecutionContext}
 * carrying `ingestDefinitionPath` and `dataSet` — the same two values the
 * route handler resolved from the URL.
 */
export class IngestLegendQueryBuilderState extends AccessorQueryBuilderState {
  /**
   * Currently selected & graph-resolved ingest definition. Observable so the
   * setup panel re-renders when the user picks a different ingest from the
   * source dropdown.
   */
  ingestDefinition: IngestDefinition;
  /**
   * All ingest definition paths discovered in the project (fetched up front
   * via depot's classifier-scoped entities endpoint). Only `ingestDefinition`
   * is actually built into the graph — the others are surfaced as paths so
   * the user can switch without paying the cost of building them all.
   */
  readonly allIngestPaths: string[];
  /**
   * Swap callback wired by {@link IngestQueryCreatorStore}. Deletes the
   * currently built ingest from the graph, builds the target one from its
   * cached entity, and returns the new metamodel instance.
   */
  readonly swapIngest: (path: string) => Promise<IngestDefinition>;
  readonly project: ProjectGAVCoordinates;
  /**
   * Adhoc lakehouse runtime built from the user's lakehouse environment +
   * consumer warehouse, mirroring how `LegendQueryDataProductQueryBuilderState`
   * builds its runtime for model-access / lakehouse access points. Created by
   * the creator store (where the depot/lakehouse clients live) and injected
   * here so the editor can execute against it without a packaged runtime.
   */
  readonly adhocRuntime: PackageableRuntime;
  /**
   * Loading flag flipped while {@link changeIngestDefinition} is fetching /
   * rebuilding the newly selected ingest. Lets the setup panel disable the
   * source dropdown during the swap so we don't get overlapping changes.
   */
  isSwappingIngest = false;

  constructor(
    applicationStore: GenericLegendApplicationStore,
    accessor: Accessor | undefined,
    graphManagerState: GraphManagerState,
    workflow: QueryBuilderWorkflowState,
    actionConfig: QueryBuilderActionConfig,
    ingestDefinition: IngestDefinition,
    allIngestPaths: string[],
    swapIngest: (path: string) => Promise<IngestDefinition>,
    adhocRuntime: PackageableRuntime,
    project: ProjectGAVCoordinates,
    config?: QueryBuilderConfig | undefined,
    sourceInfo?: QueryableSourceInfo | undefined,
  ) {
    super(
      applicationStore,
      accessor,
      graphManagerState,
      workflow,
      actionConfig,
      config,
      sourceInfo,
    );
    makeObservable(this, {
      ingestDefinition: observable,
      isSwappingIngest: observable,
      changeIngestDefinition: action,
    });
    this.ingestDefinition = ingestDefinition;
    this.allIngestPaths = allIngestPaths;
    this.swapIngest = swapIngest;
    this.adhocRuntime = adhocRuntime;
    this.project = project;
  }

  override TEMPORARY__setupPanelContentRenderer = (): React.ReactNode =>
    renderIngestQueryBuilderSetupPanelContent(this);

  /**
   * The currently selected data set. Derived from `sourceAccessor` so it
   * stays in sync with `changeAccessor` (e.g. when the user picks a different
   * data set, or when {@link changeIngestDefinition} re-points the source).
   */
  get dataSet(): string {
    return this.sourceAccessor?.accessor ?? '';
  }

  override getQueryExecutionContext(): QueryExecutionContext {
    const exec = new QueryIngestExecutionContext();
    exec.ingestDefinitionPath = this.ingestDefinition.path;
    exec.dataSet = this.dataSet;
    return exec;
  }

  /**
   * The deep-link flow opens the editor against a single, pre-resolved ingest
   * definition. The user shouldn't be picking a different owner, but we still
   * surface the current ingest so the source dropdown reflects the selection
   * instead of rendering the empty "Choose a source..." placeholder.
   *
   * The full list of selectable ingests is exposed separately via
   * {@link allIngestPaths} (the others aren't built into the graph yet — see
   * {@link changeIngestDefinition}).
   */
  override get accessorOwners(): AccessorOwner[] {
    return [this.ingestDefinition];
  }

  /**
   * Execution always goes through {@link adhocRuntime} (selected by the
   * creator store). Return an empty list so the runtime dropdown is hidden
   * and the user can't override it.
   */
  override get compatibleRuntimes(): PackageableRuntime[] {
    return [];
  }

  /**
   * The adhoc lakehouse runtime is registered on the graph under the
   * `_internal_` package so the editor can resolve it, but it is not part
   * of the published project. Surface it as a floating execution element so
   * it's bundled into the execution payload at run time (mirrors what the
   * data-product flow does for its lakehouse runtime).
   */
  override get floatingExecutionElements(): PackageableElement[] | undefined {
    return this.graphManagerState.graph.origin !== undefined
      ? [this.adhocRuntime]
      : undefined;
  }

  /**
   * Convenience accessor: the underlying {@link LakehouseRuntime} on the
   * adhoc runtime, if any. Used by the setup panel to feed the runtime
   * configuration modal.
   */
  get lakehouseRuntime(): LakehouseRuntime | undefined {
    return this.adhocRuntime.runtimeValue instanceof LakehouseRuntime
      ? this.adhocRuntime.runtimeValue
      : undefined;
  }

  /**
   * Swap the active ingest definition to the one at `path`. Triggered by the
   * source dropdown in {@link IngestQueryBuilderSetupPanel}. Delegates the
   * graph mutation (delete current, build new) to {@link swapIngest} and then
   * rewires the source accessor so the editor reflects the new ingest's
   * datasets.
   */
  async changeIngestDefinition(path: string): Promise<void> {
    if (path === this.ingestDefinition.path || this.isSwappingIngest) {
      return;
    }
    runInAction(() => {
      this.isSwappingIngest = true;
    });
    try {
      const next = await this.swapIngest(path);
      runInAction(() => {
        this.ingestDefinition = next;
      });
      // Re-derive `sourceAccessor` against the new ingest. The previously
      // selected data set most likely doesn't exist on the new ingest, so
      // pick the first available one (if any).
      await this.changeAccessorOwner(next);
      const firstAccessor = this.accessors[0];
      if (firstAccessor) {
        await this.changeAccessor(firstAccessor);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error);
    } finally {
      runInAction(() => {
        this.isSwappingIngest = false;
      });
    }
  }

  /**
   * Copies the deep-link to this ingest query set up (GAV + ingest definition
   * path + data set) to the user's clipboard. Mirrors
   * `LegendQueryDataProductQueryBuilderState.copyDataProductLinkToClipBoard`.
   */
  copyIngestQueryLinkToClipBoard(): void {
    const route =
      this.applicationStore.navigationService.navigator.generateAddress(
        generateIngestQueryCreatorRoute(
          this.project.groupId,
          this.project.artifactId,
          this.project.versionId,
          this.ingestDefinition.path,
          this.dataSet,
        ),
      );
    navigator.clipboard
      .writeText(route)
      .then(() =>
        this.applicationStore.notificationService.notifySuccess(
          'Copied ingest query set up link to clipboard',
        ),
      )
      .catch(() =>
        this.applicationStore.notificationService.notifyError(
          'Error copying ingest query set up link to clipboard',
        ),
      );
  }
}
