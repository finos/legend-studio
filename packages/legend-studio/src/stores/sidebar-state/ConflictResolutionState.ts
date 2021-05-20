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

import { flow, action, makeAutoObservable } from 'mobx';
import type { EditorStore } from '../EditorStore';
import { CORE_LOG_EVENT } from '../../utils/Logger';
import type { EditorSdlcState } from '../EditorSdlcState';
import type { PlainObject } from '@finos/legend-studio-shared';
import {
  assertErrorThrown,
  assertTrue,
  guaranteeNonNullable,
  isNonNullable,
  NetworkClientError,
  HttpStatus,
  hashObject,
  deleteEntry,
} from '@finos/legend-studio-shared';
import { ProjectConfiguration } from '../../models/sdlc/models/configuration/ProjectConfiguration';
import type { Entity } from '../../models/sdlc/models/entity/Entity';
import {
  RevisionAlias,
  Revision,
} from '../../models/sdlc/models/revision/Revision';
import { EntityDiff } from '../../models/sdlc/models/comparison/EntityDiff';
import { EntityDiffViewState } from '../editor-state/entity-diff-editor-state/EntityDiffViewState';
import { SPECIAL_REVISION_ALIAS } from '../editor-state/entity-diff-editor-state/EntityDiffEditorState';
import type {
  EntityChangeConflict,
  EntityChangeConflictResolution,
} from '../../models/sdlc/models/entity/EntityChangeConflict';
import { EntityChangeConflictEditorState } from '../editor-state/entity-diff-editor-state/EntityChangeConflictEditorState';
import { EntityChangeType } from '../../models/sdlc/models/entity/EntityChange';
import { ACTIVITY_MODE } from '../EditorConfig';

export class ConflictResolutionState {
  editorStore: EditorStore;
  sdlcState: EditorSdlcState;
  isInitializingConflictResolution = false;
  isAcceptingConflictResolution = false;
  isDiscardingConflictResolutionChanges = false;
  isAbortingConflictResolution = false;
  hasResolvedAllConflicts = false;
  /**
   * This helps maintain the current merge text that the user is working on.
   * If we just use editor store to keep track of the current tab, what happens
   * is when the user closes the merge-conflict tab and re-open it, they will lose
   * their current progress because we will make network call again to recompute
   * the three way merge.
   */
  mergeEditorStates: EntityChangeConflictEditorState[] = [];

  constructor(editorStore: EditorStore, sdlcState: EditorSdlcState) {
    makeAutoObservable(this, {
      editorStore: false,
      sdlcState: false,
      removeMergeEditorState: action,
      confirmHasResolvedAllConflicts: action,
      openConflict: action,
      openConflictResolutionChange: action,
    });

    this.editorStore = editorStore;
    this.sdlcState = sdlcState;
  }

  get resolutions(): EntityChangeConflictResolution[] {
    return this.editorStore.changeDetectionState.resolutions;
  }
  get conflicts(): EntityChangeConflict[] {
    return this.editorStore.changeDetectionState.conflicts.filter(
      (conflict) =>
        !this.resolutions
          .map((resolution) => resolution.entityPath)
          .includes(conflict.entityPath),
    );
  }

