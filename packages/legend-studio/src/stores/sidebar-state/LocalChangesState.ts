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
import format from 'date-fns/format';
import type { EditorStore } from '../EditorStore';
import type { EditorSdlcState } from '../EditorSdlcState';
import { CORE_LOG_EVENT } from '../../utils/Logger';
import { Revision } from '../../models/sdlc/models/revision/Revision';
import { DATE_TIME_FORMAT } from '../../const';
import { TAB_SIZE } from '../EditorConfig';
import {
  assertErrorThrown,
  downloadFile,
  guaranteeNonNullable,
  ContentType,
  NetworkClientError,
  HttpStatus,
} from '@finos/legend-studio-shared';
import type { Entity } from '../../models/sdlc/models/entity/Entity';
import { ActionAlertType, ActionAlertActionType } from '../ApplicationStore';
import { EntityDiff } from '../../models/sdlc/models/comparison/EntityDiff';
import { EntityDiffViewState } from '../editor-state/entity-diff-editor-state/EntityDiffViewState';
import { SPECIAL_REVISION_ALIAS } from '../editor-state/entity-diff-editor-state/EntityDiffEditorState';

export class LocalChangesState {
  editorStore: EditorStore;
  sdlcState: EditorSdlcState;
  isSyncingWithWorkspace = false;
  isRefreshingLocalChangesDetector = false;

  constructor(editorStore: EditorStore, sdlcState: EditorSdlcState) {
    makeAutoObservable(this, {
      editorStore: false,
      sdlcState: false,
      openLocalChange: action,
    });

    this.editorStore = editorStore;
    this.sdlcState = sdlcState;
  }

