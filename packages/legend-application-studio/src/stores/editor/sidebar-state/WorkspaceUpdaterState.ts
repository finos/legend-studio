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

import type { EditorStore } from '../EditorStore.js';
import type { EditorSDLCState } from '../EditorSDLCState.js';
import { action, makeObservable, flowResult, observable, flow } from 'mobx';
import {
  type GeneratorFn,
  type PlainObject,
  LogEvent,
  assertErrorThrown,
  guaranteeNonNullable,
  NetworkClientError,
  HttpStatus,
} from '@finos/legend-shared';
import { EntityDiffViewState } from '../editor-state/entity-diff-editor-state/EntityDiffViewState.js';
import { SPECIAL_REVISION_ALIAS } from '../editor-state/entity-diff-editor-state/EntityDiffEditorState.js';
import { EntityChangeConflictEditorState } from '../editor-state/entity-diff-editor-state/EntityChangeConflictEditorState.js';
import type { Entity } from '@finos/legend-storage';
import {
  type EntityChangeConflict,
  type WorkspaceUpdateReport,
  WorkspaceUpdateReportStatus,
  EntityDiff,
  Review,
  ReviewState,
  Revision,
  RevisionAlias,
} from '@finos/legend-server-sdlc';
import { LEGEND_STUDIO_APP_EVENT } from '../../../__lib__/LegendStudioEvent.js';

export class WorkspaceUpdaterState {
  readonly editorStore: EditorStore;
  readonly sdlcState: EditorSDLCState;

  committedReviewsBetweenWorkspaceBaseAndProjectLatest: Review[] = [];
  isUpdatingWorkspace = false;
  isRefreshingWorkspaceUpdater = false;

  constructor(editorStore: EditorStore, sdlcState: EditorSDLCState) {
    makeObservable(this, {
      committedReviewsBetweenWorkspaceBaseAndProjectLatest: observable,
      isUpdatingWorkspace: observable,
      isRefreshingWorkspaceUpdater: observable,
      openProjectLatestChange: action,
      openPotentialWorkspaceUpdateConflict: action,
      refreshWorkspaceUpdater: flow,
      updateWorkspace: flow,
      fetchLatestCommittedReviews: flow,
    });

    this.editorStore = editorStore;
    this.sdlcState = sdlcState;
  }