  get resolvedChanges(): EntityDiff[] {
    return this.editorStore.changeDetectionState.resolutions
      .map((resolution) => {
        const path = resolution.entityPath;
        const fromEntity =
          this.editorStore.changeDetectionState.conflictResolutionBaseRevisionState.entities.find(
            (e) => e.path === path,
          );
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

  get changes(): EntityDiff[] {
    return this.hasResolvedAllConflicts
      ? this.editorStore.changeDetectionState
          .conflictResolutionBaseRevisionState.changes
      : this.editorStore.changeDetectionState.aggregatedConflictResolutionChanges
          .filter(
            (change) =>
              !this.conflicts
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

  removeMergeEditorState(
    mergeEditorState: EntityChangeConflictEditorState,
  ): void {
    deleteEntry(this.mergeEditorStates, mergeEditorState);
  }

  confirmHasResolvedAllConflicts(): void {
    this.hasResolvedAllConflicts = true;
    this.mergeEditorStates = []; // make sure we clean this to avoid any potential memory-leak
  }

  openConflict(conflict: EntityChangeConflict): void {
    const existingMergeEditorState = this.mergeEditorStates.find(
      (state) => state.entityPath === conflict.entityPath,
    );
    if (existingMergeEditorState) {
      this.editorStore.openEntityChangeConflict(existingMergeEditorState);
      return;
    }
    const baseEntityGetter = (
      entityPath: string | undefined,
    ): Entity | undefined =>
      entityPath
        ? this.editorStore.changeDetectionState.workspaceBaseRevisionState.entities.find(
            (e) => e.path === entityPath,
          )
        : undefined;
    const currentChangeEntityGetter = (
      entityPath: string | undefined,
    ): Entity | undefined =>
      entityPath
        ? this.editorStore.changeDetectionState.workspaceLatestRevisionState.entities.find(
            (e) => e.path === entityPath,
          )
        : undefined;
    const incomingChangeEntityGetter = (
      entityPath: string | undefined,
    ): Entity | undefined =>
      entityPath
        ? this.editorStore.changeDetectionState.conflictResolutionBaseRevisionState.entities.find(
            (e) => e.path === entityPath,
          )
        : undefined;
    const mergeEditorState = new EntityChangeConflictEditorState(
      this.editorStore,
      conflict.entityPath,
      SPECIAL_REVISION_ALIAS.WORKSPACE_BASE,
      SPECIAL_REVISION_ALIAS.WORKSPACE_HEAD,
      SPECIAL_REVISION_ALIAS.WORKSPACE_UPDATE,
      baseEntityGetter(conflict.entityPath),
      currentChangeEntityGetter(conflict.entityPath),
      incomingChangeEntityGetter(conflict.entityPath),
      baseEntityGetter,
      currentChangeEntityGetter,
      incomingChangeEntityGetter,
    );
    this.mergeEditorStates.push(mergeEditorState);
    this.editorStore.openEntityChangeConflict(mergeEditorState);
  }

  private initProjectConfigurationInConflictResolutionMode = flow(function* (
    this: ConflictResolutionState,
  ) {
    assertTrue(
      this.editorStore.isInConflictResolutionMode,
      'Editor must be in conflict resolution mode to call this method',
    );
    const projectConfiguration =
      (yield this.sdlcState.sdlcClient.getConfigurationOfWorkspaceInConflictResolutionMode(
        this.sdlcState.currentProjectId,
        this.sdlcState.currentWorkspaceId,
      )) as PlainObject<ProjectConfiguration>;
    this.editorStore.projectConfigurationEditorState.setProjectConfiguration(
      ProjectConfiguration.serialization.fromJson(projectConfiguration),
    );
    // make sure we set the original project configuration to a different object
    this.editorStore.projectConfigurationEditorState.setOriginalProjectConfiguration(
      ProjectConfiguration.serialization.fromJson(projectConfiguration),
    );
  });

  private initChangeDetectionInConflictResolutionMode = flow(function* (
    this: ConflictResolutionState,
  ) {
    try {
      const startTime = Date.now();
      // ======= (RE)START CHANGE DETECTION =======
      this.editorStore.changeDetectionState.stop();
      yield Promise.all([
        this.sdlcState.buildWorkspaceBaseRevisionEntityHashesIndex(),
        this.sdlcState.buildWorkspaceLatestRevisionEntityHashesIndex(),
        this.buildConflictResolutionBaseRevisionEntityHashesIndex(),
        this.buildConflictResolutionLatestRevisionEntityHashesIndex(),
      ]);
      this.editorStore.changeDetectionState.start();
      yield Promise.all([
        this.editorStore.changeDetectionState.computeLocalChanges(true),
        this.editorStore.changeDetectionState.computeAggregatedWorkspaceChanges(
          true,
        ),
        this.editorStore.changeDetectionState.computeAggregatedConflictResolutionChanges(
          true,
        ),
      ]);
      this.editorStore.applicationStore.logger.info(
        CORE_LOG_EVENT.CHANGE_DETECTION_RESTARTED,
        Date.now() - startTime,
        'ms',
      );
      // ======= FINISHED (RE)START CHANGE DETECTION =======
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
      this.sdlcState.handleChangeDetectionRefreshIssue(error);
      throw error;
    }
  });

  init = flow(function* (this: ConflictResolutionState) {
    assertTrue(
      this.editorStore.isInConflictResolutionMode,
      'Editor must be in conflict resolution mode to call this method',
    );
    try {
      this.isInitializingConflictResolution = true;
      yield Promise.all([
        this.initProjectConfigurationInConflictResolutionMode(),
        this.initChangeDetectionInConflictResolutionMode(),
      ]);
      /**
       * NOTE: There is a weird case where conflict resolution operations failed to delete the conflict resolution
       * workspace, so the user after accepting conflict resolution, ending up in conflict resolution mode
       * again without any conflicts, here we want to immediately redirect them to explorer panel to prompt
       * them to build graph
       */
      if (!this.conflicts.length) {
        this.editorStore.setActiveActivity(ACTIVITY_MODE.EXPLORER);
      }
    } finally {
      this.isInitializingConflictResolution = false;
    }
  });

  buildGraphInConflictResolutionMode = flow(function* (
    this: ConflictResolutionState,
  ) {
    assertTrue(
      this.editorStore.isInConflictResolutionMode &&
        this.hasResolvedAllConflicts,
      'Editor must be in conflict resolution mode and all conflicts must have been marked as resolved to call this method',
    );
    this.editorStore.closeAllEditorTabs();
    this.editorStore.setActiveActivity(ACTIVITY_MODE.EXPLORER, {
      keepShowingIfMatchedCurrent: true,
    });
    try {
      this.editorStore.graphState.isInitializingGraph = true;
      this.editorStore.changeDetectionState.stop(); // stop change detection (because it is alreayd running) so we can build the graph
      // NOTE: here we patch conflict resolution workspace HEAD entities with the entities from resolved conflicts to build graph with those
      const workspaceHeadEntities =
        this.editorStore.changeDetectionState
          .conflictResolutionHeadRevisionState.entities;
      const entities = workspaceHeadEntities
        .filter(
          (entity) =>
            !this.resolutions
              .map((resolution) => resolution.entityPath)
              .includes(entity.path),
        )
        .concat(
          this.resolutions
            .map((resolution) => resolution.resolvedEntity)
            .filter(isNonNullable),
        );
      // build graph
      yield this.editorStore.graphState.buildGraph(entities);

      // NOTE: since we have already started change detection engine when we entered conflict resolution mode, we just need
      // to restart local change detection here

      // ======= (RE)START CHANGE DETECTION =======
      this.editorStore.changeDetectionState.stop();
      yield this.editorStore.graphState.graph.precomputeHashes(
        this.editorStore.applicationStore.logger,
      );
      this.editorStore.changeDetectionState.start();
      yield this.editorStore.changeDetectionState.computeLocalChanges(true);
      this.editorStore.applicationStore.logger.info(
        CORE_LOG_EVENT.CHANGE_DETECTION_RESTARTED,
        '[ASNYC]',
      );
      // ======= FINISHED (RE)START CHANGE DETECTION =======
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  });

  buildConflictResolutionLatestRevisionEntityHashesIndex = flow(function* (
    this: ConflictResolutionState,
  ) {
    assertTrue(
      this.editorStore.isInConflictResolutionMode,
      'Editor must be in conflict resolution mode to call this method',
    );
    try {
      // fetch latest revision
      const latestRevision = Revision.serialization.fromJson(
        yield this.sdlcState.sdlcClient.getConflictResolutionRevision(
          this.sdlcState.currentProjectId,
          this.sdlcState.currentWorkspaceId,
          RevisionAlias.CURRENT,
        ),
      );
      if (latestRevision.id !== this.sdlcState.currentRevisionId) {
        // make sure there is no good recovery from this, at this point all users work risk conflict
        throw new Error(
          `Can't run local change detection. Current workspace revision is not the latest. Please backup your work and refresh the application`,
        );
      }
      const entities =
        (yield this.sdlcState.sdlcClient.getEntitiesByRevisionFromWorkspaceInConflictResolutionMode(
          this.sdlcState.currentProjectId,
          this.sdlcState.currentWorkspaceId,
          this.sdlcState.currentRevisionId,
        )) as Entity[];
      this.editorStore.changeDetectionState.conflictResolutionHeadRevisionState.setEntities(
        entities,
      );
      yield this.editorStore.changeDetectionState.conflictResolutionHeadRevisionState.buildEntityHashesIndex(
        entities,
        CORE_LOG_EVENT.CHANGE_DETECTION_LOCAL_HASHES_INDEX_BUILT,
      );
      this.editorStore.refreshCurrentEntityDiffEditorState();
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  });

  buildConflictResolutionBaseRevisionEntityHashesIndex = flow(function* (
    this: ConflictResolutionState,
  ) {
    assertTrue(
      this.editorStore.isInConflictResolutionMode,
      'Editor must be in conflict resolution mode to call this method',
    );
    try {
      const workspaceBaseEntities =
        (yield this.sdlcState.sdlcClient.getEntitiesByRevisionFromWorkspaceInConflictResolutionMode(
          this.sdlcState.currentProjectId,
          this.sdlcState.currentWorkspaceId,
          RevisionAlias.BASE,
        )) as Entity[];
      this.editorStore.changeDetectionState.conflictResolutionBaseRevisionState.setEntities(
        workspaceBaseEntities,
      );
      yield this.editorStore.changeDetectionState.conflictResolutionBaseRevisionState.buildEntityHashesIndex(
        workspaceBaseEntities,
        CORE_LOG_EVENT.CHANGE_DETECTION_WORKSPACE_HASHES_INDEX_BUILT,
      );
      this.editorStore.refreshCurrentEntityDiffEditorState();
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  });

  acceptConflictResolution = flow(function* (this: ConflictResolutionState) {
    // check if the workspace is in conflict resolution mode
    try {
      const isInConflictResolutionMode =
        (yield this.sdlcState.checkIfCurrentWorkspaceIsInConflictResolutionMode()) as boolean;
      if (!isInConflictResolutionMode) {
        this.editorStore.setBlockingAlert({
          message: 'Workspace is no longer in conflict resolution mode',
          prompt: 'Please refresh the application',
        });
        return;
      }
    } catch (error: unknown) {
      if (
        error instanceof NetworkClientError &&
        error.response.status === HttpStatus.NOT_FOUND
      ) {
        this.editorStore.setBlockingAlert({
          message: 'Current project or workspace no longer exists',
          prompt: 'Please refresh the application',
        });
      } else {
        this.editorStore.applicationStore.notifyWarning(
          'Failed to check if current workspace is in conflict resolution mode',
        );
      }
      return;
    }

    try {
      this.isAcceptingConflictResolution = true;
      this.editorStore.setBlockingAlert({
        message: 'Accepting conflict resolution...',
        prompt: 'Please do not close the application',
        showLoading: true,
      });
      const entityChanges =
        this.editorStore.graphState.computeLocalEntityChanges();
      yield this.sdlcState.sdlcClient.acceptConflictResolution(
        this.sdlcState.currentProjectId,
        this.sdlcState.currentWorkspaceId,
        {
          message: `resolving update merge conflicts for workspace from ${
            this.editorStore.applicationStore.config.appName
          } [potentially affected ${
            entityChanges.length === 1
              ? '1 entity'
              : `${entityChanges.length} entities`
          }]`,
          entityChanges,
          revisionId: this.sdlcState.currentRevisionId,
        },
      );
      this.editorStore.setIgnoreNavigationBlocking(true);
      window.location.reload();
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isAcceptingConflictResolution = false;
    }
  });

  discardConflictResolutionChanges = flow(function* (
    this: ConflictResolutionState,
  ) {
    // check if the workspace is in conflict resolution mode
    try {
      const isInConflictResolutionMode =
        (yield this.sdlcState.checkIfCurrentWorkspaceIsInConflictResolutionMode()) as boolean;
      if (!isInConflictResolutionMode) {
        this.editorStore.setBlockingAlert({
          message: 'Workspace is no longer in conflict resolution mode',
          prompt: 'Please refresh the application',
        });
        return;
      }
    } catch (error: unknown) {
      if (
        error instanceof NetworkClientError &&
        error.response.status === HttpStatus.NOT_FOUND
      ) {
        this.editorStore.setBlockingAlert({
          message: 'Current project or workspace no longer exists',
          prompt: 'Please refresh the application',
        });
      } else {
        this.editorStore.applicationStore.notifyWarning(
          'Failed to check if current workspace is in conflict resolution mode',
        );
      }
      return;
    }

    try {
      this.isDiscardingConflictResolutionChanges = true;
      this.editorStore.setBlockingAlert({
        message: 'Discarding conflict resolution changes...',
        prompt: 'Please do not close the application',
        showLoading: true,
      });
      yield this.sdlcState.sdlcClient.discardConflictResolutionChanges(
        this.sdlcState.currentProjectId,
        this.sdlcState.currentWorkspaceId,
      );
      this.editorStore.setIgnoreNavigationBlocking(true);
      window.location.reload();
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isDiscardingConflictResolutionChanges = false;
    }
  });

  abortConflictResolution = flow(function* (this: ConflictResolutionState) {
    // check if the workspace is in conflict resolution mode
    try {
      const isInConflictResolutionMode =
        (yield this.sdlcState.checkIfCurrentWorkspaceIsInConflictResolutionMode()) as boolean;
      if (!isInConflictResolutionMode) {
        this.editorStore.setBlockingAlert({
          message: 'Workspace is no longer in conflict resolution mode',
          prompt: 'Please refresh the application',
        });
        return;
      }
    } catch (error: unknown) {
      if (
        error instanceof NetworkClientError &&
        error.response.status === HttpStatus.NOT_FOUND
      ) {
        this.editorStore.setBlockingAlert({
          message: 'Current project or workspace no longer exists',
          prompt: 'Please refresh the application',
        });
      } else {
        this.editorStore.applicationStore.notifyWarning(
          'Failed to check if current workspace is in conflict resolution mode',
        );
      }
      return;
    }

    try {
      this.isAbortingConflictResolution = true;
      this.editorStore.setBlockingAlert({
        message: 'Aborting conflict resolution...',
        prompt: 'Please do not close the application',
        showLoading: true,
      });
      yield this.sdlcState.sdlcClient.abortConflictResolution(
        this.sdlcState.currentProjectId,
        this.sdlcState.currentWorkspaceId,
      );
      this.editorStore.setIgnoreNavigationBlocking(true);
      window.location.reload();
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isAbortingConflictResolution = false;
    }
  });

  openConflictResolutionChange(diff: EntityDiff): void {
    const fromEntityGetter = (
      entityPath: string | undefined,
    ): Entity | undefined =>
      entityPath
        ? this.editorStore.changeDetectionState.conflictResolutionBaseRevisionState.entities.find(
            (e) => e.path === entityPath,
          )
        : undefined;
    const toEntityGetter = (
      entityPath: string | undefined,
    ): Entity | undefined => {
      if (!entityPath) {
        return undefined;
      }
      if (this.hasResolvedAllConflicts) {
        // if the editor has already built the graph, we will get live entity
        const element =
          this.editorStore.graphState.graph.getNullableElement(entityPath);
        if (!element) {
          return undefined;
        }
        const entity = this.editorStore.graphState.graphManager.elementToEntity(
          element,
          true,
        );
        return entity;
      }
      // if the editor is still in conflict resolution phase (i.e. graph is not built yet), we will get entity from change detection or conflict resolutions
      const existingResolution = this.resolutions.find(
        (resolution) => resolution.entityPath === entityPath,
      );
      if (existingResolution) {
        return existingResolution.resolvedEntity;
      }
      // if the change is not from a conflict resolution, it must be from the list of entities of the latest revision in the workspace
      return this.editorStore.changeDetectionState.conflictResolutionHeadRevisionState.entities.find(
        (e) => e.path === entityPath,
      );
    };
    const fromEntity = EntityDiff.shouldOldEntityExist(diff)
      ? guaranteeNonNullable(
          fromEntityGetter(diff.getValidatedOldPath()),
          `Can't find element entity '${diff.oldPath}'`,
        )
      : undefined;
    const toEntity = EntityDiff.shouldNewEntityExist(diff)
      ? guaranteeNonNullable(
          toEntityGetter(diff.getValidatedNewPath()),
          `Can't find element entity '${diff.newPath}'`,
        )
      : undefined;
    this.editorStore.openEntityDiff(
      new EntityDiffViewState(
        this.editorStore,
        SPECIAL_REVISION_ALIAS.WORKSPACE_BASE,
        SPECIAL_REVISION_ALIAS.LOCAL,
        diff.oldPath,
        diff.newPath,
        fromEntity,
        toEntity,
        fromEntityGetter,
        toEntityGetter,
      ),
    );
  }

  /**
   * Check for remaining conflicts, if none left, prompt the users for the next action
   */
  promptBuildGraphAfterAllConflictsResolved = flow(function* (
    this: ConflictResolutionState,
  ) {
    if (!this.conflicts.length) {
      this.confirmHasResolvedAllConflicts();
      this.editorStore.setBlockingAlert({
        message: 'Building graph...',
        prompt: 'Please do not close the application',
        showLoading: true,
      });
      yield this.buildGraphInConflictResolutionMode();
      this.editorStore.setBlockingAlert(undefined);
    }
  });
}
