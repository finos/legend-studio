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
  type IReactionDisposer,
  flowResult,
  observable,
  action,
  reaction,
  flow,
  makeObservable,
  isComputedProp,
} from 'mobx';
import { LEGEND_STUDIO_APP_EVENT } from '../../__lib__/LegendStudioEvent.js';
import {
  type GeneratorFn,
  LogEvent,
  IllegalStateError,
  shallowStringify,
  noop,
  assertErrorThrown,
  hashObject,
  promisify,
  ActionState,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-shared';
import type { EditorStore } from './EditorStore.js';
import type { EditorGraphState } from './EditorGraphState.js';
import type { Entity } from '@finos/legend-storage';
import {
  type EntityChangeConflictResolution,
  EntityChangeConflict,
  EntityChangeType,
  EntityDiff,
  type EntityChange,
} from '@finos/legend-server-sdlc';
import {
  ObserverContext,
  observe_Graph,
  observe_GraphElements,
} from '@finos/legend-graph';
import { type IDisposer, keepAlive } from 'mobx-utils';
import { TextLocalChangesState } from './sidebar-state/LocalChangesState.js';

class RevisionChangeDetectionState {
  editorStore: EditorStore;
  graphState: EditorGraphState;
  changes: EntityDiff[] = [];
  entityHashesIndex = new Map<string, string>();
  isBuildingEntityHashesIndex = false;
  entities: Entity[] = [];
  currentEntityHashesIndex = new Map<string, string>();

  setEntityHashesIndex(hashesIndex: Map<string, string>): void {
    this.entityHashesIndex = hashesIndex;
  }
  setIsBuildingEntityHashesIndex(building: boolean): void {
    this.isBuildingEntityHashesIndex = building;
  }
  setEntities(entities: Entity[]): void {
    this.entities = entities;
  }

  constructor(editorStore: EditorStore, graphState: EditorGraphState) {
    makeObservable(this, {
      changes: observable.ref,
      entityHashesIndex: observable.ref,
      entities: observable.ref,
      isBuildingEntityHashesIndex: observable,
      setEntityHashesIndex: action,
      setIsBuildingEntityHashesIndex: action,
      setEntities: action,
      computeChanges: flow,
      computeChangesInTextMode: flow,
      buildEntityHashesIndex: flow,
    });

    this.editorStore = editorStore;
    this.graphState = graphState;
  }

  *computeChanges(quiet?: boolean): GeneratorFn<void> {
    const startTime = Date.now();
    let changes: EntityDiff[] = [];
    if (!this.isBuildingEntityHashesIndex) {
      const originalPaths = new Set(Array.from(this.entityHashesIndex.keys()));
      if (this.editorStore.graphManagerState.graph.allOwnElements.length) {
        yield Promise.all<void>(
          this.editorStore.graphManagerState.graph.allOwnElements.map(
            (element) =>
              promisify(() => {
                const elementPath = element.path;
                const originalElementHash =
                  this.entityHashesIndex.get(elementPath);
                if (!originalElementHash) {
                  changes.push(
                    new EntityDiff(
                      undefined,
                      elementPath,
                      EntityChangeType.CREATE,
                    ),
                  );
                } else if (originalElementHash !== element.hashCode) {
                  changes.push(
                    new EntityDiff(
                      elementPath,
                      elementPath,
                      EntityChangeType.MODIFY,
                    ),
                  );
                }
                originalPaths.delete(elementPath);
              }),
          ),
        );
      }
      changes = changes.concat(
        Array.from(originalPaths).map(
          (path) => new EntityDiff(path, undefined, EntityChangeType.DELETE),
        ),
      );
    }
    this.changes = changes;
    if (!quiet) {
      this.editorStore.applicationStore.logService.info(
        LogEvent.create(
          LEGEND_STUDIO_APP_EVENT.CHANGE_DETECTION_COMPUTE_CHANGES__SUCCESS,
        ),
        Date.now() - startTime,
        'ms',
      );
    }
  }

  *computeChangesInTextMode(
    currentEntities: Entity[],
    quiet?: boolean,
  ): GeneratorFn<void> {
    const startTime = Date.now();
    const changes: EntityDiff[] = [];
    const entityChanges: EntityChange[] = [];
    if (!this.isBuildingEntityHashesIndex) {
      let currentHashesIndex;
      if (currentEntities.length) {
        currentHashesIndex =
          (yield this.editorStore.graphManagerState.graphManager.buildHashesIndex(
            currentEntities,
          )) as Map<string, string>;
        this.currentEntityHashesIndex = currentHashesIndex;
      }
      const originalPaths = new Set(Array.from(this.entityHashesIndex.keys()));
      if (currentHashesIndex) {
        yield Promise.all<void>(
          Array.from(currentHashesIndex.entries()).map(
            ([elementPath, elementHash]) =>
              promisify(() => {
                const entity = currentEntities.find(
                  (e) => e.path === elementPath,
                );
                const originalElementHash =
                  this.entityHashesIndex.get(elementPath);
                if (!originalElementHash) {
                  changes.push(
                    new EntityDiff(
                      undefined,
                      elementPath,
                      EntityChangeType.CREATE,
                    ),
                  );
                  entityChanges.push({
                    classifierPath: guaranteeNonNullable(entity).classifierPath,
                    entityPath: guaranteeNonNullable(entity).path,
                    content: guaranteeNonNullable(entity).content,
                    type: EntityChangeType.CREATE,
                  });
                } else if (originalElementHash !== elementHash) {
                  changes.push(
                    new EntityDiff(
                      elementPath,
                      elementPath,
                      EntityChangeType.MODIFY,
                    ),
                  );
                  entityChanges.push({
                    classifierPath: guaranteeNonNullable(entity).classifierPath,
                    entityPath: guaranteeNonNullable(entity).path,
                    content: guaranteeNonNullable(entity).content,
                    type: EntityChangeType.MODIFY,
                  });
                }
                originalPaths.delete(elementPath);
              }),
          ),
        );
      }
      yield promisify(() => {
        Array.from(originalPaths).forEach((path) => {
          changes.push(
            new EntityDiff(path, undefined, EntityChangeType.DELETE),
          );
          entityChanges.push({
            type: EntityChangeType.DELETE,
            entityPath: path,
          });
        });
      });
    }
    this.changes = changes;
    guaranteeType(
      this.editorStore.localChangesState,
      TextLocalChangesState,
    ).localChanges = entityChanges;
    if (!quiet) {
      this.editorStore.applicationStore.logService.info(
        LogEvent.create(
          LEGEND_STUDIO_APP_EVENT.CHANGE_DETECTION_COMPUTE_CHANGES__SUCCESS,
        ),
        Date.now() - startTime,
        'ms',
      );
    }
  }

  *buildEntityHashesIndex(
    entities: Entity[],
    logEvent: LogEvent,
    quiet?: boolean,
  ): GeneratorFn<void> {
    if (!this.entities.length && !this.entityHashesIndex.size) {
      return;
    }
    const startTime = Date.now();
    this.setIsBuildingEntityHashesIndex(true);
    try {
      const hashesIndex =
        (yield this.editorStore.graphManagerState.graphManager.buildHashesIndex(
          entities,
        )) as Map<string, string>;
      this.setEntityHashesIndex(hashesIndex);
      this.setIsBuildingEntityHashesIndex(false);
      if (!quiet) {
        this.editorStore.applicationStore.logService.info(
          logEvent,
          '[ASYNC]',
          Date.now() - startTime,
          'ms',
        );
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.CHANGE_DETECTION__FAILURE),
        `Can't build hashes index`,
      );
      this.setEntityHashesIndex(new Map<string, string>());
      this.setIsBuildingEntityHashesIndex(false);
      throw new IllegalStateError(error);
    } finally {
      this.setIsBuildingEntityHashesIndex(false);
    }
  }
}

