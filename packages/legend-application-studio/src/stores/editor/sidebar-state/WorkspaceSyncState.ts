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

import { flowResult, action, flow, makeObservable, observable } from 'mobx';
import type { EditorStore } from '../EditorStore.js';
import type { EditorSDLCState } from '../EditorSDLCState.js';
import type { Entity } from '@finos/legend-storage';
import {
  type GeneratorFn,
  type PlainObject,
  assertTrue,
  LogEvent,
  hashObject,
  isNonNullable,
  guaranteeNonNullable,
  assertErrorThrown,
  deleteEntry,
  ActionState,
} from '@finos/legend-shared';
import { LEGEND_STUDIO_APP_EVENT } from '../../../__lib__/LegendStudioEvent.js';
import { EntityChangeConflictEditorState } from '../editor-state/entity-diff-editor-state/EntityChangeConflictEditorState.js';
import {
  type EntityDiffViewerState,
  SPECIAL_REVISION_ALIAS,
} from '../editor-state/entity-diff-editor-state/EntityDiffEditorState.js';
import { EntityDiffViewState } from '../editor-state/entity-diff-editor-state/EntityDiffViewState.js';
import {
  type EntityChangeConflict,
  type EntityChangeConflictResolution,
  type EntityChange,
  EntityDiff,
  EntityChangeType,
  Revision,
  convertEntityDiffsToEntityChanges,
} from '@finos/legend-server-sdlc';
import {
  ActionAlertActionType,
  ActionAlertType,
} from '@finos/legend-application';
import { AbstractConflictResolutionState } from '../AbstractConflictResolutionState.js';

class WorkspaceSyncConflictResolutionState extends AbstractConflictResolutionState {
  showModal = false;
  conflicts: EntityChangeConflict[] = [];
  openMergedEditorStates: EntityDiffViewerState[] = [];
  currentDiffEditorState: EntityDiffViewerState | undefined;
  resolutions: EntityChangeConflictResolution[] = [];
  baseToLocalChanges: EntityDiff[] = [];

  constructor(editorStore: EditorStore, sdlcState: EditorSDLCState) {
    super(editorStore, sdlcState);
    makeObservable<WorkspaceSyncConflictResolutionState>(this, {
      editorStore: false,
      sdlcState: false,
      conflicts: observable,
      resolutions: observable,
      mergeEditorStates: observable,
      currentDiffEditorState: observable,
      openMergedEditorStates: observable,
      openConflict: action,
      openConflictState: action,
      closeConflict: action,
      resolveConflict: action,
      openState: action,
      markConflictAsResolved: flow,
      showModal: observable,
      setShowModal: action,
      openEntityChangeConflict: action,
      openConflictResolutionChange: action,
    });
  }

  get baseEntities(): Entity[] {
    return this.editorStore.changeDetectionState
      .workspaceLocalLatestRevisionState.entities;
  }

  get currentEntities(): Entity[] {
    return this.editorStore.graphManagerState.graph.allOwnElements.map(
      (element) =>
        this.editorStore.graphManagerState.graphManager.elementToEntity(
          element,
        ),
    );
  }

  get incomingEntities(): Entity[] {
    return this.editorStore.changeDetectionState
      .workspaceRemoteLatestRevisionState.entities;
  }

  get resolvedChanges(): EntityDiff[] {
    return this.resolutions
      .map((resolution) => {
        const path = resolution.entityPath;
        const fromEntity = this.baseEntities.find((e) => e.path === path);
        const toEntity = resolution.resolvedEntity;
        if (!fromEntity && !toEntity) {
          return undefined;
        } else if (!fromEntity) {
          return new EntityDiff(undefined, path, EntityChangeType.CREATE);
        } else if (!toEntity) {
          return new EntityDiff(path, undefined, EntityChangeType.DELETE);
        }
        return hashObject(toEntity.content) === hashObject(fromEntity.content)
          ? undefined
          : new EntityDiff(path, path, EntityChangeType.MODIFY);
      })
      .filter(isNonNullable);
  }