  openProjectLatestChange(diff: EntityDiff): void {
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
        ? this.editorStore.changeDetectionState.projectLatestRevisionState.entities.find(
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
    this.editorStore.tabManagerState.openTab(
      new EntityDiffViewState(
        this.editorStore,
        SPECIAL_REVISION_ALIAS.WORKSPACE_BASE,
        SPECIAL_REVISION_ALIAS.PROJECT_HEAD,
        diff.oldPath,
        diff.newPath,
        fromEntity,
        toEntity,
        fromEntityGetter,
        toEntityGetter,
      ),
    );
  }

  openPotentialWorkspaceUpdateConflict(conflict: EntityChangeConflict): void {
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
        ? this.editorStore.changeDetectionState.projectLatestRevisionState.entities.find(
            (e) => e.path === entityPath,
          )
        : undefined;
    const conflictEditorState = new EntityChangeConflictEditorState(
      this.editorStore,
      this.editorStore.conflictResolutionState,
      conflict.entityPath,
      SPECIAL_REVISION_ALIAS.WORKSPACE_BASE,
      SPECIAL_REVISION_ALIAS.WORKSPACE_HEAD,
      SPECIAL_REVISION_ALIAS.PROJECT_HEAD,
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

  *refreshWorkspaceUpdater(): GeneratorFn<void> {
    // check if the workspace is in conflict resolution mode
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
      this.isRefreshingWorkspaceUpdater = true;
      this.sdlcState.isWorkspaceOutdated =
        (yield this.editorStore.sdlcServerClient.isWorkspaceOutdated(
          this.sdlcState.activeProject.projectId,
          this.sdlcState.activeWorkspace,
        )) as boolean;

      if (!this.sdlcState.isWorkspaceOutdated) {
        this.editorStore.changeDetectionState.setAggregatedProjectLatestChanges(
          [],
        );
        this.committedReviewsBetweenWorkspaceBaseAndProjectLatest = [];
        return; // no need to do anything else if workspace is up to date
      }

      yield flowResult(this.fetchLatestCommittedReviews());

      // ======= (RE)START CHANGE DETECTION =======
      const restartChangeDetectionStartTime = Date.now();
      this.editorStore.changeDetectionState.stop();
      yield Promise.all([
        this.sdlcState.buildProjectLatestRevisionEntityHashesIndex(),
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
      this.editorStore.applicationStore.logService.info(
        LogEvent.create(
          LEGEND_STUDIO_APP_EVENT.CHANGE_DETECTION_RESTART__SUCCESS,
        ),
        Date.now() - restartChangeDetectionStartTime,
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
      this.isRefreshingWorkspaceUpdater = false;
    }
  }

  *updateWorkspace(): GeneratorFn<void> {
    if (this.isUpdatingWorkspace) {
      return;
    }
    const startTime = Date.now();

    // TODO: we might need to check if the workspace is up-to-date before allowing update
    // check if the workspace is in conflict resolution mode
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

    this.isUpdatingWorkspace = true;
    try {
      this.editorStore.applicationStore.alertService.setBlockingAlert({
        message: 'Updating workspace...',
        prompt: 'Please do not close the application',
        showLoading: true,
      });
      const workspaceUpdateReport =
        (yield this.editorStore.sdlcServerClient.updateWorkspace(
          this.sdlcState.activeProject.projectId,
          this.sdlcState.activeWorkspace,
        )) as WorkspaceUpdateReport;
      this.editorStore.applicationStore.logService.info(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.UPDATE_WORKSPACE__SUCCESS),
        Date.now() - startTime,
        'ms',
      );
      this.sdlcState.isWorkspaceOutdated = false;
      switch (workspaceUpdateReport.status) {
        // TODO: we might want to handle the situation more gracefully rather than just reloading the page
        case WorkspaceUpdateReportStatus.CONFLICT:
        case WorkspaceUpdateReportStatus.UPDATED:
          this.editorStore.applicationStore.navigationService.navigator.reload({
            ignoreBlocking: true,
          });
          break;
        case WorkspaceUpdateReportStatus.NO_OP:
        default:
          break;
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.editorStore.applicationStore.alertService.setBlockingAlert(
        undefined,
      );
      this.isUpdatingWorkspace = false;
    }
  }

  /**
   * Fetch committed reviews between workspace base and project latest
   */
  *fetchLatestCommittedReviews(): GeneratorFn<void> {
    try {
      // we find the review associated with the workspace base, this usually exist, except in 2 cases:
      // 1. the revision is somehow directly added to the branch by the user (in the case of `git`, user directly pushed to unprotected default branch)
      // 2. the revision is the merged/comitted review revision (this usually happens for projects where fast forwarding merging is not default)
      // in those case, we will get the time from the base revision
      const workspaceBaseRevision = Revision.serialization.fromJson(
        (yield this.editorStore.sdlcServerClient.getRevision(
          this.sdlcState.activeProject.projectId,
          this.sdlcState.activeWorkspace,
          RevisionAlias.BASE,
        )) as PlainObject<Revision>,
      );
      const baseReviewObj = (
        (yield this.editorStore.sdlcServerClient.getReviews(
          this.sdlcState.activeProject.projectId,
          this.sdlcState.activePatch?.patchReleaseVersionId.id,
          {
            state: ReviewState.COMMITTED,
            revisionIds: [workspaceBaseRevision.id],
            limit: 1,
          },
        )) as PlainObject<Review>[]
      )[0];
      const baseReview = baseReviewObj
        ? Review.serialization.fromJson(baseReviewObj)
        : undefined;
      this.committedReviewsBetweenWorkspaceBaseAndProjectLatest = (
        (yield this.editorStore.sdlcServerClient.getReviews(
          this.sdlcState.activeProject.projectId,
          this.sdlcState.activePatch?.patchReleaseVersionId.id,
          {
            state: ReviewState.COMMITTED,
            since: baseReview
              ? baseReview.committedAt
              : workspaceBaseRevision.committedAt,
          },
        )) as PlainObject<Review>[]
      )
        .map((v) => Review.serialization.fromJson(v))
        .filter((review) => !baseReview || review.id !== baseReview.id); // make sure to exclude the base review
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    }
  }
}
