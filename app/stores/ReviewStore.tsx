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


import React, { createContext, useContext } from 'react';
import { useLocalStore } from 'mobx-react-lite';
import { Log, LOG_EVENT } from 'Utilities/Logger';
import { deserialize } from 'serializr';
import { guaranteeNonNullable } from 'Utilities/GeneralUtil';
import { Entity } from 'SDLC/entity/Entity';
import { observable, flow } from 'mobx';
import { Review } from 'SDLC/review/Review';
import { sdlcClient } from 'API/SdlcClient';
import { EditorStore, useEditorStore } from './EditorStore';
import { Project } from 'SDLC/project/Project';
import { EDITOR_MODE, ACTIVITY_MODE } from 'Stores/EditorConfig';

export class ReviewStore {
  editorStore: EditorStore;
  @observable currentProjectId?: string;
  @observable currentProject?: Project;
  @observable currentReviewId?: string;
  @observable currentReview?: Review;
  @observable isFetchingCurrentReview = false;
  @observable isFetchingComparison = false;
  @observable isApprovingReview = false;
  @observable isClosingReview = false;
  @observable isCommittingReview = false;
  @observable isReopeningReview = false;

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
    this.editorStore.activeActivity = ACTIVITY_MODE.REVIEW;
  }

  get projectId(): string { return guaranteeNonNullable(this.currentProjectId, 'Project ID must exist') }
  get reviewId(): string { return guaranteeNonNullable(this.currentReviewId, 'Review ID must exist') }
  get review(): Review { return guaranteeNonNullable(this.currentReview, 'Review must exist') }

  setProjectIdAndReviewId(projectId: string, reviewId: string): void {
    this.currentProjectId = projectId;
    this.currentReviewId = reviewId;
  }

  getReviewComparison = flow(function* (this: ReviewStore) {
    this.isFetchingComparison = true;
    try {
      const [fromEntities, toEntities] = (yield Promise.all([
        sdlcClient.getReviewFromEntities(this.projectId, this.review.id),
        sdlcClient.getReviewToEntities(this.projectId, this.review.id),
      ])) as unknown as [Entity[], Entity[]];
      this.editorStore.changeDetectionState.workspaceBaseRevisionState.setEntities(fromEntities);
      this.editorStore.changeDetectionState.workspaceLatestRevisionState.setEntities(toEntities);
      yield Promise.all([
        this.editorStore.changeDetectionState.workspaceBaseRevisionState.buildEntityHashesIndex(fromEntities, LOG_EVENT.CHANGE_DETECTION_WORKSPACE_HASHES_INDEX_BUILT),
        this.editorStore.changeDetectionState.workspaceLatestRevisionState.buildEntityHashesIndex(toEntities, LOG_EVENT.CHANGE_DETECTION_LOCAL_HASHES_INDEX_BUILT),
      ]);
      yield this.editorStore.changeDetectionState.computeAggregatedWorkspaceChanges();
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isFetchingComparison = false;
    }
  });

  fetchProject = flow(function* (this: ReviewStore) {
    try {
      this.currentProject = (yield sdlcClient.getProject(this.projectId)) as unknown as Project;
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    }
  });

  getReview = flow(function* (this: ReviewStore) {
    try {
      this.isFetchingCurrentReview = true;
      this.currentReview = deserialize(Review, (yield sdlcClient.getReview(this.projectId, this.reviewId)) as unknown as Review);
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isFetchingCurrentReview = false;
    }
  });

  approveReview = flow(function* (this: ReviewStore) {
    this.isApprovingReview = true;
    try {
      yield sdlcClient.approveReview(this.projectId, this.review.id);
      yield this.getReview();
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isApprovingReview = false;
    }
  });

  commitReview = flow(function* (this: ReviewStore) {
    this.isCommittingReview = true;
    try {
      yield sdlcClient.commitReview(this.projectId, this.review.id, { message: `${this.review.title} [review]` });
      yield this.getReview();
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isCommittingReview = false;
    }
  });

  reOpenReview = flow(function* (this: ReviewStore) {
    this.isReopeningReview = true;
    try {
      yield sdlcClient.reopenReview(this.projectId, this.review.id);
      yield this.getReview();
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isReopeningReview = false;
    }
  });

  closeReview = flow(function* (this: ReviewStore) {
    this.isClosingReview = true;
    try {
      yield sdlcClient.closeReview(this.projectId, this.review.id);
      yield this.getReview();
    } catch (error) {
      Log.error(LOG_EVENT.SDLC_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isClosingReview = false;
    }
  });
}

const ReviewStoreContext = createContext<ReviewStore | undefined>(undefined);

export const ReviewStoreProvider = ({ children }: { children: React.ReactNode }): React.ReactElement => {
  const editorStore = useEditorStore();
  editorStore.setMode(EDITOR_MODE.REVIEW);
  const store = useLocalStore(() => new ReviewStore(editorStore));
  return <ReviewStoreContext.Provider value={store}>{children}</ReviewStoreContext.Provider>;
};

export const useReviewStore = (): ReviewStore =>
  guaranteeNonNullable(useContext(ReviewStoreContext), 'useReviewStore() hook must be used inside ReviewStore context provider');
