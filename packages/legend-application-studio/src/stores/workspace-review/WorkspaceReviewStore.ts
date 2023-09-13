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
  type GeneratorFn,
  type PlainObject,
  assertErrorThrown,
  LogEvent,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import {
  makeObservable,
  action,
  flowResult,
  observable,
  flow,
  computed,
} from 'mobx';
import type { EditorStore } from '../editor/EditorStore.js';
import { ACTIVITY_MODE } from '../editor/EditorConfig.js';
import type { Entity } from '@finos/legend-storage';
import { Project, Review, type Patch } from '@finos/legend-server-sdlc';
import { LEGEND_STUDIO_APP_EVENT } from '../../__lib__/LegendStudioEvent.js';
import { DEFAULT_TAB_SIZE } from '@finos/legend-application';

export class WorkspaceReviewStore {
  readonly editorStore: EditorStore;

  currentProjectId?: string | undefined;
  currentProject?: Project | undefined;
  currentPatch?: Patch | undefined;
  currentReviewId?: string | undefined;
  currentReview?: Review | undefined;
  isFetchingCurrentReview = false;
  isFetchingComparison = false;
  isApprovingReview = false;
  isClosingReview = false;
  isCommittingReview = false;
  isReopeningReview = false;

  constructor(editorStore: EditorStore) {
    makeObservable(this, {
      currentProjectId: observable,
      currentProject: observable,
      currentPatch: observable,
      currentReviewId: observable,
      currentReview: observable,
      isFetchingCurrentReview: observable,
      isFetchingComparison: observable,
      isApprovingReview: observable,
      isClosingReview: observable,
      isCommittingReview: observable,
      isReopeningReview: observable,
      projectId: computed,
      patchReleaseVersionId: computed,
      reviewId: computed,
      review: computed,
      setProjectIdAndReviewId: action,
      initialize: flow,
      fetchReviewComparison: flow,
      fetchProject: flow,
      getReview: flow,
      approveReview: flow,
      commitReview: flow,
      reOpenReview: flow,
      closeReview: flow,
    });

    this.editorStore = editorStore;
    this.editorStore.activeActivity = ACTIVITY_MODE.REVIEW;
  }

  get projectId(): string {
    return guaranteeNonNullable(this.currentProjectId, 'Project ID must exist');
  }

  get patchReleaseVersionId(): string | undefined {
    return this.currentPatch?.patchReleaseVersionId.id;
  }

  get reviewId(): string {
    return guaranteeNonNullable(this.currentReviewId, 'Review ID must exist');
  }

  get review(): Review {
    return guaranteeNonNullable(this.currentReview, 'Review must exist');
  }

  setProjectIdAndReviewId(projectId: string, reviewId: string): void {
    this.currentProjectId = projectId;
    this.currentReviewId = reviewId;
  }

  *initialize(): GeneratorFn<void> {
    try {
      // setup engine
      yield this.editorStore.graphManagerState.graphManager.initialize(
        {
          env: this.editorStore.applicationStore.config.env,
          tabSize: DEFAULT_TAB_SIZE,
          clientConfig: {
            baseUrl: this.editorStore.applicationStore.config.engineServerUrl,
            queryBaseUrl:
              this.editorStore.applicationStore.config.engineQueryServerUrl,
            enableCompression: true,
          },
        },
        {
          tracerService: this.editorStore.applicationStore.tracerService,
        },
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    }
  }

  *fetchReviewComparison(): GeneratorFn<void> {
    this.isFetchingComparison = true;
    try {
      const [fromEntities, toEntities] = (yield Promise.all([
        this.editorStore.sdlcServerClient.getReviewFromEntities(
          this.projectId,
          this.patchReleaseVersionId,
          this.review.id,
        ),
        this.editorStore.sdlcServerClient.getReviewToEntities(
          this.projectId,
          this.patchReleaseVersionId,
          this.review.id,
        ),
      ])) as [Entity[], Entity[]];
      this.editorStore.changeDetectionState.workspaceBaseRevisionState.setEntities(
        fromEntities,
      );
      this.editorStore.changeDetectionState.workspaceLocalLatestRevisionState.setEntities(
        toEntities,
      );
      yield Promise.all([
        this.editorStore.changeDetectionState.workspaceBaseRevisionState.buildEntityHashesIndex(
          fromEntities,
          LogEvent.create(
            LEGEND_STUDIO_APP_EVENT.CHANGE_DETECTION_BUILD_WORKSPACE_HASHES_INDEX__SUCCESS,
          ),
        ),
        this.editorStore.changeDetectionState.workspaceLocalLatestRevisionState.buildEntityHashesIndex(
          toEntities,
          LogEvent.create(
            LEGEND_STUDIO_APP_EVENT.CHANGE_DETECTION_BUILD_LOCAL_HASHES_INDEX__SUCCESS,
          ),
        ),
      ]);
      yield flowResult(
        this.editorStore.changeDetectionState.computeAggregatedWorkspaceChanges(),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.isFetchingComparison = false;
    }
  }

  *fetchProject(): GeneratorFn<void> {
    try {
      this.currentProject = Project.serialization.fromJson(
        (yield this.editorStore.sdlcServerClient.getProject(
          this.projectId,
        )) as PlainObject<Project>,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    }
  }

  *getReview(): GeneratorFn<void> {
    try {
      this.isFetchingCurrentReview = true;
      this.currentReview = Review.serialization.fromJson(
        (yield this.editorStore.sdlcServerClient.getReview(
          this.projectId,
          this.patchReleaseVersionId,
          this.reviewId,
        )) as PlainObject<Review>,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.isFetchingCurrentReview = false;
    }
  }

  *approveReview(): GeneratorFn<void> {
    this.isApprovingReview = true;
    try {
      this.currentReview = Review.serialization.fromJson(
        (yield this.editorStore.sdlcServerClient.approveReview(
          this.projectId,
          this.patchReleaseVersionId,
          this.review.id,
        )) as PlainObject<Review>,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.isApprovingReview = false;
    }
  }

  *commitReview(): GeneratorFn<void> {
    this.isCommittingReview = true;
    try {
      this.currentReview = Review.serialization.fromJson(
        (yield this.editorStore.sdlcServerClient.commitReview(
          this.projectId,
          this.patchReleaseVersionId,
          this.review.id,
          { message: `${this.review.title} [review]` },
        )) as PlainObject<Review>,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.isCommittingReview = false;
    }
  }

  *reOpenReview(): GeneratorFn<void> {
    this.isReopeningReview = true;
    try {
      this.currentReview = Review.serialization.fromJson(
        (yield this.editorStore.sdlcServerClient.reopenReview(
          this.projectId,
          this.patchReleaseVersionId,
          this.review.id,
        )) as PlainObject<Review>,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.isReopeningReview = false;
    }
  }

  *closeReview(): GeneratorFn<void> {
    this.isClosingReview = true;
    try {
      this.currentReview = Review.serialization.fromJson(
        (yield this.editorStore.sdlcServerClient.closeReview(
          this.projectId,
          this.patchReleaseVersionId,
          this.review.id,
        )) as PlainObject<Review>,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.isClosingReview = false;
    }
  }
}
