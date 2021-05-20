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
import type { EditorSdlcState } from '../EditorSdlcState';
import { CORE_LOG_EVENT } from '../../utils/Logger';
import { Review, ReviewState } from '../../models/sdlc/models/review/Review';
import type { Revision } from '../../models/sdlc/models/revision/Revision';
import { RevisionAlias } from '../../models/sdlc/models/revision/Revision';
import type { GeneratorFn, PlainObject } from '@finos/legend-studio-shared';
import {
  assertErrorThrown,
  assertNonNullable,
  guaranteeNonNullable,
} from '@finos/legend-studio-shared';
import { ActionAlertActionType } from '../ApplicationStore';
import { EntityDiff } from '../../models/sdlc/models/comparison/EntityDiff';
import type { Entity } from '../../models/sdlc/models/entity/Entity';
import { EntityDiffViewState } from '../editor-state/entity-diff-editor-state/EntityDiffViewState';
import { SPECIAL_REVISION_ALIAS } from '../editor-state/entity-diff-editor-state/EntityDiffEditorState';
import { generateSetupRoute } from '../Router';

export class WorkspaceReviewState {
  editorStore: EditorStore;
  sdlcState: EditorSdlcState;
  reviewTitle = '';
  isUpdatingWorkspace = false;
  isRefreshingWorkspaceUpdater = false;
  committedReviewsBetweenWorkspaceBaseAndProjectLatest: Review[] = [];
  workspaceReview?: Review;
  isFetchingCurrentWorkspaceReview = false;
  isRefreshingWorkspaceChangesDetector = false;
  isClosingWorkspaceReview = false;
  isCreatingWorkspaceReview = false;
  isCommittingWorkspaceReview = false;
  isRecreatingWorkspaceAfterCommittingReview = false;

  constructor(editorStore: EditorStore, sdlcState: EditorSdlcState) {
    makeAutoObservable(this, {
      editorStore: false,
      sdlcState: false,
      setReviewTitle: action,
      openReviewChange: action,
    });

    this.editorStore = editorStore;
    this.sdlcState = sdlcState;
  }

  setReviewTitle = (val: string): void => {
    this.reviewTitle = val;
  };

  openReviewChange(diff: EntityDiff): void {
    const fromEntityGetter = (
      entityPath: string | undefined,
    ): Entity | undefined =>
      entityPath
        ? this.editorStore.changeDetectionState.workspaceBaseRevisionState.entities.find(
            (e) => e.path === entityPath,
          )
        : undefined;
    const toEntityGetter = (
      entityPath: string | undefined,
    ): Entity | undefined =>
      entityPath
        ? this.editorStore.changeDetectionState.workspaceLatestRevisionState.entities.find(
            (e) => e.path === entityPath,
          )
        : undefined;
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
        this.editorStore.changeDetectionState.computeAggregatedProjectLatestChanges(
          true,
        ),
        this.editorStore.changeDetectionState.computeAggregatedWorkspaceChanges(
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
    } finally {
      this.isRefreshingWorkspaceChangesDetector = false;
    }
  });

  *fetchCurrentWorkspaceReview(): GeneratorFn<void> {
    try {
      this.isFetchingCurrentWorkspaceReview = true;
      const currentWorkspaceRevision =
        (yield this.sdlcState.sdlcClient.getRevision(
          this.sdlcState.currentProjectId,
          this.sdlcState.currentWorkspaceId,
          RevisionAlias.CURRENT,
        )) as Revision;
      const reviews = (yield this.sdlcState.sdlcClient.getReviews(
        this.sdlcState.currentProjectId,
        ReviewState.OPEN,
        [currentWorkspaceRevision.id, currentWorkspaceRevision.id],
        undefined,
        undefined,
        1,
      )) as Review[];
      const review = reviews.find(
        (r) => r.workspaceId === this.sdlcState.currentWorkspaceId,
      ) as PlainObject<Review> | undefined;
      if (reviews.length) {
        try {
          assertNonNullable(
            review,
            `Opened review associated with HEAD revision '${currentWorkspaceRevision.id}' of workspace '${this.sdlcState.currentWorkspaceId}' found, but the retrieved review does not belong to the workspace`,
          );
        } catch (error: unknown) {
          assertErrorThrown(error);
          this.editorStore.applicationStore.notifyWarning(error.message);
        }
      }
      this.workspaceReview = review
        ? Review.serialization.fromJson(review)
        : undefined;
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
      this.sdlcState.handleChangeDetectionRefreshIssue(error);
    } finally {
      this.isFetchingCurrentWorkspaceReview = false;
    }
  }

  recreateWorkspaceAfterCommittingReview = flow(function* (
    this: WorkspaceReviewState,
  ) {
    try {
      this.isRecreatingWorkspaceAfterCommittingReview = true;
      this.editorStore.setBlockingAlert({
        message: 'Re-creating new workspace...',
        prompt: 'Please do not close the application',
        showLoading: true,
      });
      yield this.sdlcState.sdlcClient.createWorkspace(
        this.sdlcState.currentProjectId,
        this.sdlcState.currentWorkspaceId,
      );
      window.location.reload();
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
        error,
      );
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
      yield this.sdlcState.sdlcClient.rejectReview(
        this.sdlcState.currentProjectId,
        this.workspaceReview.id,
      );
      this.workspaceReview = undefined;
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isClosingWorkspaceReview = false;
    }
  });

  /**
   * Below functions will be specific to properties on the project such as reviews, tags, etc..
   */
  createWorkspaceReview = flow(function* (
    this: WorkspaceReviewState,
    title: string,
    description?: string,
  ) {
    this.isCreatingWorkspaceReview = true;
    try {
      this.workspaceReview = Review.serialization.fromJson(
        yield this.sdlcState.sdlcClient.createReview(
          this.sdlcState.currentProjectId,
          {
            workspaceId: this.sdlcState.currentWorkspaceId,
            title,
            description: description ?? '',
          },
        ),
      );
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isCreatingWorkspaceReview = false;
    }
  });

  commitWorkspaceReview = flow(function* (
    this: WorkspaceReviewState,
    review: Review,
  ) {
    this.isCommittingWorkspaceReview = true;

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

    try {
      yield this.sdlcState.sdlcClient.commitReview(
        this.sdlcState.currentProjectId,
        review.id,
        { message: `${review.title} [review]` },
      );
      this.editorStore.setActionAltertInfo({
        message: 'Committed review successfully',
        prompt:
          'You can create a new workspace with the same name or leave for the start page',
        onEnter: (): void => this.editorStore.setBlockGlobalHotkeys(true),
        onClose: (): void => this.editorStore.setBlockGlobalHotkeys(false),
        actions: [
          {
            label: 'Create new workspace',
            handler: (): Promise<void> =>
              this.recreateWorkspaceAfterCommittingReview(),
            type: ActionAlertActionType.PROCEED,
          },
          {
            label: 'Leave',
            type: ActionAlertActionType.PROCEED,
            handler: (): void =>
              this.editorStore.applicationStore.historyApiClient.push(
                generateSetupRoute(
                  this.editorStore.applicationStore.config.sdlcServerKey,
                  this.editorStore.sdlcState.currentProjectId,
                ),
              ),
            default: true,
          },
        ],
      });
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isCommittingWorkspaceReview = false;
    }
  });
}