  get pendingConflicts(): EntityChangeConflict[] {
    return this.conflicts.filter(
      (conflict) =>
        !this.resolutions
          .map((resolution) => resolution.entityPath)
          .includes(conflict.entityPath),
    );
  }

  get changes(): EntityDiff[] {
    return this.baseToLocalChanges
      .filter(
        (change) =>
          !this.pendingConflicts
            .map((conflict) => conflict.entityPath)
            .includes(change.entityPath),
      )
      .filter(
        (change) =>
          !this.resolutions
            .map((resolution) => resolution.entityPath)
            .includes(change.entityPath),
      )
      .filter(
        (change) =>
          !this.resolvedChanges
            .map((resolvedChange) => resolvedChange.entityPath)
            .includes(change.entityPath),
      )
      .concat(this.resolvedChanges);
  }

  openState(entityDiffEditorState: EntityDiffViewerState): void {
    if (entityDiffEditorState instanceof EntityChangeConflictEditorState) {
      this.openConflictState(entityDiffEditorState);
    }
    if (entityDiffEditorState instanceof EntityDiffViewState) {
      this.openDiff(entityDiffEditorState);
    }
  }

  openConflict(conflict: EntityChangeConflict): void {
    const existingMergeEditorState = this.mergeEditorStates.find(
      (state) => state.entityPath === conflict.entityPath,
    );
    if (existingMergeEditorState) {
      this.openEntityChangeConflict(existingMergeEditorState);
      return;
    }
    const baseEntityGetter = (
      entityPath: string | undefined,
    ): Entity | undefined =>
      entityPath
        ? this.baseEntities.find((e) => e.path === entityPath)
        : undefined;
    const currentChangeEntityGetter = (
      entityPath: string | undefined,
    ): Entity | undefined =>
      entityPath
        ? this.currentEntities.find((e) => e.path === entityPath)
        : undefined;
    const incomingChangeEntityGetter = (
      entityPath: string | undefined,
    ): Entity | undefined =>
      entityPath
        ? this.incomingEntities.find((e) => e.path === entityPath)
        : undefined;
    const mergeEditorState = new EntityChangeConflictEditorState(
      this.editorStore,
      this,
      conflict.entityPath,
      SPECIAL_REVISION_ALIAS.WORKSPACE_BASE,
      SPECIAL_REVISION_ALIAS.LOCAL,
      SPECIAL_REVISION_ALIAS.WORKSPACE_HEAD,
      baseEntityGetter(conflict.entityPath),
      currentChangeEntityGetter(conflict.entityPath),
      incomingChangeEntityGetter(conflict.entityPath),
      baseEntityGetter,
      currentChangeEntityGetter,
      incomingChangeEntityGetter,
    );
    this.mergeEditorStates.push(mergeEditorState);
    this.openEntityChangeConflict(mergeEditorState);
  }

  closeConflict(conflictState: EntityDiffViewerState): void {
    const conflictIndex = this.openMergedEditorStates.findIndex(
      (e) => e === conflictState,
    );
    assertTrue(conflictIndex !== -1, `Can't close a tab which is not opened`);
    this.openMergedEditorStates.splice(conflictIndex, 1);
    if (this.currentDiffEditorState === conflictState) {
      if (this.openMergedEditorStates.length) {
        const openIndex = conflictIndex - 1;
        this.setCurrentMergeEditorState(
          openIndex >= 0
            ? this.openMergedEditorStates[openIndex]
            : this.openMergedEditorStates[0],
        );
      } else {
        this.setCurrentMergeEditorState(undefined);
      }
    }
  }

  openConflictState(conflictState: EntityChangeConflictEditorState): void {
    const existingEditorState = this.openMergedEditorStates.find(
      (editorState) =>
        editorState instanceof EntityChangeConflictEditorState &&
        editorState.entityPath === conflictState.entityPath,
    );
    const conflictEditorState = existingEditorState ?? conflictState;
    if (!existingEditorState) {
      this.openMergedEditorStates.push(conflictEditorState);
    }
    this.setCurrentMergeEditorState(conflictEditorState);
  }