/**
 * In the SDLC flow of the app, there are several important revision that we want to keep track of. See diagram below:
 *
 *    (1. PJL)
 *     |
 *     |
 *    (2. CRB) ------- (3. CRH) ------ (4. CRL)
 *     |
 *     |
 *    (5. WSB) ------- (6. WSH) ------ (7. WSL)
 *     |
 *    ... (earlier revisions in the project)
 *
 * Annotations:
 * 1. PJL: Project HEAD revision
 * 2. CRB: Conflict resolution BASE revision
 * 3. CRH: Conflict resolution HEAD revision
 * 4. CRL: Conflict resolution LIVE revision (i.e. local graph state in conflict resolution mode)
 * 5. WSB: Workspace BASE revision
 * 6. WSH: Workspace HEAD revision
 * 7. WSL: Workspace LIVE revision (i.e. local graph state in standard mode)
 */
export class ChangeDetectionState {
  editorStore: EditorStore;
  graphState: EditorGraphState;
  graphObserveState = ActionState.create();
  initState = ActionState.create();
  /**
   * Keep the list of disposers to deactivate `keepAlive` for computed value of element hash code.
   * See {@link preComputeGraphElementHashes} for more details
   */
  private graphElementHashCodeKeepAliveComputationDisposers: IDisposer[] = [];
  private changeDetectionReaction?: IReactionDisposer | undefined;
  /**
   * [1. PJL] Store the entities from project HEAD (i.e. project latest revision)
   * This can be used to compute changes for a review as well as changes and potential conflicts when updating workspace
   */
  projectLatestRevisionState: RevisionChangeDetectionState;
  /**
   * [2. CRB] Store the entities from the BASE revision of workspace with conflict resolution (this is different from the current workspace the user is on)
   * NOTE: the flow for conflict resolution is briefly like this (assume current user workspace is `w1`):
   * 1. When the user chooses to update workspace `w1`, the backend will compute changes between `w1` HEAD and `w1` BASE
   * 2. Create a new conflict resolution branch on top of project HEAD
   * 3. Apply the changes on this branch.
   *
   * So we now have 2 branchs normal `w1` and `w1` in conflict resolution. From the user perspective, they might not need to know this
   * So in the app, we have to check for the existence of the conflict resolution branch and make it supercede the original `w1` branch
   *
   * This branch, thus, will be used to show the users all the changes they have on top of conflict resolution BASE revision
   * during conflict resolution stage
   */
  conflictResolutionBaseRevisionState: RevisionChangeDetectionState;
  /**
   * [3. CRH] Store the entities from the conflict resolution HEAD revision
   * This is used for computing the live diff, so that when we mark conflicts as resolved and accept conflict resolution
   * we can compute the entity changes
   */
  conflictResolutionHeadRevisionState: RevisionChangeDetectionState;
  /**
   * [5. WSB] Store the entities from workspace BASE revision
   * This can be used for conflict resolution
   */
  workspaceBaseRevisionState: RevisionChangeDetectionState;
  /**
   * [6. WSH] Store the entities from LOCAL workspace HEAD revision.
   * This can be used for computing local changes/live diffs (i.e. changes between local graph and workspace HEAD)
   */
  workspaceLocalLatestRevisionState: RevisionChangeDetectionState;

