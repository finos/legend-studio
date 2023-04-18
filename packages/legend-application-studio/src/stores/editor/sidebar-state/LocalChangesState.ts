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
  action,
  makeObservable,
  flowResult,
  flow,
  observable,
  computed,
} from 'mobx';
import type { EditorStore } from '../EditorStore.js';
import type { EditorSDLCState } from '../EditorSDLCState.js';
import {
  type GeneratorFn,
  type PlainObject,
  LogEvent,
  assertErrorThrown,
  downloadFileUsingDataURI,
  guaranteeNonNullable,
  ContentType,
  NetworkClientError,
  HttpStatus,
  deleteEntry,
  assertTrue,
  readFileAsText,
  ActionState,
  formatDate,
} from '@finos/legend-shared';
import {
  DEFAULT_TAB_SIZE,
  ActionAlertType,
  ActionAlertActionType,
  DEFAULT_DATE_TIME_FORMAT,
} from '@finos/legend-application';
import { EntityDiffViewState } from '../editor-state/entity-diff-editor-state/EntityDiffViewState.js';
import { SPECIAL_REVISION_ALIAS } from '../editor-state/entity-diff-editor-state/EntityDiffEditorState.js';
import type { Entity } from '@finos/legend-storage';
import {
  type EntityChangeConflict,
  EntityDiff,
  EntityChange,
  Revision,
  EntityChangeType,
} from '@finos/legend-server-sdlc';
import { LEGEND_STUDIO_APP_EVENT } from '../../../__lib__/LegendStudioEvent.js';
import { WorkspaceSyncState } from './WorkspaceSyncState.js';
import { ACTIVITY_MODE } from '../EditorConfig.js';
import { EntityChangeConflictEditorState } from '../editor-state/entity-diff-editor-state/EntityChangeConflictEditorState.js';

class PatchLoaderState {
  readonly editorStore: EditorStore;
  readonly sdlcState: EditorSDLCState;

  changes: EntityChange[] | undefined;
  currentChanges: EntityChange[] = [];
  isLoadingChanges = false;
  showModal = false;
  isValidPatch = false;

  constructor(editorStore: EditorStore, sdlcState: EditorSDLCState) {
    makeObservable(this, {
      changes: observable,
      currentChanges: observable,
      isLoadingChanges: observable,
      showModal: observable,
      isValidPatch: observable,
      overiddingChanges: computed,
      openModal: action,
      closeModal: action,
      setIsValidPatch: action,
      setPatchChanges: action,
      deleteChange: action,
      loadPatchFile: flow,
      applyChanges: flow,
    });

    this.editorStore = editorStore;
    this.sdlcState = sdlcState;
  }

  get overiddingChanges(): EntityChange[] {
    if (this.changes?.length) {
      return this.changes.filter((change) =>
        this.currentChanges.find(
          (local) => local.entityPath === change.entityPath,
        ),
      );
    }
    return [];
  }

  openModal(localChanges: EntityChange[]): void {
    this.currentChanges = localChanges;
    this.showModal = true;
  }

  closeModal(): void {
    this.currentChanges = [];
    this.setPatchChanges(undefined);
    this.showModal = false;
  }

  setIsValidPatch(val: boolean): void {
    this.isValidPatch = val;
  }

  setPatchChanges(changes: EntityChange[] | undefined): void {
    this.changes = changes;
  }

  deleteChange(change: EntityChange): void {
    if (this.changes) {
      deleteEntry(this.changes, change);
    }
  }

  *loadPatchFile(file: File): GeneratorFn<void> {
    try {
      this.setPatchChanges(undefined);
      assertTrue(
        file.type === ContentType.APPLICATION_JSON,
        `Patch file expected to be of type 'JSON'`,
      );
      const fileText = (yield readFileAsText(file)) as string;
      const entityChanges = JSON.parse(fileText) as {
        entityChanges: PlainObject<EntityChange>[];
      };
      const changes = entityChanges.entityChanges.map((e) =>
        EntityChange.serialization.fromJson(e),
      );
      this.setPatchChanges(changes);
      this.setIsValidPatch(true);
    } catch (error) {
      assertErrorThrown(error);
      this.setIsValidPatch(false);
      this.editorStore.applicationStore.notificationService.notifyError(
        `Can't load patch: Error: ${error.message}`,
      );
    }
  }