  resolveConflict(resolution: EntityChangeConflictResolution): void {
    this.resolutions.push(resolution);
  }

  *markConflictAsResolved(
    conflictState: EntityChangeConflictEditorState,
  ): GeneratorFn<void> {
    // swap out the current conflict editor with a normal diff editor
    const resolvedChange = this.resolvedChanges.find(
      (change) => change.entityPath === conflictState.entityPath,
    );
    if (resolvedChange) {
      this.openConflictResolutionChange(resolvedChange);
    }
    this.closeConflict(conflictState);
    deleteEntry(this.mergeEditorStates, conflictState);
  }

  get toEntityGetter(): (entityPath: string | undefined) => Entity | undefined {
    return (entityPath: string | undefined): Entity | undefined => {
      if (!entityPath) {
        return undefined;
      }
      // if the editor is still in conflict resolution phase (i.e. graph is not built yet), we will get entity from change detection or conflict resolutions
      const existingResolution = this.resolutions.find(
        (resolution) => resolution.entityPath === entityPath,
      );
      if (existingResolution) {
        return existingResolution.resolvedEntity;
      }
      // if the change is not from a conflict resolution, it must be from the list of entities of the latest revision in the workspace
      return this.incomingEntities.find((entity) => entity.path === entityPath);
    };
  }

  openConflictResolutionChange(diff: EntityDiff): void {
    const fromEntityGetter = (
      entityPath: string | undefined,
    ): Entity | undefined =>
      entityPath
        ? this.baseEntities.find((entity) => entity.path === entityPath)
        : undefined;
    const fromEntity = EntityDiff.shouldOldEntityExist(diff)
      ? guaranteeNonNullable(
          fromEntityGetter(diff.getValidatedOldPath()),
          `Can't find entity with path  '${diff.oldPath}'`,
        )
      : undefined;
    const toEntity = EntityDiff.shouldNewEntityExist(diff)
      ? guaranteeNonNullable(
          this.toEntityGetter(diff.getValidatedNewPath()),
          `Can't find entity with path  '${diff.newPath}'`,
        )
      : undefined;
    this.openDiff(
      new EntityDiffViewState(
        this.editorStore,
        SPECIAL_REVISION_ALIAS.WORKSPACE_BASE,
        SPECIAL_REVISION_ALIAS.LOCAL,
        diff.oldPath,
        diff.newPath,
        fromEntity,
        toEntity,
        fromEntityGetter,
        this.toEntityGetter,
      ),
    );
  }

  initialize(conflicts: EntityChangeConflict[], changes: EntityDiff[]): void {
    this.conflicts = conflicts;
    this.baseToLocalChanges = changes;
    this.setShowModal(true);
  }

  teardown(): void {
    this.setShowModal(false);
    this.openMergedEditorStates = [];
    this.mergeEditorStates = [];
    this.setCurrentMergeEditorState(undefined);
    this.conflicts = [];
    this.baseToLocalChanges = [];
  }

  setShowModal(val: boolean): void {
    this.showModal = val;
  }

  setCurrentMergeEditorState(val: EntityDiffViewerState | undefined): void {
    this.currentDiffEditorState = val;
  }

  openEntityChangeConflict(
    entityChangeConflictEditorState: EntityChangeConflictEditorState,
  ): void {
    const existingEditorState = this.openMergedEditorStates.find(
      (editorState) =>
        editorState instanceof EntityChangeConflictEditorState &&
        editorState.entityPath === entityChangeConflictEditorState.entityPath,
    );
    const conflictEditorState =
      existingEditorState ?? entityChangeConflictEditorState;
    if (!existingEditorState) {
      this.openMergedEditorStates.push(conflictEditorState);
    }
    this.setCurrentMergeEditorState(conflictEditorState);
  }

