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

import { createContext, useContext } from 'react';
import { useLocalObservable } from 'mobx-react-lite';
import { CORE_LOG_EVENT } from '../utils/Logger';
import type { GeneratorFn, PlainObject } from '@finos/legend-studio-shared';
import { guaranteeNonNullable } from '@finos/legend-studio-shared';
import type { Entity } from '../models/sdlc/models/entity/Entity';
import { makeAutoObservable, action, flowResult } from 'mobx';
import { Review } from '../models/sdlc/models/review/Review';
import type { EditorStore } from './EditorStore';
import { useEditorStore } from './EditorStore';
import { Project } from '../models/sdlc/models/project/Project';
import { EDITOR_MODE, ACTIVITY_MODE, TAB_SIZE } from './EditorConfig';

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

  *init(): GeneratorFn<void> {
    try {
      // setup engine
      yield flowResult(
        this.editorStore.graphState.graphManager.setupEngine(
          this.editorStore.applicationStore.pluginManager,
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
        ),
      );
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
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
        this.editorStore.applicationStore.networkClientManager.sdlcClient.getReviewFromEntities(
          this.projectId,
          this.review.id,
        ),
        this.editorStore.applicationStore.networkClientManager.sdlcClient.getReviewToEntities(
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
          CORE_LOG_EVENT.CHANGE_DETECTION_WORKSPACE_HASHES_INDEX_BUILT,
        ),
        this.editorStore.changeDetectionState.workspaceLatestRevisionState.buildEntityHashesIndex(
          toEntities,
          CORE_LOG_EVENT.CHANGE_DETECTION_LOCAL_HASHES_INDEX_BUILT,
        ),
      ]);
      yield flowResult(
        this.editorStore.changeDetectionState.computeAggregatedWorkspaceChanges(),
      );
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
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
        (yield this.editorStore.applicationStore.networkClientManager.sdlcClient.getProject(
          this.projectId,
        )) as PlainObject<Project>,
      );
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  }

  *getReview(): GeneratorFn<void> {
    try {
      this.isFetchingCurrentReview = true;
      this.currentReview = Review.serialization.fromJson(
        (yield this.editorStore.applicationStore.networkClientManager.sdlcClient.getReview(
          this.projectId,
          this.reviewId,
        )) as PlainObject<Review>,
      );
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
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
        (yield this.editorStore.applicationStore.networkClientManager.sdlcClient.approveReview(
          this.projectId,
          this.review.id,
        )) as PlainObject<Review>,
      );
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
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
        (yield this.editorStore.applicationStore.networkClientManager.sdlcClient.commitReview(
          this.projectId,
          this.review.id,
          { message: `${this.review.title} [review]` },
        )) as PlainObject<Review>,
      );
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
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
        (yield this.editorStore.applicationStore.networkClientManager.sdlcClient.reopenReview(
          this.projectId,
          this.review.id,
        )) as PlainObject<Review>,
      );
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
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
        (yield this.editorStore.applicationStore.networkClientManager.sdlcClient.closeReview(
          this.projectId,
          this.review.id,
        )) as PlainObject<Review>,
      );
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SDLC_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isClosingReview = false;
    }
  }
}

const ReviewStoreContext = createContext<ReviewStore | undefined>(undefined);

export const ReviewStoreProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => {
  const editorStore = useEditorStore();
  editorStore.setMode(EDITOR_MODE.REVIEW);
  const store = useLocalObservable(() => new ReviewStore(editorStore));
  return (
    <ReviewStoreContext.Provider value={store}>
      {children}
    </ReviewStoreContext.Provider>
  );
};

export const useReviewStore = (): ReviewStore =>
  guaranteeNonNullable(
    useContext(ReviewStoreContext),
    'useReviewStore() hook must be used inside ReviewStore context provider',
  );
