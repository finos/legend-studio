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

import { action, flowResult, makeObservable, observable, flow } from 'mobx';
import type { EditorStore } from '../EditorStore.js';
import { LEGEND_STUDIO_APP_EVENT } from '../../../__lib__/LegendStudioEvent.js';
import type { EditorSDLCState } from '../EditorSDLCState.js';
import {
  type GeneratorFn,
  type PlainObject,
  LogEvent,
  assertErrorThrown,
  assertTrue,
  guaranteeNonNullable,
  isNonNullable,
  NetworkClientError,
  HttpStatus,
  hashObject,
  deleteEntry,
} from '@finos/legend-shared';
import { EntityDiffViewState } from '../editor-state/entity-diff-editor-state/EntityDiffViewState.js';
import { SPECIAL_REVISION_ALIAS } from '../editor-state/entity-diff-editor-state/EntityDiffEditorState.js';
import { EntityChangeConflictEditorState } from '../editor-state/entity-diff-editor-state/EntityChangeConflictEditorState.js';
import { ACTIVITY_MODE } from '../EditorConfig.js';
import type { Entity } from '@finos/legend-storage';
import {
  type EntityChangeConflict,
  type EntityChangeConflictResolution,
  EntityChangeType,
  EntityDiff,
  ProjectConfiguration,
  Revision,
  RevisionAlias,
} from '@finos/legend-server-sdlc';
import type { GraphBuilderResult } from '../EditorGraphState.js';
import { AbstractConflictResolutionState } from '../AbstractConflictResolutionState.js';

export class WorkspaceUpdateConflictResolutionState extends AbstractConflictResolutionState {
  isInitializingConflictResolution = false;
  hasResolvedAllConflicts = false;
  isAcceptingConflictResolution = false;
  isDiscardingConflictResolutionChanges = false;
  isAbortingConflictResolution = false;

  constructor(editorStore: EditorStore, sdlcState: EditorSDLCState) {
    super(editorStore, sdlcState);
    makeObservable<
      WorkspaceUpdateConflictResolutionState,
      'initChangeDetectionInConflictResolutionMode'
    >(this, {
      editorStore: false,
      sdlcState: false,
      mergeEditorStates: observable,
      isInitializingConflictResolution: observable,
      isAcceptingConflictResolution: observable,
      isDiscardingConflictResolutionChanges: observable,
      isAbortingConflictResolution: observable,
      hasResolvedAllConflicts: observable,
      openConflict: action,
      closeConflict: action,
      resolveConflict: action,
      markConflictAsResolved: flow,
      initialize: flow,
      buildGraphInConflictResolutionMode: flow,
      buildConflictResolutionLatestRevisionEntityHashesIndex: flow,
      initProjectConfigurationInConflictResolutionMode: flow,
      acceptConflictResolution: flow,
      buildConflictResolutionBaseRevisionEntityHashesIndex: flow,
      initChangeDetectionInConflictResolutionMode: flow,
      discardConflictResolutionChanges: flow,
      abortConflictResolution: flow,
      promptBuildGraphAfterAllConflictsResolved: flow,
      confirmHasResolvedAllConflicts: action,
      openConflictResolutionChange: action,
    });
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
    return this.resolutions
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

  openConflict(conflict: EntityChangeConflict): void {
    const existingMergeEditorState = this.mergeEditorStates.find(
      (state) => state.entityPath === conflict.entityPath,
    );
    if (existingMergeEditorState) {
      this.editorStore.tabManagerState.openTab(existingMergeEditorState);
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
        ? this.editorStore.changeDetectionState.workspaceLocalLatestRevisionState.entities.find(
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
      this,
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
    this.editorStore.tabManagerState.openTab(mergeEditorState);
  }

  closeConflict(conflict: EntityChangeConflictEditorState): void {
    this.editorStore.tabManagerState.closeTab(conflict);
  }

  resolveConflict(resolution: EntityChangeConflictResolution): void {
    this.editorStore.changeDetectionState.resolutions.push(resolution);
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
    // check for remaining conflicts, if none left, prompt the users for the next action
    yield flowResult(this.promptBuildGraphAfterAllConflictsResolved());
  }

  confirmHasResolvedAllConflicts(): void {
    this.hasResolvedAllConflicts = true;
    this.mergeEditorStates = []; // make sure we clean this to avoid any potential memory-leak
  }

  *initProjectConfigurationInConflictResolutionMode(): GeneratorFn<void> {
    assertTrue(
      this.editorStore.isInConflictResolutionMode,
      'Editor must be in conflict resolution mode to call this method',
    );
    const projectConfiguration =
      (yield this.editorStore.sdlcServerClient.getConfigurationOfWorkspaceInConflictResolutionMode(
        this.sdlcState.activeProject.projectId,
        this.sdlcState.activeWorkspace,
      )) as PlainObject<ProjectConfiguration>;
    this.editorStore.projectConfigurationEditorState.setProjectConfiguration(
      ProjectConfiguration.serialization.fromJson(projectConfiguration),
    );
    // make sure we set the original project configuration to a different object
    this.editorStore.projectConfigurationEditorState.setOriginalProjectConfiguration(
      ProjectConfiguration.serialization.fromJson(projectConfiguration),
    );
  }

  private *initChangeDetectionInConflictResolutionMode(): GeneratorFn<void> {
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
        this.editorStore.changeDetectionState.computeAggregatedWorkspaceChanges(
          true,
        ),
        this.editorStore.changeDetectionState.computeAggregatedConflictResolutionChanges(
          true,
        ),
      ]);
      this.editorStore.applicationStore.logService.info(
        LogEvent.create(
          LEGEND_STUDIO_APP_EVENT.CHANGE_DETECTION_RESTART__SUCCESS,
        ),
        Date.now() - startTime,
        'ms',
      );
      // ======= FINISHED (RE)START CHANGE DETECTION =======
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.sdlcState.handleChangeDetectionRefreshIssue(error);
      throw error;
    }
  }