  /**
   * Store the entities from remote workspace HEAD revision.
   * This can be used for computing the diffs between local workspace and remote workspace to check if the local workspace is out-of-sync
   */
  workspaceRemoteLatestRevisionState: RevisionChangeDetectionState;

  aggregatedWorkspaceChanges: EntityDiff[] = []; // review/merge-request changes
  aggregatedProjectLatestChanges: EntityDiff[] = []; // project latest changes - used for updating workspace
  aggregatedWorkspaceRemoteChanges: EntityDiff[] = []; // review/merge-request changes
  potentialWorkspaceUpdateConflicts: EntityChangeConflict[] = []; // potential conflicts when updating workspace (derived from aggregated workspace changes and project latest changes)
  potentialWorkspacePullConflicts: EntityChangeConflict[] = [];
  /**
   * For conflict resolution, the procedure is split into 2 steps:
   * 1. The user resolves conflicts (no graph is built at this point)
   * 2. The user marks all conflicts as resolved and starts building the graph to fix any residual problems
   *
   * Ideally, we would like to use the live diff (conflict resolution BASE <-> local graph), but since for step 1
   * we do not build the graph, this is not possible, so we have to use the following to store the diff until we move to step 2
   */
  aggregatedConflictResolutionChanges: EntityDiff[] = [];
  conflicts: EntityChangeConflict[] = []; // conflicts in conflict resolution mode (derived from aggregated workspace changes and conflict resolution changes)
  resolutions: EntityChangeConflictResolution[] = [];
  currentGraphHash: string | undefined;

  observerContext: ObserverContext;