  openDiff(entityDiffEditorState: EntityDiffViewState): void {
    const existingEditorState = this.openMergedEditorStates.find(
      (editorState) =>
        editorState instanceof EntityDiffViewState &&
        editorState.fromEntityPath === entityDiffEditorState.fromEntityPath &&
        editorState.toEntityPath === entityDiffEditorState.toEntityPath &&
        editorState.fromRevision === entityDiffEditorState.fromRevision &&
        editorState.toRevision === entityDiffEditorState.toRevision,
    );
    const diffEditorState = existingEditorState ?? entityDiffEditorState;
    if (!existingEditorState) {
      this.openMergedEditorStates.push(diffEditorState);
    }
    this.setCurrentMergeEditorState(diffEditorState);
  }
}

export class WorkspaceSyncState {
  readonly editorStore: EditorStore;
  readonly sdlcState: EditorSDLCState;

  pullChangesState = ActionState.create();
  incomingRevisions: Revision[] = [];
  workspaceSyncConflictResolutionState: WorkspaceSyncConflictResolutionState;

  constructor(editorStore: EditorStore, sdlcState: EditorSDLCState) {
    makeObservable(this, {
      pullChangesState: observable,
      incomingRevisions: observable,
      workspaceSyncConflictResolutionState: observable,
      resetConflictState: action,
      setIncomingRevisions: action,
      fetchIncomingRevisions: flow,
      pullChanges: flow,
      loadChanges: flow,
      forcePull: flow,
      applyResolutionChanges: flow,
    });

    this.editorStore = editorStore;
    this.sdlcState = sdlcState;
    this.workspaceSyncConflictResolutionState =
      new WorkspaceSyncConflictResolutionState(editorStore, sdlcState);
  }

  resetConflictState(): void {
    this.workspaceSyncConflictResolutionState.teardown();
    this.workspaceSyncConflictResolutionState =
      new WorkspaceSyncConflictResolutionState(
        this.editorStore,
        this.sdlcState,
      );
  }

  setIncomingRevisions(revisions: Revision[]): void {
    this.incomingRevisions = revisions;
  }

  *fetchIncomingRevisions(): GeneratorFn<void> {
    try {
      assertTrue(this.sdlcState.isWorkspaceOutOfSync);
      const revisions = (
        (yield this.editorStore.sdlcServerClient.getRevisions(
          this.sdlcState.activeProject.projectId,
          this.sdlcState.activeWorkspace,
          this.sdlcState.activeRevision.committedAt,
          this.sdlcState.activeRemoteWorkspaceRevision.committedAt,
        )) as PlainObject<Revision>[]
      ).map((v) => Revision.serialization.fromJson(v));
      this.setIncomingRevisions(
        revisions.filter((r) => r.id !== this.sdlcState.activeRevision.id),
      );
    } catch (error) {
      this.setIncomingRevisions([]);
      assertErrorThrown(error);
    }
  }

