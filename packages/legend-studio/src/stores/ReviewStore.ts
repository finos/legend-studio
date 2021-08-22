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

import { CHANGE_DETECTION_LOG_EVENT } from '../utils/ChangeDetectionLogEvent';
import type { GeneratorFn, PlainObject } from '@finos/legend-shared';
import { LogEvent, guaranteeNonNullable } from '@finos/legend-shared';
import { makeAutoObservable, action, flowResult } from 'mobx';
import type { EditorStore } from './EditorStore';
import { ACTIVITY_MODE } from './EditorConfig';
import type { Entity } from '@finos/legend-model-storage';
import { Project, Review } from '@finos/legend-server-sdlc';
import { STUDIO_LOG_EVENT } from '../utils/StudioLogEvent';
import { TAB_SIZE } from '@finos/legend-application';

export class ReviewStore {
  editorStore: EditorStore;
  currentProjectId?: string;
  currentProject?: Project;
  currentReviewId?: string;
  currentReview?: Review;
  isFetchingCurrentReview = false;
  isFetchingComparison = false;
  isApprovingReview = false;
  isClosingReview = false;
  isCommittingReview = false;
  isReopeningReview = false;

  constructor(editorStore: EditorStore) {
    makeAutoObservable(this, {
      editorStore: false,
      projectId: false,
      reviewId: false,
      review: false,
      setProjectIdAndReviewId: action,
    });

    this.editorStore = editorStore;
    this.editorStore.activeActivity = ACTIVITY_MODE.REVIEW;
  }

  get projectId(): string {
    return guaranteeNonNullable(this.currentProjectId, 'Project ID must exist');
  }
  get reviewId(): string {
    return guaranteeNonNullable(this.currentReviewId, 'Review ID must exist');
  }
  get review(): Review {
    return guaranteeNonNullable(this.currentReview, 'Review must exist');
  }

  *initialize(): GeneratorFn<void> {
    try {
      // setup engine
      yield flowResult(
        this.editorStore.graphManagerState.graphManager.initialize(
          {
            env: this.editorStore.applicationStore.config.env,
            tabSize: TAB_SIZE,
            clientConfig: {
              baseUrl: this.editorStore.applicationStore.config.engineServerUrl,
              enableCompression: true,
              autoReAuthenticateUrl:
                this.editorStore.applicationStore.config
                  .engineAutoReAuthenticationUrl,
            },
          },
          {
            tracerServicePlugins:
              this.editorStore.pluginManager.getTracerServicePlugins(),
          },
        ),
      );
    } catch (error: unknown) {
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  }

  setProjectIdAndReviewId(projectId: string, reviewId: string): void {
    this.currentProjectId = projectId;
    this.currentReviewId = reviewId;
  }

  *fetchReviewComparison(): GeneratorFn<void> {
    this.isFetchingComparison = true;
    try {
      const [fromEntities, toEntities] = (yield Promise.all([
        this.editorStore.sdlcServerClient.getReviewFromEntities(
          this.projectId,
          this.review.id,
        ),
        this.editorStore.sdlcServerClient.getReviewToEntities(
          this.projectId,
          this.review.id,
        ),
      ])) as [Entity[], Entity[]];
      this.editorStore.changeDetectionState.workspaceBaseRevisionState.setEntities(
        fromEntities,
      );
      this.editorStore.changeDetectionState.workspaceLatestRevisionState.setEntities(
        toEntities,
      );
      yield Promise.all([
        this.editorStore.changeDetectionState.workspaceBaseRevisionState.buildEntityHashesIndex(
          fromEntities,
          LogEvent.create(
            CHANGE_DETECTION_LOG_EVENT.CHANGE_DETECTION_WORKSPACE_HASHES_INDEX_BUILT,
          ),
        ),
        this.editorStore.changeDetectionState.workspaceLatestRevisionState.buildEntityHashesIndex(
          toEntities,
          LogEvent.create(
            CHANGE_DETECTION_LOG_EVENT.CHANGE_DETECTION_LOCAL_HASHES_INDEX_BUILT,
          ),
        ),
      ]);
      yield flowResult(
        this.editorStore.changeDetectionState.computeAggregatedWorkspaceChanges(),
      );
    } catch (error: unknown) {
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
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
    } catch (error: unknown) {
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  }

  *getReview(): GeneratorFn<void> {
    try {
      this.isFetchingCurrentReview = true;
      this.currentReview = Review.serialization.fromJson(
        (yield this.editorStore.sdlcServerClient.getReview(
          this.projectId,
          this.reviewId,
        )) as PlainObject<Review>,
      );
    } catch (error: unknown) {
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
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
          this.review.id,
        )) as PlainObject<Review>,
      );
    } catch (error: unknown) {
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
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
          this.review.id,
          { message: `${this.review.title} [review]` },
        )) as PlainObject<Review>,
      );
    } catch (error: unknown) {
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
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
          this.review.id,
        )) as PlainObject<Review>,
      );
    } catch (error: unknown) {
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
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
          this.review.id,
        )) as PlainObject<Review>,
      );
    } catch (error: unknown) {
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SDLC_MANAGER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isClosingReview = false;
    }
  }
}
