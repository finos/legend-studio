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
import { Log, LOG_EVENT } from 'Utilities/Logger';
import { deserialize } from 'serializr';
import { Review, ReviewState } from 'SDLC/review/Review';
import { RevisionAlias, Revision } from 'SDLC/revision/Revision';
import { assertNonNullable, guaranteeNonNullable } from 'Utilities/GeneralUtil';
import { ActionAlertActionType } from 'Stores/ApplicationStore';
import { EntityDiff } from 'SDLC/comparison/EntityDiff';
import { Entity } from 'SDLC/entity/Entity';
import { EntityDiffViewState } from 'Stores/editor-state/entity-diff-editor-state/EntityDiffViewState';
import { SPECIAL_REVISION_ALIAS } from 'Stores/editor-state/entity-diff-editor-state/EntityDiffEditorState';
import { getSetupRoute } from 'Stores/RouterConfig';

export class WorkspaceReviewState {
  editorStore: EditorStore;
  sdlcState: EditorSdlcState;
  @observable reviewTitle = '';
  @observable isUpdatingWorkspace = false;
  @observable isRefreshingWorkspaceUpdater = false;
  @observable committedReviewsBetweenWorkspaceBaseAndProjectLatest: Review[] = [];
  @observable workspaceReview?: Review;
  @observable isFetchingCurrentWorkspaceReview = false;
  @observable isRefreshingWorkspaceChangesDetector = false;
  @observable isClosingWorkspaceReview = false;
  @observable isCreatingWorkspaceReview = false;
  @observable isCommittingWorkspaceReview = false;
  @observable isRecreatingWorkspaceAfterCommittingReview = false;

  constructor(editorStore: EditorStore, sdlcState: EditorSdlcState) {
    this.editorStore = editorStore;
    this.sdlcState = sdlcState;
  }

  @action setReviewTitle = (val: string): void => { this.reviewTitle = val }

  @action openReviewChange(diff: EntityDiff): void {
    const fromEntityGetter = (entityPath: string | undefined): Entity | undefined => entityPath ? this.editorStore.changeDetectionState.workspaceBaseRevisionState.entities.find(e => e.path === entityPath) : undefined;
    const toEntityGetter = (entityPath: string | undefined): Entity | undefined => entityPath ? this.editorStore.changeDetectionState.workspaceLatestRevisionState.entities.find(e => e.path === entityPath) : undefined;
    const fromEntity = EntityDiff.shouldOldEntityExist(diff) ? guaranteeNonNullable(fromEntityGetter(diff.getValidatedOldPath()), `Can't find element entity '${diff.oldPath}'`) : undefined;
    const toEntity = EntityDiff.shouldNewEntityExist(diff) ? guaranteeNonNullable(toEntityGetter(diff.getValidatedNewPath()), `Can't find element entity '${diff.newPath}'`) : undefined;
    this.editorStore.openEntityDiff(new EntityDiffViewState(this.editorStore,
      SPECIAL_REVISION_ALIAS.WORKSPACE_BASE, SPECIAL_REVISION_ALIAS.WORKSPACE_HEAD,
      diff.oldPath, diff.newPath, fromEntity, toEntity, fromEntityGetter, toEntityGetter
    ));
  }

  refreshWorkspaceChanges = flow(function* (this: WorkspaceReviewState) {
    const startTime = Date.now();
    this.isRefreshingWorkspaceChangesDetector = true;
    try {

      // ======= (RE)START CHANGE DETECTION =======
      this.editorStore.changeDetectionState.stop();
      yield Promise.all([
        this.sdlcState.buildWorkspaceLatestRevisionEntityHashesIndex(),
        this.sdlcState.buildWorkspaceBaseRevisionEntityHashesIndex(),
      ]);
      this.editorStore.changeDetectionState.start();
      yield Promise.all([
        this.editorStore.changeDetectionState.computeLocalChanges(true),
        this.editorStore.changeDetectionState.computeAggregatedProjectLatestChanges(true),
        this.editorStore.changeDetectionState.computeAggregatedWorkspaceChanges(true),
      ]);
      Log.info(LOG_EVENT.CHANGE_DETECTION_RESTARTED, Date.now() - startTime, 'ms');
      // ======= FINISHED (RE)START CHANGE DETECTION =======

    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
      this.sdlcState.handleChangeDetectionRefreshIssue(error);
    } finally {
      this.isRefreshingWorkspaceChangesDetector = false;
    }
  });