  *pullChanges(): GeneratorFn<void> {
    try {
      assertTrue(this.sdlcState.isWorkspaceOutOfSync);
      this.editorStore.applicationStore.alertService.setBlockingAlert({
        message: `Pulling latest changes...`,
        showLoading: true,
      });
      this.pullChangesState.inProgress();
      const changes =
        this.editorStore.changeDetectionState.workspaceLocalLatestRevisionState
          .changes;
      let conflicts: EntityChangeConflict[] = [];
      if (changes.length) {
        yield flowResult(
          this.editorStore.changeDetectionState.computeAggregatedWorkspaceRemoteChanges(),
        );
        conflicts =
          this.editorStore.changeDetectionState.potentialWorkspacePullConflicts;
      }
      if (conflicts.length) {
        this.editorStore.applicationStore.alertService.setBlockingAlert(
          undefined,
        );
        this.editorStore.applicationStore.alertService.setActionAlertInfo({
          message: 'Conflicts found while pulling changes',
          prompt:
            'You can either force-pull (override local changes) or resolve these conflicts manually',
          type: ActionAlertType.CAUTION,
          actions: [
            {
              label: 'Resolve merge conflicts',
              default: true,
              handler: (): void =>
                this.workspaceSyncConflictResolutionState.initialize(
                  conflicts,
                  this.editorStore.changeDetectionState
                    .aggregatedWorkspaceRemoteChanges,
                ),
              type: ActionAlertActionType.STANDARD,
            },
            {
              label: 'Force pull',
              type: ActionAlertActionType.PROCEED_WITH_CAUTION,
              handler: (): void => {
                flowResult(this.forcePull()).catch(
                  this.editorStore.applicationStore.alertUnhandledError,
                );
              },
            },
          ],
        });
        return;
      }
      const localChanges =
        this.editorStore.localChangesState.computeLocalEntityChanges();
      yield flowResult(this.loadChanges(localChanges));
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(
        `Can't pull changes. Error: ${error.message}`,
      );
    } finally {
      this.pullChangesState.complete();
    }
  }

  *loadChanges(changes: EntityChange[]): GeneratorFn<void> {
    this.editorStore.sdlcState.setCurrentRevision(
      this.sdlcState.activeRemoteWorkspaceRevision,
    );
    const entities =
      this.editorStore.changeDetectionState.workspaceRemoteLatestRevisionState
        .entities;
    this.editorStore.changeDetectionState.workspaceLocalLatestRevisionState.setEntities(
      entities,
    );
    this.resetConflictState();
    yield flowResult(
      this.editorStore.changeDetectionState.workspaceLocalLatestRevisionState.buildEntityHashesIndex(
        entities,
        LogEvent.create(
          LEGEND_STUDIO_APP_EVENT.CHANGE_DETECTION_BUILD_LOCAL_HASHES_INDEX__SUCCESS,
        ),
      ),
    );
    this.setIncomingRevisions([]);
    this.editorStore.changeDetectionState.setAggregatedWorkspaceRemoteChanges(
      [],
    );
    this.editorStore.changeDetectionState.setPotentialWorkspacePullConflicts(
      [],
    );
    yield flowResult(
      this.editorStore.graphState.loadEntityChangesToGraph(
        changes,
        // we create new entities to not override the initial entities on `workspaceLatestRevisionState` used for change detection
        entities.map((e) => ({
          classifierPath: e.classifierPath,
          path: e.path,
          content: e.content,
        })),
      ),
    );
  }

  *forcePull(): GeneratorFn<void> {
    try {
      const changes =
        this.editorStore.localChangesState.computeLocalEntityChanges();
      yield flowResult(this.loadChanges(changes));
      this.editorStore.applicationStore.notificationService.notifySuccess(
        'Workspace changes were force-pulled',
      );
    } catch (error) {
      assertErrorThrown(error);
      this.resetConflictState();
      this.editorStore.applicationStore.notificationService.notifyError(
        `Can't force-pull remote workspace changes. Error: ${error.message}`,
      );
    } finally {
      this.editorStore.applicationStore.alertService.setBlockingAlert(
        undefined,
      );
    }
  }

  *applyResolutionChanges(): GeneratorFn<void> {
    try {
      this.editorStore.applicationStore.alertService.setBlockingAlert({
        message: `Applying resolutions and reloading graph...`,
        showLoading: true,
      });
      const changes = convertEntityDiffsToEntityChanges(
        this.workspaceSyncConflictResolutionState.changes,
        this.workspaceSyncConflictResolutionState.toEntityGetter,
      );
      yield flowResult(this.loadChanges(changes));
    } catch (error) {
      assertErrorThrown(error);
      this.resetConflictState();
      this.editorStore.applicationStore.notificationService.notifyError(
        `Can't apply resolutions to local workspace. Error: ${error.message}`,
      );
    } finally {
      this.editorStore.applicationStore.alertService.setBlockingAlert(
        undefined,
      );
    }
  }
}
