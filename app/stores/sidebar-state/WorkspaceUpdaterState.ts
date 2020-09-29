/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { EditorStore } from 'Stores/EditorStore';
import { EditorSdlcState } from 'Stores/EditorSdlcState';
import { observable, flow, action } from 'mobx';
import { sdlcClient } from 'API/SdlcClient';
import { WORKSPACE_UPDATE_REPORT_STATUS, WorkspaceUpdateReport } from 'SDLC/workspace/WorkspaceUpdateReport';
import { Log, LOG_EVENT } from 'Utilities/Logger';
import { Revision, RevisionAlias } from 'SDLC/revision/Revision';
import { deserialize } from 'serializr';
import { Review, ReviewState } from 'SDLC/review/Review';
import { EntityDiff } from 'SDLC/comparison/EntityDiff';
import { Entity } from 'SDLC/entity/Entity';
import { guaranteeNonNullable, getNullableFirstElement } from 'Utilities/GeneralUtil';
import { EntityDiffViewState } from 'Stores/editor-state/entity-diff-editor-state/EntityDiffViewState';
import { SPECIAL_REVISION_ALIAS } from 'Stores/editor-state/entity-diff-editor-state/EntityDiffEditorState';
import { EntityChangeConflict } from 'SDLC/entity/EntityChangeConflict';
import { EntityChangeConflictEditorState } from 'Stores/editor-state/entity-diff-editor-state/EntityChangeConflictEditorState';
import { NetworkClientError, HttpStatus } from 'API/NetworkClient';

export class WorkspaceUpdaterState {
  editorStore: EditorStore;
  sdlcState: EditorSdlcState;
  @observable isUpdatingWorkspace = false;
  @observable isRefreshingWorkspaceUpdater = false;
  @observable committedReviewsBetweenWorkspaceBaseAndProjectLatest: Review[] = [];

  constructor(editorStore: EditorStore, sdlcState: EditorSdlcState) {
    this.editorStore = editorStore;
    this.sdlcState = sdlcState;
  }

  @action openProjectLatestChange(diff: EntityDiff): void {
    const fromEntityGetter = (entityPath: string | undefined): Entity | undefined => entityPath ? this.editorStore.changeDetectionState.workspaceBaseRevisionState.entities.find(e => e.path === entityPath) : undefined;
    const toEntityGetter = (entityPath: string | undefined): Entity | undefined => entityPath ? this.editorStore.changeDetectionState.projectLatestRevisionState.entities.find(e => e.path === entityPath) : undefined;
    const fromEntity = EntityDiff.shouldOldEntityExist(diff) ? guaranteeNonNullable(fromEntityGetter(diff.getValidatedOldPath()), `Can't find element entity '${diff.oldPath}'`) : undefined;
    const toEntity = EntityDiff.shouldNewEntityExist(diff) ? guaranteeNonNullable(toEntityGetter(diff.getValidatedNewPath()), `Can't find element entity '${diff.newPath}'`) : undefined;
    this.editorStore.openEntityDiff(new EntityDiffViewState(this.editorStore,
      SPECIAL_REVISION_ALIAS.WORKSPACE_BASE, SPECIAL_REVISION_ALIAS.PROJECT_HEAD,
      diff.oldPath, diff.newPath, fromEntity, toEntity, fromEntityGetter, toEntityGetter
    ));
  }

  @action openPotentialWorkspaceUpdateConflict(conflict: EntityChangeConflict): void {
    const baseEntityGetter = (entityPath: string | undefined): Entity | undefined => entityPath ? this.editorStore.changeDetectionState.workspaceBaseRevisionState.entities.find(e => e.path === entityPath) : undefined;
    const currentChangeEntityGetter = (entityPath: string | undefined): Entity | undefined => entityPath ? this.editorStore.changeDetectionState.workspaceLatestRevisionState.entities.find(e => e.path === entityPath) : undefined;
    const incomingChangeEntityGetter = (entityPath: string | undefined): Entity | undefined => entityPath ? this.editorStore.changeDetectionState.projectLatestRevisionState.entities.find(e => e.path === entityPath) : undefined;
    const conflictEditorState = new EntityChangeConflictEditorState(this.editorStore, conflict.entityPath,
      SPECIAL_REVISION_ALIAS.WORKSPACE_BASE, SPECIAL_REVISION_ALIAS.WORKSPACE_HEAD, SPECIAL_REVISION_ALIAS.PROJECT_HEAD,
      baseEntityGetter(conflict.entityPath), currentChangeEntityGetter(conflict.entityPath), incomingChangeEntityGetter(conflict.entityPath),
      baseEntityGetter, currentChangeEntityGetter, incomingChangeEntityGetter
    );
    conflictEditorState.setReadOnly(true);
    this.editorStore.openEntityChangeConflict(conflictEditorState);
  }