  *initialize(): GeneratorFn<void> {
    assertTrue(
      this.editorStore.isInConflictResolutionMode,
      'Editor must be in conflict resolution mode to call this method',
    );
    try {
      this.isInitializingConflictResolution = true;
      yield flowResult(this.initChangeDetectionInConflictResolutionMode());
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
  }

  *buildGraphInConflictResolutionMode(): GeneratorFn<void> {
    assertTrue(
      this.editorStore.isInConflictResolutionMode &&
        this.hasResolvedAllConflicts,
      'Editor must be in conflict resolution mode and all conflicts must have been marked as resolved to call this method',
    );
    this.editorStore.tabManagerState.closeAllTabs();
    this.editorStore.setActiveActivity(ACTIVITY_MODE.EXPLORER, {
      keepShowingIfMatchedCurrent: true,
    });
    try {
      this.editorStore.changeDetectionState.stop(); // stop change detection (because it is already running) so we can build the graph
      // NOTE: here we patch conflict resolution workspace HEAD entities with the entities from resolved conflicts to build graph with those
      const workspaceLatestEntities =
        this.editorStore.changeDetectionState
          .conflictResolutionHeadRevisionState.entities;
      const entities = workspaceLatestEntities
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
      const result = (yield flowResult(
        this.editorStore.graphState.buildGraph(entities),
      )) as GraphBuilderResult;

      if (result.error) {
        throw result.error;
      }

      // build explorer tree
      this.editorStore.explorerTreeState.buildImmutableModelTrees();
      this.editorStore.explorerTreeState.build();

      // NOTE: since we have already started change detection engine when we entered conflict resolution mode, we just need
      // to restart local change detection here

      // ======= (RE)START CHANGE DETECTION =======
      this.editorStore.changeDetectionState.stop();
      yield this.editorStore.changeDetectionState.preComputeGraphElementHashes();
      this.editorStore.changeDetectionState.start();
      this.editorStore.applicationStore.logService.info(
        LogEvent.create(
          LEGEND_STUDIO_APP_EVENT.CHANGE_DETECTION_RESTART__SUCCESS,
        ),
        '[ASNYC]',
      );
      // ======= FINISHED (RE)START CHANGE DETECTION =======
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    }
  }

  *buildConflictResolutionLatestRevisionEntityHashesIndex(): GeneratorFn<void> {
    assertTrue(
      this.editorStore.isInConflictResolutionMode,
      'Editor must be in conflict resolution mode to call this method',
    );
    try {
      // fetch latest revision
      const latestRevision = Revision.serialization.fromJson(
        (yield this.editorStore.sdlcServerClient.getConflictResolutionRevision(
          this.sdlcState.activeProject.projectId,
          this.sdlcState.activeWorkspace,
          RevisionAlias.CURRENT,
        )) as PlainObject<Revision>,
      );
      // make sure there is no good recovery from this, at this point all users work risk conflict
      assertTrue(
        latestRevision.id === this.sdlcState.activeRevision.id,
        `Can't run local change detection. Current workspace revision is not the latest. Please backup your work and refresh the application`,
      );
      const entities =
        (yield this.editorStore.sdlcServerClient.getEntitiesByRevisionFromWorkspaceInConflictResolutionMode(
          this.sdlcState.activeProject.projectId,
          this.sdlcState.activeWorkspace,
          this.sdlcState.activeRevision.id,
        )) as Entity[];
      this.editorStore.changeDetectionState.conflictResolutionHeadRevisionState.setEntities(
        entities,
      );
      yield flowResult(
        this.editorStore.changeDetectionState.conflictResolutionHeadRevisionState.buildEntityHashesIndex(
          entities,
          LogEvent.create(
            LEGEND_STUDIO_APP_EVENT.CHANGE_DETECTION_BUILD_LOCAL_HASHES_INDEX__SUCCESS,
          ),
        ),
      );
      this.editorStore.tabManagerState.refreshCurrentEntityDiffViewer();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    }
  }

  *buildConflictResolutionBaseRevisionEntityHashesIndex(): GeneratorFn<void> {
    assertTrue(
      this.editorStore.isInConflictResolutionMode,
      'Editor must be in conflict resolution mode to call this method',
    );
    try {
      const workspaceBaseEntities =
        (yield this.editorStore.sdlcServerClient.getEntitiesByRevisionFromWorkspaceInConflictResolutionMode(
          this.sdlcState.activeProject.projectId,
          this.sdlcState.activeWorkspace,
          RevisionAlias.BASE,
        )) as Entity[];
      this.editorStore.changeDetectionState.conflictResolutionBaseRevisionState.setEntities(
        workspaceBaseEntities,
      );
      yield flowResult(
        this.editorStore.changeDetectionState.conflictResolutionBaseRevisionState.buildEntityHashesIndex(
          workspaceBaseEntities,
          LogEvent.create(
            LEGEND_STUDIO_APP_EVENT.CHANGE_DETECTION_BUILD_WORKSPACE_HASHES_INDEX__SUCCESS,
          ),
        ),
      );
      this.editorStore.tabManagerState.refreshCurrentEntityDiffViewer();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    }
  }

  *acceptConflictResolution(): GeneratorFn<void> {
    // check if the workspace is in conflict resolution mode
    try {
      const isInConflictResolutionMode = (yield flowResult(
        this.sdlcState.checkIfCurrentWorkspaceIsInConflictResolutionMode(),
      )) as boolean;
      if (!isInConflictResolutionMode) {
        this.editorStore.applicationStore.alertService.setBlockingAlert({
          message: 'Workspace is no longer in conflict resolution mode',
          prompt: 'Please refresh the application',
        });
        return;
      }
    } catch (error) {
      assertErrorThrown(error);
      if (
        error instanceof NetworkClientError &&
        error.response.status === HttpStatus.NOT_FOUND
      ) {
        this.editorStore.applicationStore.alertService.setBlockingAlert({
          message: 'Current project or workspace no longer exists',
          prompt: 'Please refresh the application',
        });
      } else {
        this.editorStore.applicationStore.notificationService.notifyWarning(
          'Failed to check if current workspace is in conflict resolution mode',
        );
      }
      return;
    }

    try {
      this.isAcceptingConflictResolution = true;
      this.editorStore.applicationStore.alertService.setBlockingAlert({
        message: 'Accepting conflict resolution...',
        prompt: 'Please do not close the application',
        showLoading: true,
      });
      const entityChanges =
        this.editorStore.localChangesState.computeLocalEntityChanges();
      yield this.editorStore.sdlcServerClient.acceptConflictResolution(
        this.sdlcState.activeProject.projectId,
        this.sdlcState.activeWorkspace,
        {
          message: `resolving update merge conflicts for workspace from ${
            this.editorStore.applicationStore.config.appName
          } [potentially affected ${
            entityChanges.length === 1
              ? '1 entity'
              : `${entityChanges.length} entities`
          }]`,
          entityChanges,
          revisionId: this.sdlcState.activeRevision.id,
        },
      );
      this.editorStore.applicationStore.navigationService.navigator.reload({
        ignoreBlocking: true,
      });
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.isAcceptingConflictResolution = false;
    }
  }

  *discardConflictResolutionChanges(): GeneratorFn<void> {
    // check if the workspace is in conflict resolution mode
    try {
      const isInConflictResolutionMode = (yield flowResult(
        this.sdlcState.checkIfCurrentWorkspaceIsInConflictResolutionMode(),
      )) as boolean;
      if (!isInConflictResolutionMode) {
        this.editorStore.applicationStore.alertService.setBlockingAlert({
          message: 'Workspace is no longer in conflict resolution mode',
          prompt: 'Please refresh the application',
        });
        return;
      }
    } catch (error) {
      assertErrorThrown(error);
      if (
        error instanceof NetworkClientError &&
        error.response.status === HttpStatus.NOT_FOUND
      ) {
        this.editorStore.applicationStore.alertService.setBlockingAlert({
          message: 'Current project or workspace no longer exists',
          prompt: 'Please refresh the application',
        });
      } else {
        this.editorStore.applicationStore.notificationService.notifyWarning(
          'Failed to check if current workspace is in conflict resolution mode',
        );
      }
      return;
    }

    try {
      this.isDiscardingConflictResolutionChanges = true;
      this.editorStore.applicationStore.alertService.setBlockingAlert({
        message: 'Discarding conflict resolution changes...',
        prompt: 'Please do not close the application',
        showLoading: true,
      });
      yield this.editorStore.sdlcServerClient.discardConflictResolutionChanges(
        this.sdlcState.activeProject.projectId,
        this.sdlcState.activeWorkspace,
      );
      this.editorStore.applicationStore.navigationService.navigator.reload({
        ignoreBlocking: true,
      });
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.isDiscardingConflictResolutionChanges = false;
    }
  }

  *abortConflictResolution(): GeneratorFn<void> {
    // check if the workspace is in conflict resolution mode
    try {
      const isInConflictResolutionMode = (yield flowResult(
        this.sdlcState.checkIfCurrentWorkspaceIsInConflictResolutionMode(),
      )) as boolean;
      if (!isInConflictResolutionMode) {
        this.editorStore.applicationStore.alertService.setBlockingAlert({
          message: 'Workspace is no longer in conflict resolution mode',
          prompt: 'Please refresh the application',
        });
        return;
      }
    } catch (error) {
      assertErrorThrown(error);
      if (
        error instanceof NetworkClientError &&
        error.response.status === HttpStatus.NOT_FOUND
      ) {
        this.editorStore.applicationStore.alertService.setBlockingAlert({
          message: 'Current project or workspace no longer exists',
          prompt: 'Please refresh the application',
        });
      } else {
        this.editorStore.applicationStore.notificationService.notifyWarning(
          'Failed to check if current workspace is in conflict resolution mode',
        );
      }
      return;
    }

    try {
      this.isAbortingConflictResolution = true;
      this.editorStore.applicationStore.alertService.setBlockingAlert({
        message: 'Aborting conflict resolution...',
        prompt: 'Please do not close the application',
        showLoading: true,
      });
      yield this.editorStore.sdlcServerClient.abortConflictResolution(
        this.sdlcState.activeProject.projectId,
        this.sdlcState.activeWorkspace,
      );
      this.editorStore.applicationStore.navigationService.navigator.reload({
        ignoreBlocking: true,
      });
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.isAbortingConflictResolution = false;
    }
  }

  openConflictResolutionChange(diff: EntityDiff): void {
    const fromEntityGetter = (
      entityPath: string | undefined,
    ): Entity | undefined =>
      entityPath
        ? this.editorStore.changeDetectionState.conflictResolutionBaseRevisionState.entities.find(
            (entity) => entity.path === entityPath,
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
          this.editorStore.graphManagerState.graph.getNullableElement(
            entityPath,
          );
        if (!element) {
          return undefined;
        }
        const entity =
          this.editorStore.graphManagerState.graphManager.elementToEntity(
            element,
            {
              pruneSourceInformation: true,
            },
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
        (entity) => entity.path === entityPath,
      );
    };
    const fromEntity = EntityDiff.shouldOldEntityExist(diff)
      ? guaranteeNonNullable(
          fromEntityGetter(diff.getValidatedOldPath()),
          `Can't find entity with path  '${diff.oldPath}'`,
        )
      : undefined;
    const toEntity = EntityDiff.shouldNewEntityExist(diff)
      ? guaranteeNonNullable(
          toEntityGetter(diff.getValidatedNewPath()),
          `Can't find entity with path  '${diff.newPath}'`,
        )
      : undefined;
    this.editorStore.tabManagerState.openTab(
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
  *promptBuildGraphAfterAllConflictsResolved(): GeneratorFn<void> {
    if (!this.conflicts.length) {
      this.confirmHasResolvedAllConflicts();
      this.editorStore.applicationStore.alertService.setBlockingAlert({
        message: 'Building graph...',
        prompt: 'Please do not close the application',
        showLoading: true,
      });
      yield flowResult(this.buildGraphInConflictResolutionMode());
      this.editorStore.applicationStore.alertService.setBlockingAlert(
        undefined,
      );
    }
  }
}