  openLocalChange(diff: EntityDiff): void {
    const fromEntityGetter = (
      entityPath: string | undefined,
    ): Entity | undefined =>
      entityPath
        ? this.editorStore.changeDetectionState.workspaceLatestRevisionState.entities.find(
            (e) => e.path === entityPath,
          )
        : undefined;
    const toEntityGetter = (
      entityPath: string | undefined,
    ): Entity | undefined => {
      if (!entityPath) {
        return undefined;
      }
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

  refreshLocalChanges = flow(function* (this: LocalChangesState) {
    const startTime = Date.now();
    this.isRefreshingLocalChangesDetector = true;
    try {
      // ======= (RE)START CHANGE DETECTION =======
      this.editorStore.changeDetectionState.stop();
      yield Promise.all([
        this.sdlcState.buildWorkspaceLatestRevisionEntityHashesIndex(),
        this.editorStore.graphState.graph.precomputeHashes(
          this.editorStore.applicationStore.logger,
        ),
      ]);
      this.editorStore.changeDetectionState.start();
      yield this.editorStore.changeDetectionState.computeLocalChanges(true);
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
    } finally {
      this.isRefreshingLocalChangesDetector = false;
    }
  });

  downloadLocalChanges = (): void => {
    const fileName = `entityChanges_(${this.sdlcState.currentProject?.name}_${
      this.sdlcState.currentWorkspaceId
    })_${format(new Date(Date.now()), DATE_TIME_FORMAT)}.json`;
    const content = JSON.stringify(
      {
        message: '', // TODO?
        entityChanges: this.editorStore.graphState.computeLocalEntityChanges(),
        revisionId: this.sdlcState.currentRevisionId,
      },
      undefined,
      TAB_SIZE,
    );
    downloadFile(fileName, content, ContentType.APPLICATION_JSON);
  };

  syncWithWorkspace = flow(function* (
    this: LocalChangesState,
    syncMessage?: string,
  ) {
    if (
      this.isSyncingWithWorkspace ||
      this.editorStore.workspaceUpdaterState.isUpdatingWorkspace
    ) {
      return;
    }
    // check if the workspace is in conflict resolution mode
    try {
      const isInConflictResolutionMode =
        (yield this.sdlcState.checkIfCurrentWorkspaceIsInConflictResolutionMode()) as boolean;
      if (isInConflictResolutionMode) {
        this.editorStore.setBlockingAlert({
          message: 'Workspace is in conflict resolution mode',
          prompt: 'Please refresh the application',
        });
        return;
      }
    } catch (error: unknown) {
      this.editorStore.applicationStore.notifyWarning(
        'Failed to check if current workspace is in conflict resolution mode',
      );
      return;
    }

    const startTime = Date.now();
    const localChanges =
      this.editorStore.graphState.computeLocalEntityChanges();
    if (!localChanges.length) {
      return;
    }
    this.isSyncingWithWorkspace = true;
    const currentHashesIndex =
      this.editorStore.changeDetectionState.snapshotLocalEntityHashesIndex();
    try {
      const latestRevision = Revision.serialization.fromJson(
        yield this.sdlcState.sdlcClient.performEntityChanges(
          this.sdlcState.currentProjectId,
          this.sdlcState.currentWorkspaceId,
          {
            message:
              syncMessage ??
              `syncing with workspace from ${
                this.editorStore.applicationStore.config.appName
              } [potentially affected ${
                localChanges.length === 1
                  ? '1 entity'
                  : `${localChanges.length} entities`
              }]`,
            entityChanges: localChanges,
            revisionId: this.sdlcState.currentRevisionId,
          },
        ),
      );
      this.sdlcState.setCurrentRevision(latestRevision); // update current revision to the latest
      const syncFinishedTime = Date.now();

      this.editorStore.applicationStore.logger.info(
        CORE_LOG_EVENT.SDLC_SYNC_WORKSPACE,
        syncFinishedTime - startTime,
        'ms',
      );

      // ======= (RE)START CHANGE DETECTION =======
      this.editorStore.changeDetectionState.stop();
      try {
        /**
         * Here we try to rebuild local hash index. If failed, we will use local hash index, but for veracity, it's best to use entities
         * coming from the server.
         */
        const entities = (yield this.sdlcState.sdlcClient.getEntitiesByRevision(
          this.sdlcState.currentProjectId,
          this.sdlcState.currentWorkspaceId,
          latestRevision.id,
        )) as Entity[];
        this.editorStore.changeDetectionState.workspaceLatestRevisionState.setEntities(
          entities,
        );
        yield this.editorStore.changeDetectionState.workspaceLatestRevisionState.buildEntityHashesIndex(
          entities,
          CORE_LOG_EVENT.CHANGE_DETECTION_LOCAL_HASHES_INDEX_BUILT,
        );
        this.editorStore.refreshCurrentEntityDiffEditorState();
      } catch (error: unknown) {
        /**
         * NOTE: there is a known problem with the SDLC server where if we try to fetch the entities right after syncing, there is a chance
         * that we get entities from the older commit (i.e. potentially some caching issue). As such, to account for this case, we will
         * not try to get entities for the workspace HEAD, but for the revision returned from the syncing call (i.e. this must be the latest revision)
         * if we get a 404, we will do a refresh and warn user about this. Otherwise, if we get other types of error, we will assume this is a network
         * failure and use local workspace hashes index
         */
        if (error instanceof NetworkClientError) {
          if (error.response.status === HttpStatus.NOT_FOUND) {
            this.editorStore.applicationStore.logger.error(
              CORE_LOG_EVENT.SDLC_PROBLEM,
              `Can't fetch entities for the latest workspace revision immediately after syncing`,
              error,
            );
          }
          this.editorStore.setActionAltertInfo({
            message: `Change detection engine failed to build hashes index for workspace after syncing`,
            prompt:
              'To fix this, you can either try to keep refreshing local changes until success or trust and reuse current workspace hashes index',
            type: ActionAlertType.CAUTION,
            onEnter: (): void => this.editorStore.setBlockGlobalHotkeys(true),
            onClose: (): void => this.editorStore.setBlockGlobalHotkeys(false),
            actions: [
              {
                label: 'Use local hashes index',
                type: ActionAlertActionType.PROCEED_WITH_CAUTION,
                handler: (): void => {
                  this.editorStore.changeDetectionState.workspaceLatestRevisionState.setEntityHashesIndex(
                    currentHashesIndex,
                  );
                  this.editorStore.changeDetectionState.workspaceLatestRevisionState.setIsBuildingEntityHashesIndex(
                    false,
                  );
                },
              },
              {
                label: 'Refresh changes',
                type: ActionAlertActionType.STANDARD,
                default: true,
                handler: (): Promise<void> => this.refreshLocalChanges(),
              },
            ],
          });
        } else {
          throw error;
        }
      }
      yield this.editorStore.graphState.graph.precomputeHashes(
        this.editorStore.applicationStore.logger,
      );
      this.editorStore.changeDetectionState.start();
      yield Promise.all([
        this.editorStore.changeDetectionState.computeLocalChanges(true),
        this.editorStore.changeDetectionState.computeAggregatedWorkspaceChanges(
          true,
        ),
      ]);
      this.editorStore.applicationStore.logger.info(
        CORE_LOG_EVENT.CHANGE_DETECTION_RESTARTED,
        Date.now() - syncFinishedTime,
        'ms',
      );
      // ======= FINISHED (RE)START CHANGE DETECTION =======
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
        error,
      );
      if (
        error instanceof NetworkClientError &&
        error.response.status === HttpStatus.CONFLICT
      ) {
        // NOTE: a confict here indicates that the reference revision ID sent along with update call
        // does not match the HEAD of the workspace, therefore, we need to prompt user to refresh the application
        this.editorStore.applicationStore.notifyWarning(
          'Syncing failed. Current workspace revision is not the latest. Please backup your work and refresh the application',
        );
        // TODO: maybe we should do more here, e.g. prompt the user to download the patch, but that is for later
      } else {
        this.editorStore.applicationStore.notifyError(error);
      }
    } finally {
      this.isSyncingWithWorkspace = false;
    }
  });
}
