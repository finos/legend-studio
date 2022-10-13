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

import { action, makeAutoObservable, flowResult } from 'mobx';
import type { EditorStore } from '../EditorStore.js';
import type { EditorSDLCState } from '../EditorSDLCState.js';
import { CHANGE_DETECTION_EVENT } from '../ChangeDetectionEvent.js';
import { LEGEND_STUDIO_APP_EVENT } from '../LegendStudioAppEvent.js';
import {
  type GeneratorFn,
  type PlainObject,
  LogEvent,
  assertErrorThrown,
  assertNonNullable,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { EntityDiffViewState } from '../editor-state/entity-diff-editor-state/EntityDiffViewState.js';
import { SPECIAL_REVISION_ALIAS } from '../editor-state/entity-diff-editor-state/EntityDiffEditorState.js';
import { generateSetupRoute } from '../LegendStudioRouter.js';
import type { Entity } from '@finos/legend-storage';
import {
  type Revision,
  EntityDiff,
  Review,
  ReviewState,
  RevisionAlias,
} from '@finos/legend-server-sdlc';
import { ActionAlertActionType } from '@finos/legend-application';

export class WorkspaceReviewState {
  editorStore: EditorStore;
  sdlcState: EditorSDLCState;
  reviewTitle = '';
  committedReviewsBetweenWorkspaceBaseAndProjectLatest: Review[] = [];
  workspaceReview?: Review | undefined;

  isUpdatingWorkspace = false;
  isRefreshingWorkspaceUpdater = false;
  isFetchingCurrentWorkspaceReview = false;
  isRefreshingWorkspaceChangesDetector = false;
  isClosingWorkspaceReview = false;
  isCreatingWorkspaceReview = false;
  isCommittingWorkspaceReview = false;
  isRecreatingWorkspaceAfterCommittingReview = false;

  constructor(editorStore: EditorStore, sdlcState: EditorSDLCState) {
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
        ? this.editorStore.changeDetectionState.workspaceLocalLatestRevisionState.entities.find(
            (e) => e.path === entityPath,
          )
        : undefined;
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

  *refreshWorkspaceChanges(): GeneratorFn<void> {
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
        this.editorStore.changeDetectionState.computeAggregatedProjectLatestChanges(
          true,
        ),
        this.editorStore.changeDetectionState.computeAggregatedWorkspaceChanges(
          true,
        ),
      ]);
      this.editorStore.applicationStore.log.info(
        LogEvent.create(CHANGE_DETECTION_EVENT.CHANGE_DETECTION_RESTARTED),
        Date.now() - startTime,
        'ms',
      );
      // ======= FINISHED (RE)START CHANGE DETECTION =======
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
      this.sdlcState.handleChangeDetectionRefreshIssue(error);
    } finally {
      this.isRefreshingWorkspaceChangesDetector = false;
    }
  }

  *fetchCurrentWorkspaceReview(): GeneratorFn<void> {
    try {
      this.isFetchingCurrentWorkspaceReview = true;
      const currentWorkspaceRevision =
        (yield this.editorStore.sdlcServerClient.getRevision(
          this.sdlcState.activeProject.projectId,
          this.sdlcState.activeWorkspace,
          RevisionAlias.CURRENT,
        )) as Revision;
      const reviews = (yield this.editorStore.sdlcServerClient.getReviews(
        this.sdlcState.activeProject.projectId,
        ReviewState.OPEN,
        [currentWorkspaceRevision.id, currentWorkspaceRevision.id],
        undefined,
        undefined,
        1,
      )) as Review[];
      const review = reviews.find(
        (r) =>
          r.workspaceId === this.sdlcState.activeWorkspace.workspaceId &&
          r.workspaceType === this.sdlcState.activeWorkspace.workspaceType,
      ) as PlainObject<Review> | undefined;
      if (reviews.length) {
        try {
          assertNonNullable(
            review,
            `Opened review associated with HEAD revision '${currentWorkspaceRevision.id}' of workspace '${this.sdlcState.activeWorkspace.workspaceType}' found, but the retrieved review does not belong to the workspace`,
          );
        } catch (error) {
          assertErrorThrown(error);
          this.editorStore.applicationStore.notifyWarning(error.message);
        }
      }
      this.workspaceReview = review
        ? Review.serialization.fromJson(review)
        : undefined;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
      this.sdlcState.handleChangeDetectionRefreshIssue(error);
    } finally {
      this.isFetchingCurrentWorkspaceReview = false;
    }
  }

  *recreateWorkspaceAfterCommittingReview(): GeneratorFn<void> {
    try {
      this.isRecreatingWorkspaceAfterCommittingReview = true;
      this.editorStore.applicationStore.setBlockingAlert({
        message: 'Recreating workspace...',
        prompt: 'Please do not close the application',
        showLoading: true,
      });
      yield this.editorStore.sdlcServerClient.createWorkspace(
        this.sdlcState.activeProject.projectId,
        this.sdlcState.activeWorkspace.workspaceId,
        this.sdlcState.activeWorkspace.workspaceType,
      );
      this.editorStore.applicationStore.navigator.reload({
        ignoreBlocking: true,
      });
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.editorStore.applicationStore.setBlockingAlert(undefined);
      this.isRecreatingWorkspaceAfterCommittingReview = false;
    }
  }

  *closeWorkspaceReview(): GeneratorFn<void> {
    if (!this.workspaceReview) {
      return;
    }
    this.isClosingWorkspaceReview = true;
    try {
      yield this.editorStore.sdlcServerClient.rejectReview(
        this.sdlcState.activeProject.projectId,
        this.workspaceReview.id,
      );
      this.workspaceReview = undefined;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isClosingWorkspaceReview = false;
    }
  }

  /**
   * Below functions will be specific to properties on the project such as reviews, tags, etc..
   */
  *createWorkspaceReview(
    title: string,
    reviewDescription?: string,
  ): GeneratorFn<void> {
    // NOTE: We will only allow having dependencies on snapshots in workspace, not in project
    // Therefore, we block creation of review and committing review containing a change
    // in dependency on snapshot versions
    if (
      this.editorStore.projectConfigurationEditorState
        .containsSnapshotDependencies
    ) {
      this.editorStore.applicationStore.notifyWarning(
        `Can't create review: workspace contains snapshot dependencies`,
      );
      return;
    }

    this.isCreatingWorkspaceReview = true;
    try {
      const description =
        reviewDescription ??
        `review from ${this.editorStore.applicationStore.config.appName} for workspace ${this.sdlcState.activeWorkspace.workspaceId}`;
      this.workspaceReview = Review.serialization.fromJson(
        (yield this.editorStore.sdlcServerClient.createReview(
          this.sdlcState.activeProject.projectId,
          {
            workspaceId: this.sdlcState.activeWorkspace.workspaceId,
            title,
            workspaceType: this.sdlcState.activeWorkspace.workspaceType,
            description,
          },
        )) as PlainObject<Review>,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isCreatingWorkspaceReview = false;
    }
  }

  *commitWorkspaceReview(review: Review): GeneratorFn<void> {
    // NOTE: We will only allow having dependencies on snapshots in workspace, not in project
    // Therefore, we block creation of review and committing review containing a change
    // in dependency on snapshot versions
    if (
      this.editorStore.projectConfigurationEditorState
        .containsSnapshotDependencies
    ) {
      this.editorStore.applicationStore.notifyWarning(
        `Can't commit review: workspace contains snapshot dependencies`,
      );
      return;
    }

    this.isCommittingWorkspaceReview = true;

    // check if the workspace is in conflict resolution mode
    try {
      const isInConflictResolutionMode = (yield flowResult(
        this.sdlcState.checkIfCurrentWorkspaceIsInConflictResolutionMode(),
      )) as boolean;
      if (isInConflictResolutionMode) {
        this.editorStore.applicationStore.setBlockingAlert({
          message: 'Workspace is in conflict resolution mode',
          prompt: 'Please refresh the application',
        });
        return;
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notifyWarning(
        'Failed to check if current workspace is in conflict resolution mode',
      );
      return;
    }

    try {
      yield this.editorStore.sdlcServerClient.commitReview(
        this.sdlcState.activeProject.projectId,
        review.id,
        { message: `${review.title} [review]` },
      );
      this.editorStore.applicationStore.setActionAlertInfo({
        message: 'Committed review successfully',
        prompt:
          'You can create a new workspace with the same name or leave for the start page',
        actions: [
          {
            label: 'Create new workspace',
            handler: this.editorStore.applicationStore.guardUnhandledError(() =>
              flowResult(this.recreateWorkspaceAfterCommittingReview()),
            ),
            type: ActionAlertActionType.PROCEED,
          },
          {
            label: 'Leave',
            type: ActionAlertActionType.PROCEED,
            handler: (): void => {
              this.editorStore.applicationStore.navigator.reloadToLocation(
                generateSetupRoute(
                  this.editorStore.sdlcState.activeProject.projectId,
                ),
                {
                  ignoreBlocking: true,
                },
              );
            },
            default: true,
          },
        ],
      });
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isCommittingWorkspaceReview = false;
    }
  }
}