  refreshWorkspaceUpdater = flow(function* (this: WorkspaceUpdaterState) {

    // check if the workspace is in conflict resolution mode
    try {
      const isInConflictResolutionMode = (yield this.sdlcState.checkIfCurrentWorkspaceIsInConflictResolutionMode()) as unknown as boolean;
      if (isInConflictResolutionMode) {
        this.editorStore.setBlockingAlert({ message: 'Workspace is in conflict resolution mode', prompt: 'Please refresh the application' });
        return;
      }
    } catch (error) {
      if (error instanceof NetworkClientError && error.response.status === HttpStatus.NOT_FOUND) {
        this.editorStore.setBlockingAlert({ message: 'Current project or workspace no longer exists', prompt: 'Please refresh the application' });
      } else {
        this.editorStore.applicationStore.notifyWarning('Failed to check if current workspace is in conflict resolution mode');
      }
      return;
    }

    try {
      this.isRefreshingWorkspaceUpdater = true;
      this.sdlcState.isWorkspaceOutdated = (yield sdlcClient.isWorkspaceOutdated(this.sdlcState.currentProjectId, this.sdlcState.currentWorkspaceId)) as unknown as boolean;

      if (!this.sdlcState.isWorkspaceOutdated) {
        this.editorStore.changeDetectionState.setAggregatedProjectLatestChanges([]);
        this.committedReviewsBetweenWorkspaceBaseAndProjectLatest = [];
        return; // no need to do anything else if workspace is up to date
      }

      yield this.fetchLatestCommittedReviews();

      // ======= (RE)START CHANGE DETECTION =======
      const restartChangeDetectionStartTime = Date.now();
      this.editorStore.changeDetectionState.stop();
      yield Promise.all([
        this.sdlcState.buildProjectLatestRevisionEntityHashesIndex(),
        this.sdlcState.buildWorkspaceBaseRevisionEntityHashesIndex(),
      ]);
      this.editorStore.changeDetectionState.start();
      yield Promise.all([
        this.editorStore.changeDetectionState.computeLocalChanges(true),
        this.editorStore.changeDetectionState.computeAggregatedProjectLatestChanges(true),
        this.editorStore.changeDetectionState.computeAggregatedWorkspaceChanges(true),
      ]);
      Log.info(LOG_EVENT.CHANGE_DETECTION_RESTARTED, Date.now() - restartChangeDetectionStartTime, 'ms');
      // ======= FINISHED (RE)START CHANGE DETECTION =======

    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
      this.sdlcState.handleChangeDetectionRefreshIssue(error);
    } finally {
      this.isRefreshingWorkspaceUpdater = false;
    }
  });

  updateWorkspace = flow(function* (this: WorkspaceUpdaterState) {
    if (this.isUpdatingWorkspace) { return }
    const startTime = Date.now();

    // TODO: we might need to check if the workspace is up-to-date before allowing update

    // check if the workspace is in conflict resolution mode
    try {
      const isInConflictResolutionMode = (yield this.sdlcState.checkIfCurrentWorkspaceIsInConflictResolutionMode()) as unknown as boolean;
      if (isInConflictResolutionMode) {
        this.editorStore.setBlockingAlert({ message: 'Workspace is in conflict resolution mode', prompt: 'Please refresh the application' });
        return;
      }
    } catch (error) {
      this.editorStore.applicationStore.notifyWarning('Failed to check if current workspace is in conflict resolution mode');
      return;
    }

    this.isUpdatingWorkspace = true;
    try {
      this.editorStore.setBlockingAlert({ message: 'Updating workspace...', prompt: 'Please do not close the application', showLoading: true });
      const workspaceUpdateReport = (yield sdlcClient.updateWorkspace(this.sdlcState.currentProjectId, this.sdlcState.currentWorkspaceId)) as unknown as WorkspaceUpdateReport;
      Log.info(LOG_EVENT.SDLC_UPDATE_WORKSPACE, Date.now() - startTime, 'ms');
      this.sdlcState.isWorkspaceOutdated = false;
      switch (workspaceUpdateReport.status) {
        // TODO: we might want to handle the situation more gracefully rather than just reloading the page
        case WORKSPACE_UPDATE_REPORT_STATUS.CONFLICT:
        case WORKSPACE_UPDATE_REPORT_STATUS.UPDATED: window.location.reload(); break;
        case WORKSPACE_UPDATE_REPORT_STATUS.NO_OP:
        default: break;
      }
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.editorStore.setBlockingAlert(undefined);
      this.isUpdatingWorkspace = false;
    }
  });

  /**
   * Fetch committed reviews between workspace base and project latest
   */
  fetchLatestCommittedReviews = flow(function* (this: WorkspaceUpdaterState) {
    try {
      // we find the review associated with the workspace base, this usually exist, except in 2 cases:
      // 1. the revision is somehow directly added to the branch by the user (in the case of git, user unprotected master and directly pushed to master)
      // 2. the revision is the merged/comitted review revision (this usually happens for prototype projects where fast forwarding merging is not default)
      // in those case, we will get the time from the base revision
      const workspaceBaseRevision = deserialize(Revision, (yield sdlcClient.getRevision(this.sdlcState.currentProjectId, this.sdlcState.currentWorkspaceId, RevisionAlias.BASE)) as unknown as Revision);
      let baseReview = getNullableFirstElement((yield sdlcClient.getReviews(this.sdlcState.currentProjectId, ReviewState.COMMITTED, [workspaceBaseRevision.id], undefined, undefined, 1)) as unknown as Review[]);
      baseReview = baseReview ? deserialize(Review, baseReview) : undefined;
      const reviews = (yield sdlcClient.getReviews(this.sdlcState.currentProjectId, ReviewState.COMMITTED, undefined, baseReview ? baseReview.committedAt : workspaceBaseRevision.committedAt, undefined, undefined)) as unknown as Review[];
      this.committedReviewsBetweenWorkspaceBaseAndProjectLatest = reviews.map(review => deserialize(Review, review))
        .filter(review => !baseReview || review.id !== baseReview.id); // make sure to exclude the base review
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    }
  });
}