  fetchCurrentWorkspaceReview = flow(function* (this: WorkspaceReviewState) {
    try {
      this.isFetchingCurrentWorkspaceReview = true;
      const currentWorkspaceRevision = (yield sdlcClient.getRevision(this.sdlcState.currentProjectId, this.sdlcState.currentWorkspaceId, RevisionAlias.CURRENT)) as unknown as Revision;
      const reviews = (yield sdlcClient.getReviews(this.sdlcState.currentProjectId, ReviewState.OPEN, [currentWorkspaceRevision.id, currentWorkspaceRevision.id], undefined, undefined, 1)) as unknown as Review[];
      const review = reviews.find(r => r.workspaceId === this.sdlcState.currentWorkspaceId);
      if (reviews.length) {
        try {
          assertNonNullable(review, `Opened review associated with HEAD revision '${currentWorkspaceRevision.id}' of workspace '${this.sdlcState.currentWorkspaceId}' found, but the retrieved review does not belong to the workspace`);
        } catch (reviewNotInWorkspace) {
          this.editorStore.applicationStore.notifyWarning(reviewNotInWorkspace);
        }
      }
      this.workspaceReview = review ? deserialize(Review, review) : undefined;
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
      this.sdlcState.handleChangeDetectionRefreshIssue(error);
    } finally {
      this.isFetchingCurrentWorkspaceReview = false;
    }
  });

  recreateWorkspaceAfterCommittingReview = flow(function* (this: WorkspaceReviewState) {
    try {
      this.isRecreatingWorkspaceAfterCommittingReview = true;
      this.editorStore.setBlockingAlert({ message: 'Re-creating new workspace...', prompt: 'Please do not close the application', showLoading: true });
      yield sdlcClient.createWorkspace(this.sdlcState.currentProjectId, this.sdlcState.currentWorkspaceId);
      window.location.reload();
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.editorStore.setBlockingAlert(undefined);
      this.isRecreatingWorkspaceAfterCommittingReview = false;
    }
  });

  closeWorkspaceReview = flow(function* (this: WorkspaceReviewState) {
    if (!this.workspaceReview) {
      return;
    }
    this.isClosingWorkspaceReview = true;
    try {
      yield sdlcClient.rejectReview(this.sdlcState.currentProjectId, this.workspaceReview.id);
      this.workspaceReview = undefined;
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isClosingWorkspaceReview = false;
    }
  });

  /**
   * Below functions will be specific to properties on the project such as reviews, tags, etc..
   */
  createWorkspaceReview = flow(function* (this: WorkspaceReviewState, title: string, description?: string) {
    this.isCreatingWorkspaceReview = true;
    try {
      this.workspaceReview = deserialize(Review, (yield sdlcClient.createReview(this.sdlcState.currentProjectId, {
        workspaceId: this.sdlcState.currentWorkspaceId,
        title,
        description: description ?? ''
      })) as unknown as Review);
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isCreatingWorkspaceReview = false;
    }
  });

  commitWorkspaceReview = flow(function* (this: WorkspaceReviewState, review: Review) {
    this.isCommittingWorkspaceReview = true;

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

    try {
      yield sdlcClient.commitReview(this.sdlcState.currentProjectId, review.id, { message: `${review.title} [review]` });
      this.editorStore.setActionAltertInfo({
        message: 'Committed review successfully',
        prompt: 'You can create a new workspace with the same name or leave for the start page',
        onEnter: (): void => this.editorStore.setBlockGlobalHotkeys(true),
        onClose: (): void => this.editorStore.setBlockGlobalHotkeys(false),
        actions: [
          {
            label: 'Create new workspace',
            handler: (): Promise<void> => this.recreateWorkspaceAfterCommittingReview(),
            type: ActionAlertActionType.PROCEED,
          },
          {
            label: 'Leave',
            type: ActionAlertActionType.PROCEED,
            handler: (): void => this.editorStore.applicationStore.historyApiClient.push(getSetupRoute(this.editorStore.sdlcState.currentProjectId)),
            default: true,
          }
        ],
      });
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isCommittingWorkspaceReview = false;
    }
  });
}