  *applyChanges(): GeneratorFn<void> {
    if (this.changes?.length) {
      try {
        const changes = this.changes;
        this.closeModal();
        yield flowResult(
          this.editorStore.graphState.loadEntityChangesToGraph(
            changes,
            undefined,
          ),
        );
      } catch (error) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.notificationService.notifyError(
          `Can't apply patch changes: Error: ${error.message}`,
        );
      }
    }
  }
}

export abstract class LocalChangesState {
  readonly editorStore: EditorStore;
  readonly sdlcState: EditorSDLCState;
  readonly workspaceSyncState: WorkspaceSyncState;
  readonly pushChangesState = ActionState.create();
  readonly refreshLocalChangesDetectorState = ActionState.create();
  readonly refreshWorkspaceSyncStatusState = ActionState.create();
  readonly patchLoaderState: PatchLoaderState;

  constructor(editorStore: EditorStore, sdlcState: EditorSDLCState) {
    makeObservable(this, {
      hasUnpushedChanges: computed,
      refreshWorkspaceSyncStatus: flow,
      refreshLocalChanges: flow,
      pushLocalChanges: flow,
      processConflicts: flow,
      restartChangeDetection: flow,
    });

    this.editorStore = editorStore;
    this.sdlcState = sdlcState;
    this.patchLoaderState = new PatchLoaderState(editorStore, sdlcState);
    this.workspaceSyncState = new WorkspaceSyncState(editorStore, sdlcState);
  }

  get hasUnpushedChanges(): boolean {
    return Boolean(
      this.editorStore.changeDetectionState.workspaceLocalLatestRevisionState
        .changes.length,
    );
  }

  downloadLocalChanges(): void {
    const fileName = `entityChanges_(${this.sdlcState.currentProject?.name}_${
      this.sdlcState.activeWorkspace.workspaceId
    })_${formatDate(new Date(Date.now()), DEFAULT_DATE_TIME_FORMAT)}.json`;
    const content = JSON.stringify(
      {
        message: '', // TODO?
        entityChanges: this.computeLocalEntityChanges(),
        revisionId: this.sdlcState.activeRevision.id,
      },
      undefined,
      DEFAULT_TAB_SIZE,
    );
    downloadFileUsingDataURI(fileName, content, ContentType.APPLICATION_JSON);
  }

  alertUnsavedChanges(onProceed: () => void): void {
    if (this.hasUnpushedChanges) {
      this.editorStore.applicationStore.alertService.setActionAlertInfo({
        message:
          'Unsaved changes will be lost if you continue. Do you still want to proceed?',
        type: ActionAlertType.CAUTION,
        actions: [
          {
            label: 'Proceed',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler: (): void => onProceed(),
          },
          {
            label: 'Abort',
            type: ActionAlertActionType.PROCEED,
            default: true,
          },
        ],
      });
    } else {
      onProceed();
    }
  }