  constructor(editorStore: EditorStore, graphState: EditorGraphState) {
    makeObservable(this, {
      resolutions: observable,
      currentGraphHash: observable,
      projectLatestRevisionState: observable.ref,
      conflictResolutionBaseRevisionState: observable.ref,
      conflictResolutionHeadRevisionState: observable.ref,
      workspaceBaseRevisionState: observable.ref,
      workspaceLocalLatestRevisionState: observable.ref,
      workspaceRemoteLatestRevisionState: observable,
      aggregatedWorkspaceChanges: observable.ref,
      aggregatedProjectLatestChanges: observable.ref,
      aggregatedWorkspaceRemoteChanges: observable.ref,
      potentialWorkspacePullConflicts: observable.ref,
      potentialWorkspaceUpdateConflicts: observable.ref,
      aggregatedConflictResolutionChanges: observable.ref,
      conflicts: observable.ref,
      setAggregatedProjectLatestChanges: action,
      setPotentialWorkspaceUpdateConflicts: action,
      stop: action,
      start: action,
      computeAggregatedWorkspaceChanges: flow,
      computeAggregatedProjectLatestChanges: flow,
      computeAggregatedConflictResolutionChanges: flow,
      computeWorkspaceUpdateConflicts: flow,
      computeConflictResolutionConflicts: flow,
      computeEntityChangeConflicts: flow,
      computeLocalChanges: flow,
      computeLocalChangesInTextMode: flow,
      computeAggregatedWorkspaceRemoteChanges: flow,
      observeGraph: flow,
    });

    this.editorStore = editorStore;
    this.graphState = graphState;
    this.workspaceLocalLatestRevisionState = new RevisionChangeDetectionState(
      editorStore,
      graphState,
    );
    this.workspaceRemoteLatestRevisionState = new RevisionChangeDetectionState(
      editorStore,
      graphState,
    );
    this.workspaceBaseRevisionState = new RevisionChangeDetectionState(
      editorStore,
      graphState,
    );
    this.projectLatestRevisionState = new RevisionChangeDetectionState(
      editorStore,
      graphState,
    );
    // conflict resolution
    this.conflictResolutionHeadRevisionState = new RevisionChangeDetectionState(
      editorStore,
      graphState,
    );
    this.conflictResolutionBaseRevisionState = new RevisionChangeDetectionState(
      editorStore,
      graphState,
    );
    this.observerContext = new ObserverContext(
      this.editorStore.pluginManager.getPureGraphManagerPlugins(),
    );
  }

  setAggregatedProjectLatestChanges(diffs: EntityDiff[]): void {
    this.aggregatedProjectLatestChanges = diffs;
  }

  setAggregatedWorkspaceRemoteChanges(diffs: EntityDiff[]): void {
    this.aggregatedWorkspaceRemoteChanges = diffs;
  }

  setPotentialWorkspaceUpdateConflicts(
    conflicts: EntityChangeConflict[],
  ): void {
    this.potentialWorkspaceUpdateConflicts = conflicts;
  }

  setPotentialWorkspacePullConflicts(conflicts: EntityChangeConflict[]): void {
    this.potentialWorkspacePullConflicts = conflicts;
  }