  *refreshWorkspaceSyncStatus(): GeneratorFn<void> {
    try {
      this.refreshWorkspaceSyncStatusState.inProgress();
      const currentRemoteRevision =
        this.sdlcState.activeRemoteWorkspaceRevision;
      yield flowResult(
        this.sdlcState.fetchRemoteWorkspaceRevision(
          this.sdlcState.activeProject.projectId,
          this.sdlcState.activeWorkspace,
        ),
      );
      if (
        currentRemoteRevision.id !==
        this.sdlcState.activeRemoteWorkspaceRevision.id
      ) {
        if (this.sdlcState.isWorkspaceOutOfSync) {
          this.workspaceSyncState.fetchIncomingRevisions();
          const remoteWorkspaceEntities =
            (yield this.editorStore.sdlcServerClient.getEntitiesByRevision(
              this.sdlcState.activeProject.projectId,
              this.sdlcState.activeWorkspace,
              this.sdlcState.activeRemoteWorkspaceRevision.id,
            )) as Entity[];
          this.editorStore.changeDetectionState.workspaceRemoteLatestRevisionState.setEntities(
            remoteWorkspaceEntities,
          );
          yield flowResult(
            this.editorStore.changeDetectionState.workspaceRemoteLatestRevisionState.buildEntityHashesIndex(
              remoteWorkspaceEntities,
              LogEvent.create(
                LEGEND_STUDIO_APP_EVENT.CHANGE_DETECTION_BUILD_LOCAL_HASHES_INDEX__SUCCESS,
              ),
            ),
          );
          yield flowResult(
            this.editorStore.changeDetectionState.computeAggregatedWorkspaceRemoteChanges(),
          );
        } else {
          this.editorStore.changeDetectionState.workspaceRemoteLatestRevisionState.setEntities(
            [],
          );
          this.editorStore.changeDetectionState.setPotentialWorkspacePullConflicts(
            [],
          );
          this.editorStore.changeDetectionState.setAggregatedWorkspaceRemoteChanges(
            [],
          );
        }
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
    } finally {
      this.refreshWorkspaceSyncStatusState.complete();
    }
  }

  abstract refreshLocalChanges(): GeneratorFn<void>;

  abstract processConflicts(): GeneratorFn<void>;

  abstract getCurrentHashIndexes(): Map<string, string>;

  abstract stopChangeDetection(): void;

  abstract restartChangeDetection(): GeneratorFn<void>;

  abstract computeLocalEntityChanges(): EntityChange[];

  *pushLocalChanges(pushMessage?: string): GeneratorFn<void> {
    if (
      this.pushChangesState.isInProgress ||
      this.editorStore.workspaceUpdaterState.isUpdatingWorkspace
    ) {
      return;
    }
    // check if the workspace is in conflict resolution mode
    yield flowResult(this.processConflicts());

    this.pushChangesState.inProgress();
    const startTime = Date.now();
    const localChanges = this.computeLocalEntityChanges();
    if (!localChanges.length) {
      this.pushChangesState.complete();
      return;
    }
    yield flowResult(
      this.sdlcState.fetchRemoteWorkspaceRevision(
        this.sdlcState.activeProject.projectId,
        this.sdlcState.activeWorkspace,
      ),
    );
    if (this.sdlcState.isWorkspaceOutOfSync) {
      // ensure changes/conflicts have been computed for latest remote version
      const remoteWorkspaceEntities =
        (yield this.editorStore.sdlcServerClient.getEntitiesByRevision(
          this.sdlcState.activeProject.projectId,
          this.sdlcState.activeWorkspace,
          this.sdlcState.activeRemoteWorkspaceRevision.id,
        )) as Entity[];
      this.editorStore.changeDetectionState.workspaceRemoteLatestRevisionState.setEntities(
        remoteWorkspaceEntities,
      );
      yield flowResult(
        this.editorStore.changeDetectionState.workspaceRemoteLatestRevisionState.buildEntityHashesIndex(
          remoteWorkspaceEntities,
          LogEvent.create(
            LEGEND_STUDIO_APP_EVENT.CHANGE_DETECTION_BUILD_LOCAL_HASHES_INDEX__SUCCESS,
          ),
        ),
      );
      yield flowResult(
        this.editorStore.changeDetectionState.computeAggregatedWorkspaceRemoteChanges(),
      );
      this.editorStore.applicationStore.alertService.setActionAlertInfo({
        message: 'Local workspace is out-of-sync',
        prompt: 'Please pull remote changes before pushing your local changes',
        type: ActionAlertType.CAUTION,
        actions: [
          {
            label: 'Pull remote changes',
            type: ActionAlertActionType.STANDARD,
            default: true,
            handler: (): void => {
              this.editorStore.setActiveActivity(ACTIVITY_MODE.LOCAL_CHANGES);
              flowResult(this.workspaceSyncState.pullChanges()).catch(
                this.editorStore.applicationStore.alertUnhandledError,
              );
            },
          },
          {
            label: 'Cancel',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
          },
        ],
      });
      this.pushChangesState.complete();
      return;
    }
    const currentHashesIndex = this.getCurrentHashIndexes();

    try {
      const nullableRevisionChange =
        (yield this.editorStore.sdlcServerClient.performEntityChanges(
          this.sdlcState.activeProject.projectId,
          this.sdlcState.activeWorkspace,
          {
            message:
              pushMessage ??
              `pushed new changes from ${
                this.editorStore.applicationStore.config.appName
              } [potentially affected ${
                localChanges.length === 1
                  ? '1 entity'
                  : `${localChanges.length} entities`
              }]`,
            entityChanges: localChanges,
            revisionId: this.sdlcState.activeRevision.id,
          },
        )) as PlainObject<Revision> | undefined;
      const revisionChange = guaranteeNonNullable(
        nullableRevisionChange,
        `Can't push an empty change set. This may be due to an error with change detection`,
      );
      const latestRevision = Revision.serialization.fromJson(revisionChange);
      this.sdlcState.setCurrentRevision(latestRevision); // update current revision to the latest
      this.sdlcState.setWorkspaceLatestRevision(latestRevision);
      const syncFinishedTime = Date.now();

      this.editorStore.applicationStore.logService.info(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.PUSH_LOCAL_CHANGES__SUCCESS),
        syncFinishedTime - startTime,
        'ms',
      );

      // ======= (RE)START CHANGE DETECTION =======

      this.stopChangeDetection();

      try {
        /**
         * Here we try to rebuild local hash index. If failed, we will use local hash index, but for veracity, it's best to use entities
         * coming from the server.
         */
        const entities =
          (yield this.editorStore.sdlcServerClient.getEntitiesByRevision(
            this.sdlcState.activeProject.projectId,
            this.sdlcState.activeWorkspace,
            latestRevision.id,
          )) as Entity[];
        this.editorStore.changeDetectionState.workspaceLocalLatestRevisionState.setEntities(
          entities,
        );
        yield flowResult(
          this.editorStore.changeDetectionState.workspaceLocalLatestRevisionState.buildEntityHashesIndex(
            entities,
            LogEvent.create(
              LEGEND_STUDIO_APP_EVENT.CHANGE_DETECTION_BUILD_LOCAL_HASHES_INDEX__SUCCESS,
            ),
          ),
        );
        this.editorStore.tabManagerState.refreshCurrentEntityDiffViewer();
      } catch (error) {
        assertErrorThrown(error);
        /**
         * NOTE: there is a known problem with the SDLC server where if we try to fetch the entities right after syncing, there is a chance
         * that we get entities from the older commit (i.e. potentially some caching issue). As such, to account for this case, we will
         * not try to get entities for the workspace HEAD, but for the revision returned from the syncing call (i.e. this must be the latest revision)
         * if we get a 404, we will do a refresh and warn user about this. Otherwise, if we get other types of error, we will assume this is a network
         * failure and use local workspace hashes index
         */
        if (error instanceof NetworkClientError) {
          if (error.response.status === HttpStatus.NOT_FOUND) {
            this.editorStore.applicationStore.logService.error(
              LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
              `Can't fetch entities for the latest workspace revision immediately after syncing`,
              error,
            );
          }
          this.editorStore.applicationStore.alertService.setActionAlertInfo({
            message: `Change detection engine failed to build hashes index for workspace after syncing`,
            prompt:
              'To fix this, you can either try to keep refreshing local changes until success or trust and reuse current workspace hashes index',
            type: ActionAlertType.CAUTION,
            actions: [
              {
                label: 'Use local hashes index',
                type: ActionAlertActionType.PROCEED_WITH_CAUTION,
                handler: (): void => {
                  this.editorStore.changeDetectionState.workspaceLocalLatestRevisionState.setEntityHashesIndex(
                    currentHashesIndex,
                  );
                  this.editorStore.changeDetectionState.workspaceLocalLatestRevisionState.setIsBuildingEntityHashesIndex(
                    false,
                  );
                },
              },
              {
                label: 'Refresh changes',
                type: ActionAlertActionType.STANDARD,
                default: true,
                handler: this.editorStore.applicationStore.guardUnhandledError(
                  () => flowResult(this.refreshLocalChanges()),
                ),
              },
            ],
          });
        } else {
          throw error;
        }
      }
      yield flowResult(this.restartChangeDetection());
      this.editorStore.applicationStore.logService.info(
        LogEvent.create(
          LEGEND_STUDIO_APP_EVENT.CHANGE_DETECTION_RESTART__SUCCESS,
        ),
        Date.now() - syncFinishedTime,
        'ms',
      );
      // ======= FINISHED (RE)START CHANGE DETECTION =======
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      if (
        error instanceof NetworkClientError &&
        error.response.status === HttpStatus.CONFLICT
      ) {
        // NOTE: a confict here indicates that the reference revision ID sent along with update call
        // does not match the HEAD of the workspace, therefore, we need to prompt user to refresh the application
        this.editorStore.applicationStore.notificationService.notifyWarning(
          'Syncing failed. Current workspace revision is not the latest. Please backup your work and refresh the application',
        );
        // TODO: maybe we should do more here, e.g. prompt the user to download the patch, but that is for later
      } else {
        this.editorStore.applicationStore.notificationService.notifyError(
          error,
        );
      }
    } finally {
      this.pushChangesState.complete();
    }
  }
}

export class FormLocalChangesState extends LocalChangesState {
  constructor(editorStore: EditorStore, sdlcState: EditorSDLCState) {
    super(editorStore, sdlcState);
    makeObservable(this, {
      openPotentialWorkspacePullConflict: action,
    });
  }
  openLocalChange(diff: EntityDiff): void {
    const fromEntityGetter = (
      entityPath: string | undefined,
    ): Entity | undefined => {
      if (entityPath) {
        return this.editorStore.changeDetectionState.workspaceLocalLatestRevisionState.entities.find(
          (e) => e.path === entityPath,
        );
      }
      return undefined;
    };
    const toEntityGetter = (
      entityPath: string | undefined,
    ): Entity | undefined => {
      if (!entityPath) {
        return undefined;
      }
      const element =
        this.editorStore.graphManagerState.graph.getNullableElement(entityPath);
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
    };
    const fromEntity = EntityDiff.shouldOldEntityExist(diff)
      ? guaranteeNonNullable(
          fromEntityGetter(diff.getValidatedOldPath()),
          `Can't find entity with path '${diff.oldPath}'`,
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
        SPECIAL_REVISION_ALIAS.WORKSPACE_HEAD,
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

  openWorkspacePullChange(diff: EntityDiff): void {
    const fromEntityGetter = (
      entityPath: string | undefined,
    ): Entity | undefined => {
      if (entityPath) {
        return this.editorStore.changeDetectionState.workspaceLocalLatestRevisionState.entities.find(
          (e) => e.path === entityPath,
        );
      }
      return undefined;
    };
    const toEntityGetter = (
      entityPath: string | undefined,
    ): Entity | undefined => {
      if (entityPath) {
        return this.editorStore.changeDetectionState.workspaceRemoteLatestRevisionState.entities.find(
          (e) => e.path === entityPath,
        );
      }
      return undefined;
    };
    const fromEntity = EntityDiff.shouldOldEntityExist(diff)
      ? guaranteeNonNullable(
          fromEntityGetter(diff.getValidatedOldPath()),
          `Can't find entity with path '${diff.oldPath}'`,
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
        SPECIAL_REVISION_ALIAS.LOCAL,
        SPECIAL_REVISION_ALIAS.WORKSPACE_HEAD,
        diff.oldPath,
        diff.newPath,
        fromEntity,
        toEntity,
        fromEntityGetter,
        toEntityGetter,
      ),
    );
  }

  openPotentialWorkspacePullConflict(conflict: EntityChangeConflict): void {
    const baseEntityGetter = (
      entityPath: string | undefined,
    ): Entity | undefined =>
      entityPath
        ? this.editorStore.changeDetectionState.workspaceLocalLatestRevisionState.entities.find(
            (e) => e.path === entityPath,
          )
        : undefined;
    const currentChangeEntityGetter = (
      entityPath: string | undefined,
    ): Entity | undefined =>
      entityPath
        ? this.editorStore.graphManagerState.graph.allOwnElements
            .map((element) =>
              this.editorStore.graphManagerState.graphManager.elementToEntity(
                element,
              ),
            )
            .find((e) => e.path === entityPath)
        : undefined;
    const incomingChangeEntityGetter = (
      entityPath: string | undefined,
    ): Entity | undefined =>
      entityPath
        ? this.editorStore.changeDetectionState.workspaceRemoteLatestRevisionState.entities.find(
            (e) => e.path === entityPath,
          )
        : undefined;
    const conflictEditorState = new EntityChangeConflictEditorState(
      this.editorStore,
      this.editorStore.conflictResolutionState,
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
    conflictEditorState.setReadOnly(true);
    this.editorStore.tabManagerState.openTab(conflictEditorState);
  }

  *refreshLocalChanges(): GeneratorFn<void> {
    const startTime = Date.now();
    this.refreshLocalChangesDetectorState.inProgress();
    try {
      // ======= (RE)START CHANGE DETECTION =======
      this.editorStore.changeDetectionState.stop();
      yield Promise.all([
        this.sdlcState.buildWorkspaceLatestRevisionEntityHashesIndex(),
        this.editorStore.changeDetectionState.preComputeGraphElementHashes(),
      ]);
      this.editorStore.changeDetectionState.start();
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
    } finally {
      this.refreshLocalChangesDetectorState.complete();
    }
  }

  *processConflicts(): GeneratorFn<void> {
    try {
      const isInConflictResolutionMode = (yield flowResult(
        this.sdlcState.checkIfCurrentWorkspaceIsInConflictResolutionMode(),
      )) as boolean;
      if (isInConflictResolutionMode) {
        this.editorStore.applicationStore.alertService.setBlockingAlert({
          message: 'Workspace is in conflict resolution mode',
          prompt: 'Please refresh the application',
        });
        return;
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyWarning(
        'Failed to check if current workspace is in conflict resolution mode',
      );
      return;
    }
  }

  /**
   * Get entitiy changes to prepare for syncing
   */
  computeLocalEntityChanges(): EntityChange[] {
    const baseHashesIndex = this.editorStore.isInConflictResolutionMode
      ? this.editorStore.changeDetectionState
          .conflictResolutionHeadRevisionState.entityHashesIndex
      : this.editorStore.changeDetectionState.workspaceLocalLatestRevisionState
          .entityHashesIndex;
    const originalPaths = new Set(Array.from(baseHashesIndex.keys()));
    const entityChanges: EntityChange[] = [];
    this.editorStore.graphManagerState.graph.allOwnElements.forEach(
      (element) => {
        const elementPath = element.path;
        if (baseHashesIndex.get(elementPath) !== element.hashCode) {
          const entity =
            this.editorStore.graphManagerState.graphManager.elementToEntity(
              element,
              {
                pruneSourceInformation: true,
              },
            );
          entityChanges.push({
            classifierPath: entity.classifierPath,
            entityPath: element.path,
            content: entity.content,
            type:
              baseHashesIndex.get(elementPath) !== undefined
                ? EntityChangeType.MODIFY
                : EntityChangeType.CREATE,
          });
        }
        originalPaths.delete(elementPath);
      },
    );
    Array.from(originalPaths).forEach((path) => {
      entityChanges.push({
        type: EntityChangeType.DELETE,
        entityPath: path,
      });
    });
    return entityChanges;
  }

  getCurrentHashIndexes(): Map<string, string> {
    return this.editorStore.changeDetectionState.snapshotLocalEntityHashesIndex();
  }

  stopChangeDetection(): void {
    this.editorStore.changeDetectionState.stop();
  }

  *restartChangeDetection(): GeneratorFn<void> {
    yield this.editorStore.changeDetectionState.preComputeGraphElementHashes();
    this.editorStore.changeDetectionState.start();
    yield Promise.all([
      this.editorStore.changeDetectionState.computeAggregatedWorkspaceChanges(
        true,
      ),
    ]);
  }
}

export class TextLocalChangesState extends LocalChangesState {
  localChanges: EntityChange[] = [];

  constructor(editorStore: EditorStore, sdlcState: EditorSDLCState) {
    super(editorStore, sdlcState);
    makeObservable(this, {
      setLocalChanges: action,
    });
  }

  setLocalChanges(val: EntityChange[]): void {
    this.localChanges = val;
  }

  *refreshLocalChanges(): GeneratorFn<void> {
    this.refreshLocalChangesDetectorState.inProgress();
    try {
      yield Promise.all([
        this.sdlcState.buildWorkspaceLatestRevisionEntityHashesIndex(),
        this.editorStore.changeDetectionState.preComputeGraphElementHashes(),
      ]);
      this.editorStore.changeDetectionState.computeLocalChangesInTextMode(
        this.editorStore.changeDetectionState.workspaceLocalLatestRevisionState
          .entities,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.sdlcState.handleChangeDetectionRefreshIssue(error);
    } finally {
      this.refreshLocalChangesDetectorState.complete();
    }
  }

  *processConflicts(): GeneratorFn<void> {
    return;
  }

  getCurrentHashIndexes(): Map<string, string> {
    return this.editorStore.changeDetectionState
      .workspaceLocalLatestRevisionState.currentEntityHashesIndex;
  }

  stopChangeDetection(): void {
    this.localChanges = [];
  }

  computeLocalEntityChanges(): EntityChange[] {
    return this.localChanges;
  }

  *restartChangeDetection(): GeneratorFn<void> {
    this.editorStore.changeDetectionState.computeLocalChangesInTextMode(
      this.editorStore.changeDetectionState.workspaceLocalLatestRevisionState
        .entities,
    );
  }
}