  getCurrentGraphHash(): string {
    return hashObject(
      Array.from(this.snapshotLocalEntityHashesIndex(true).entries())
        // sort to ensure this array order does not affect change detection status
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, value]) => `${key}@${value}`),
    );
  }

  stop(force = false): void {
    this.changeDetectionReaction?.();
    this.changeDetectionReaction = undefined;
    if (force) {
      this.initState.fail();
    } else {
      this.initState.reset();
    }
  }

  /**
   * The change detection check is not free, although due to the power of mobx's computed, this is really fast
   * but we want to use a reaction here instead of having changes as a computed getter is that:
   * 1. We want to debounce the action
   * 2. We want to control when we would start observing for changes (this is useful since we need to compute the initial
   * hashes index before this, otherwise users will get false report about the number of changes)
   * This function might cause the UI to jank the since it involves expensive computation of the all the elements' hashes
   * for the first time. Currently there is no workaround so we might need to comeback and evaluate this
   */
  start(): void {
    this.changeDetectionReaction?.();
    /**
     * It seems like the reaction action is not always called in tests, causing fluctuation in
     * code coverage report for this file. As such, for test, we would want to disable throttling
     * to avoid timing issue.
     *
     * See https://docs.codecov.io/docs/unexpected-coverage-changes
     * See https://community.codecov.io/t/codecov-reporting-impacted-files-for-unchanged-and-completely-unrelated-file/2635
     */
    // eslint-disable-next-line no-process-env
    const throttleDuration = process.env.NODE_ENV === 'test' ? 0 : 1000;
    /**
     * For the reaction, the data we observe is the snapshot of the current graph's hash index.
     * This will loop through all elements' and compute the hashCode for the first time
     * so in subsequent calls this could be fast. This is expensive and the optimization we choose is
     * to parallelize using promises, but since `mobx` only tracks dependency synchronously,
     * we would lose the benefit of `mobx` computation
     * See https://github.com/danielearwicker/computed-async-mobx#gotchas
     * See https://github.com/mobxjs/mobx/issues/668
     * See https://github.com/mobxjs/mobx/issues/872
     *
     * So now, we have 2 options:
     * 1. We can let the UI freezes up for a short while by calling `this.snapshotCurrentHashesIndex(true)`
     * 2. We will use `keepAlive` for elements that we care about for building the hashes index, i.e. class, mapping, diagram, etc.
     *
     * We will go with (2) but we have to note that `keepAlive` can cause memory leak. As such, activating `keepAlive` is
     * a fairly non-trivial step, see {@link preComputeGraphElementHashes} for more details
     *
     * See https://mobx.js.org/computeds.html#keepalive
     * See https://medium.com/terria/when-and-why-does-mobxs-keepalive-cause-a-memory-leak-8c29feb9ff55
     */
    this.changeDetectionReaction = reaction(
      () => this.getCurrentGraphHash(),
      () => {
        flowResult(this.computeLocalChanges(true)).catch(noop());
        this.currentGraphHash = this.getCurrentGraphHash();
      },
      {
        // fire reaction immediately to compute the first changeset
        fireImmediately: true,
        // throttle the call
        delay: throttleDuration,
      },
    );

    // set initial current graph hash
    this.currentGraphHash = this.getCurrentGraphHash();

    // dispose and remove the disposers for `keepAlive` computations for elements' hash code
    this.graphElementHashCodeKeepAliveComputationDisposers.forEach((disposer) =>
      disposer(),
    );
    this.graphElementHashCodeKeepAliveComputationDisposers = [];

    this.initState.pass();
  }

  snapshotLocalEntityHashesIndex(quiet?: boolean): Map<string, string> {
    const startTime = Date.now();
    const snapshot = new Map<string, string>();
    this.editorStore.graphManagerState.graph.allOwnElements.forEach((el) =>
      snapshot.set(el.path, el.hashCode),
    );
    if (!quiet) {
      this.editorStore.applicationStore.logService.info(
        LogEvent.create(
          LEGEND_STUDIO_APP_EVENT.CHANGE_DETECTION_BUILD_GRAPH_HASHES_INDEX__SUCCESS,
        ),
        Date.now() - startTime,
        'ms',
      );
    }
    return snapshot;
  }

  private computeAggregatedChangesBetweenStates = async (
    fromState: RevisionChangeDetectionState,
    toState: RevisionChangeDetectionState,
    quiet?: boolean,
  ): Promise<EntityDiff[]> => {
    const startTime = Date.now();
    let changes: EntityDiff[] = [];
    if (
      !fromState.isBuildingEntityHashesIndex &&
      !toState.isBuildingEntityHashesIndex
    ) {
      const originalPaths = new Set(
        Array.from(fromState.entityHashesIndex.keys()),
      );
      await Promise.all<void>(
        Array.from(toState.entityHashesIndex.entries()).map(
          ([elementPath, hashCode]) =>
            promisify(() => {
              const originalElementHashCode =
                fromState.entityHashesIndex.get(elementPath);
              if (!originalElementHashCode) {
                changes.push(
                  new EntityDiff(
                    undefined,
                    elementPath,
                    EntityChangeType.CREATE,
                  ),
                );
              } else if (originalElementHashCode !== hashCode) {
                changes.push(
                  new EntityDiff(
                    elementPath,
                    elementPath,
                    EntityChangeType.MODIFY,
                  ),
                );
              }
              originalPaths.delete(elementPath);
            }),
        ),
      );
      changes = changes.concat(
        Array.from(originalPaths).map(
          (path) => new EntityDiff(path, undefined, EntityChangeType.DELETE),
        ),
      );
      if (!quiet) {
        this.editorStore.applicationStore.logService.info(
          LogEvent.create(
            LEGEND_STUDIO_APP_EVENT.CHANGE_DETECTION_COMPUTE_CHANGES__SUCCESS,
          ),
          Date.now() - startTime,
          'ms',
        );
      }
    }
    return changes;
  };

  *computeAggregatedWorkspaceChanges(quiet?: boolean): GeneratorFn<void> {
    this.aggregatedWorkspaceChanges =
      (yield this.computeAggregatedChangesBetweenStates(
        this.workspaceBaseRevisionState,
        this.workspaceLocalLatestRevisionState,
        quiet,
      )) as EntityDiff[];
    yield Promise.all([
      this.computeWorkspaceUpdateConflicts(quiet),
      this.computeConflictResolutionConflicts(quiet),
    ]);
  }

  *computeAggregatedWorkspaceRemoteChanges(quiet?: boolean): GeneratorFn<void> {
    this.aggregatedWorkspaceRemoteChanges =
      (yield this.computeAggregatedChangesBetweenStates(
        this.workspaceLocalLatestRevisionState,
        this.workspaceRemoteLatestRevisionState,
        quiet,
      )) as EntityDiff[];
    const conflicts = (yield flowResult(
      this.computeEntityChangeConflicts(
        this.workspaceLocalLatestRevisionState.changes,
        this.aggregatedWorkspaceRemoteChanges,
        this.snapshotLocalEntityHashesIndex(),
        this.workspaceRemoteLatestRevisionState.entityHashesIndex,
      ),
    )) as EntityChangeConflict[];
    this.setPotentialWorkspacePullConflicts(conflicts);
  }

  *computeAggregatedProjectLatestChanges(quiet?: boolean): GeneratorFn<void> {
    this.aggregatedProjectLatestChanges =
      (yield this.computeAggregatedChangesBetweenStates(
        this.workspaceBaseRevisionState,
        this.projectLatestRevisionState,
        quiet,
      )) as EntityDiff[];
    yield flowResult(this.computeWorkspaceUpdateConflicts(quiet));
  }

  *computeAggregatedConflictResolutionChanges(
    quiet?: boolean,
  ): GeneratorFn<void> {
    this.aggregatedConflictResolutionChanges =
      (yield this.computeAggregatedChangesBetweenStates(
        this.conflictResolutionBaseRevisionState,
        this.conflictResolutionHeadRevisionState,
        quiet,
      )) as EntityDiff[];
  }

  /**
   * Workspace update conflicts are computed between 2 sets of changes:
   * 1. Incoming changes: changes between workspace BASE revision and project LATEST revision
   * 2. Current changes: changes between workspace BASE revision and workspace HEAD revision
   */
  *computeWorkspaceUpdateConflicts(quiet?: boolean): GeneratorFn<void> {
    const startTime = Date.now();
    this.potentialWorkspaceUpdateConflicts = (yield flowResult(
      this.computeEntityChangeConflicts(
        this.aggregatedWorkspaceChanges,
        this.aggregatedProjectLatestChanges,
        this.workspaceLocalLatestRevisionState.entityHashesIndex,
        this.projectLatestRevisionState.entityHashesIndex,
      ),
    )) as EntityChangeConflict[];
    if (!quiet) {
      this.editorStore.applicationStore.logService.info(
        LogEvent.create(
          LEGEND_STUDIO_APP_EVENT.CHANGE_DETECTION_COMPUTE_WORKSPACE_UPDATE_CONFLICTS__SUCCESS,
        ),
        Date.now() - startTime,
        'ms',
      );
    }
  }

  /**
   * Conflict resolution conflicts are computed between 2 sets of changes:
   * 1. Incoming changes: changes between workspace BASE revision and conflict resolution BASE revision
   * 2. Current changes: changes between workspace BASE revision and workspace HEAD revision
   */
  *computeConflictResolutionConflicts(quiet?: boolean): GeneratorFn<void> {
    const aggregatedUpdateChanges =
      (yield this.computeAggregatedChangesBetweenStates(
        this.workspaceBaseRevisionState,
        this.conflictResolutionBaseRevisionState,
        quiet,
      )) as EntityDiff[];
    const startTime = Date.now();
    this.conflicts = (yield flowResult(
      this.computeEntityChangeConflicts(
        this.aggregatedWorkspaceChanges,
        aggregatedUpdateChanges,
        this.workspaceLocalLatestRevisionState.entityHashesIndex,
        this.conflictResolutionBaseRevisionState.entityHashesIndex,
      ),
    )) as EntityChangeConflict[];
    if (!quiet) {
      this.editorStore.applicationStore.logService.info(
        LogEvent.create(
          LEGEND_STUDIO_APP_EVENT.CHANGE_DETECTION_COMPUTE_CONFLICT_RESOLUTION_CONFLICTS__SUCCESS,
        ),
        Date.now() - startTime,
        'ms',
      );
    }
  }

  /**
   * This function computes the entity change conflicts between 2 set of entity changes (let's call them incoming changes and current changes).
   * For a more comprehensive explanation, we take a look at how we can use this to compute potential conflicts during workspace update:
   *
   * To compute potential conflicts during workspace update, we must base off the project latest changes [incChg] (workspace BASE <-> project HEAD)
   * and the merge request changes [currChng] (workspace BASE <-> workspace HEAD). We have a case table below (`N.A.` means it's impossible cases)
   * For cases we with `conflict` there might be potential conflicts as the change to the entity appear in both [incChg] and [currChng]. But we must
   * note that this is `potential` because we cannot be too sure how SDCL server handle merging these during update.
   *
   * NOTE: it's important to remember that these are truly potential conflicts, because of git merge mechanism,
   * it will apply one intermediate commit at a time, this means that if, we have a file A:
   *
   * Workspace change: 1. A is deleted; 2. A is created with content `a`
   * Project latest change: 1. A is modified with content `a`
   *
   * These could mean no conflict from our computation but is a conflict when Git tries to merge.
   *
   * NOTE: Also, there could be strange case for SVN that a file can be DELETED and CREATED, it's called "replace".
   *
   *             | [incChg] |          |          |          |
   * -----------------------------------------------------------
   *  [currChng] |          |  CREATE  |  DELETE  |  MODIFY  |
   * -----------------------------------------------------------
   *             |  CREATE  | conflict |   N.A.   |   N.A.   |
   * -----------------------------------------------------------
   *             |  DELETE  |   N.A.   |   none   | conflict |
   * -----------------------------------------------------------
   *             |  MODIFY  |   N.A.   | conflict | conflict |
   * -----------------------------------------------------------
   */
  *computeEntityChangeConflicts(
    currentChanges: EntityDiff[],
    incomingChanges: EntityDiff[],
    currentChangeEntityHashesIndex: Map<string, string>,
    incomingChangeEntityHashesIndex: Map<string, string>,
  ): GeneratorFn<EntityChangeConflict[]> {
    const conflicts: EntityChangeConflict[] = [];
    const currentChangesMap = currentChanges.reduce(
      (diffMap, currentDiff) =>
        diffMap.set(currentDiff.entityPath, currentDiff),
      new Map<string, EntityDiff>(),
    );
    const incomingChangesMap = incomingChanges.reduce(
      (diffMap, currentDiff) =>
        diffMap.set(currentDiff.entityPath, currentDiff),
      new Map<string, EntityDiff>(),
    );
    yield Promise.all<void>(
      Array.from(incomingChangesMap.entries()).map(
        ([entityPath, incomingChange]: [string, EntityDiff]) =>
          promisify(() => {
            const currentChange = currentChangesMap.get(entityPath); // find the change on the same entity in the set of current changes
            if (currentChange) {
              if (
                (currentChange.entityChangeType === EntityChangeType.CREATE &&
                  incomingChange.entityChangeType ===
                    EntityChangeType.CREATE) ||
                (currentChange.entityChangeType === EntityChangeType.MODIFY &&
                  incomingChange.entityChangeType === EntityChangeType.MODIFY)
              ) {
                // if the two entities are identical, we can guarantee no conflict happens, otherwise, depending on the SDLC server, we might get a conflict.
                // NOTE: we actually want the potential conflict to be a real conflict in this case because SDLC server while attempting to merge the protocol JSON
                // might actually mess up the entity, which is very bad
                if (
                  currentChangeEntityHashesIndex.get(entityPath) !==
                  incomingChangeEntityHashesIndex.get(entityPath)
                ) {
                  conflicts.push(
                    new EntityChangeConflict(
                      entityPath,
                      incomingChange,
                      currentChange,
                    ),
                  );
                }
              } else if (
                (currentChange.entityChangeType === EntityChangeType.DELETE &&
                  incomingChange.entityChangeType ===
                    EntityChangeType.MODIFY) ||
                (currentChange.entityChangeType === EntityChangeType.MODIFY &&
                  incomingChange.entityChangeType === EntityChangeType.DELETE)
              ) {
                conflicts.push(
                  new EntityChangeConflict(
                    entityPath,
                    incomingChange,
                    currentChange,
                  ),
                );
              } else if (
                currentChange.entityChangeType === EntityChangeType.DELETE &&
                incomingChange.entityChangeType === EntityChangeType.DELETE
              ) {
                // do nothing
              } else {
                throw new IllegalStateError(
                  `Detected unfeasible state while computing entity change conflict for entity '${entityPath}', with current change: ${shallowStringify(
                    currentChange,
                  )}, and incoming change: ${shallowStringify(incomingChange)}`,
                );
              }
            }
          }),
      ),
    );
    return conflicts;
  }

  /**
   * NOTE: here we have not dealt with non-entity changes like project dependency for example.
   * We will have to count that as part of the change in the future.
   */
  *computeLocalChanges(quiet?: boolean): GeneratorFn<void> {
    const startTime = Date.now();
    yield Promise.all([
      this.workspaceLocalLatestRevisionState.computeChanges(quiet), // for local changes detection
      this.conflictResolutionBaseRevisionState.computeChanges(quiet), // for conflict resolution changes detection
    ]);
    if (!quiet) {
      this.editorStore.applicationStore.logService.info(
        LogEvent.create(
          LEGEND_STUDIO_APP_EVENT.CHANGE_DETECTION_COMPUTE_CHANGES__SUCCESS,
        ),
        Date.now() - startTime,
        'ms',
      );
    }
  }

  *computeLocalChangesInTextMode(
    currentEntities: Entity[],
    quiet?: boolean,
  ): GeneratorFn<void> {
    const startTime = Date.now();
    yield Promise.all([
      this.workspaceLocalLatestRevisionState.computeChangesInTextMode(
        currentEntities,
        quiet,
      ),
    ]);
    if (!quiet) {
      this.editorStore.applicationStore.logService.info(
        LogEvent.create(
          LEGEND_STUDIO_APP_EVENT.CHANGE_DETECTION_COMPUTE_CHANGES__SUCCESS,
        ),
        Date.now() - startTime,
        'ms',
      );
    }
    this.initState.pass();
  }

  *observeGraph(): GeneratorFn<void> {
    if (this.initState.hasSucceeded) {
      throw new IllegalStateError(
        `Can't observe graph: change detection must be stopped first`,
      );
    }
    if (this.editorStore.graphManagerState.graph.origin) {
      throw new IllegalStateError(
        `Can't observe graph: can't change graph with sdlc pointer`,
      );
    }
    this.graphObserveState.inProgress();
    this.graphObserveState.setMessage(`Observing graph...`);
    const startTime = Date.now();
    // NOTE: this method has to be done synchronously in `action` context
    // to make sure `mobx` react to observables from the graph, such as its element indices
    observe_Graph(this.editorStore.graphManagerState.graph);
    // this will be done asynchronously to improve performance
    yield observe_GraphElements(
      this.editorStore.graphManagerState.graph,
      this.editorStore.changeDetectionState.observerContext,
    );
    this.editorStore.applicationStore.logService.info(
      LogEvent.create(
        LEGEND_STUDIO_APP_EVENT.CHANGE_DETECTION_OBSERVE_GRAPH__SUCCESS,
      ),
      '[ASYNC]',
      Date.now() - startTime,
      'ms',
    );
    this.graphObserveState.setMessage(undefined);
    this.graphObserveState.pass();
  }

  /**
   * Call `get hashCode()` on each element once so we trigger the first time we compute the hash for that element.
   * Notice that we do this in asynchronous manner to not block the main execution thread, as this is quiet an expensive
   * task.
   *
   * We also want to take advantage of `mobx computed` here so we save time when starting change detection. However,
   * since `mobx computed` does not track async contexts, we have to use the `keepAlive` option for `computed`
   *
   * To avoid memory leak potentially caused by `keepAlive`, we use `keepAlive` utility from `mobx-utils`
   * so we could manually dispose `keepAlive` later after we already done with starting change detection.
   */
  async preComputeGraphElementHashes(): Promise<void> {
    const startTime = Date.now();
    const disposers: IDisposer[] = [];
    if (this.editorStore.graphManagerState.graph.allOwnElements.length) {
      await Promise.all<void>(
        this.editorStore.graphManagerState.graph.allOwnElements.map((element) =>
          promisify(() => {
            if (isComputedProp(element, 'hashCode')) {
              disposers.push(keepAlive(element, 'hashCode'));
            }
            // manually trigger hash code computation
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            element.hashCode;
          }),
        ),
      );
    }
    // save the `keepAlive` computation disposers to dispose after we start change detection
    // so the first call of change detection still get the benefit of computed value
    this.graphElementHashCodeKeepAliveComputationDisposers = disposers;
    this.editorStore.applicationStore.logService.info(
      LogEvent.create(
        LEGEND_STUDIO_APP_EVENT.CHANGE_DETECTION_PRECOMPUTE_GRAPH_HASHES__SUCCESS,
      ),
      '[ASYNC]',
      Date.now() - startTime,
      'ms',
    );
  }
}
