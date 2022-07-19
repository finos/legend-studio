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

import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { ReviewStoreProvider, useReviewStore } from './ReviewStoreProvider.js';
import { useParams } from 'react-router';
import { ReviewSideBar } from './ReviewSideBar.js';
import { ReviewPanel } from './ReviewPanel.js';
import { ACTIVITY_MODE } from '../../stores/EditorConfig.js';
import { Link } from 'react-router-dom';
import {
  type ResizablePanelHandlerProps,
  getControlledResizablePanelProps,
  clsx,
  PanelLoadingIndicator,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  CheckListIcon,
  CodeBranchIcon,
  CogIcon,
  UserIcon,
  AssistantIcon,
} from '@finos/legend-art';
import {
  type ReviewPathParams,
  generateViewProjectRoute,
  generateEditorRoute,
} from '../../stores/LegendStudioRouter.js';
import { flowResult } from 'mobx';
import {
  EditorStoreProvider,
  useEditorStore,
} from '../editor/EditorStoreProvider.js';
import { useApplicationStore } from '@finos/legend-application';

const ReviewStatusBar = observer(() => {
  const reviewStore = useReviewStore();
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const currentUserId =
    editorStore.sdlcServerClient.currentUser?.userId ?? '(unknown)';
  const currentProject = reviewStore.currentProject
    ? reviewStore.currentProject.name
    : reviewStore.projectId;
  const review = reviewStore.review;
  const reviewStatus = reviewStore.isApprovingReview
    ? 'approving review...'
    : reviewStore.isCommittingReview
    ? 'committing review...'
    : reviewStore.isClosingReview
    ? 'closing review...'
    : reviewStore.isReopeningReview
    ? 'reopening review...'
    : reviewStore.isFetchingComparison
    ? 'loading changes...'
    : undefined;
  const toggleAssistant = (): void =>
    applicationStore.assistantService.toggleAssistant();

  return (
    <div className="review__status-bar review__status-bar">
      <div className="review__status-bar__left">
        <div className="review__status-bar__workspace">
          <div className="review__status-bar__workspace__icon">
            <CodeBranchIcon />
          </div>
          <div className="review__status-bar__workspace__project">
            <Link to={generateViewProjectRoute(reviewStore.projectId)}>
              {currentProject}
            </Link>
          </div>
          /
          <div className="review__status-bar__workspace__workspace">
            <Link
              to={generateEditorRoute(
                reviewStore.projectId,
                review.workspaceId,
                review.workspaceType,
              )}
            >
              {review.workspaceId}
            </Link>
          </div>
          <div className="review__status-bar__review">
            <a target="_blank" rel="noopener noreferrer" href={review.webURL}>
              {review.title}
            </a>
          </div>
        </div>
      </div>
      <div className="review__status-bar__right">
        <div className="review__status-bar__status">{reviewStatus}</div>
        <div className="review__status-bar__user">
          <div className="review__status-bar__user__icon">
            <UserIcon />
          </div>
          <div className="review__status-bar__user__name">{currentUserId}</div>
        </div>
        <button
          className={clsx(
            'editor__status-bar__action editor__status-bar__action__toggler',
            {
              'editor__status-bar__action__toggler--active':
                !applicationStore.assistantService.isHidden,
            },
          )}
          onClick={toggleAssistant}
          tabIndex={-1}
          title="Toggle assistant"
        >
          <AssistantIcon />
        </button>
      </div>
    </div>
  );
});

const ReviewExplorer = observer(() => {
  const reviewStore = useReviewStore();
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const resizeSideBar = (handleProps: ResizablePanelHandlerProps): void =>
    editorStore.sideBarDisplayState.setSize(
      (handleProps.domElement as HTMLDivElement).getBoundingClientRect().width,
    );

  useEffect(() => {
    flowResult(reviewStore.fetchReviewComparison()).catch(
      applicationStore.alertUnhandledError,
    );
  }, [applicationStore, reviewStore]);

  return (
    <ResizablePanelGroup orientation="vertical">
      <ResizablePanel
        {...getControlledResizablePanelProps(
          editorStore.sideBarDisplayState.size === 0,
          {
            onStopResize: resizeSideBar,
            size: editorStore.sideBarDisplayState.size,
          },
        )}
        direction={1}
      >
        <ReviewSideBar />
      </ResizablePanel>
      <ResizablePanelSplitter />
      <ResizablePanel minSize={300}>
        <ReviewPanel />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
});

const ReviewInner = observer(() => {
  const params = useParams<ReviewPathParams>();
  const projectId = params.projectId;
  const reviewId = params.reviewId;
  const reviewStore = useReviewStore();
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const changeActivity =
    (activity: ACTIVITY_MODE): (() => void) =>
    (): void =>
      editorStore.setActiveActivity(activity);

  useEffect(() => {
    reviewStore.setProjectIdAndReviewId(projectId, reviewId);
    flowResult(reviewStore.initialize()).catch(
      applicationStore.alertUnhandledError,
    );
    flowResult(reviewStore.getReview()).catch(
      applicationStore.alertUnhandledError,
    );
    flowResult(reviewStore.fetchProject()).catch(
      applicationStore.alertUnhandledError,
    );
  }, [applicationStore, reviewStore, projectId, reviewId]);

  return (
    <div className="app__page">
      <div className="review">
        <PanelLoadingIndicator
          isLoading={reviewStore.isFetchingCurrentReview}
        />
        {reviewStore.currentReview && (
          <>
            <div className="review__body">
              <div className="activity-bar">
                <div className="activity-bar__items">
                  <button
                    key={ACTIVITY_MODE.REVIEW}
                    className="activity-bar__item activity-bar__item--active review__activity-bar__review-icon"
                    tabIndex={-1}
                    title={'Review'}
                    onClick={changeActivity(ACTIVITY_MODE.REVIEW)}
                  >
                    <CheckListIcon />
                  </button>
                </div>
                <div className="activity-bar__setting">
                  <button
                    className="activity-bar__item"
                    tabIndex={-1}
                    title={'Settings...'}
                  >
                    <CogIcon />
                  </button>
                </div>
              </div>
              <div className="review__content-container">
                <div className="review__content">
                  <ReviewExplorer />
                </div>
              </div>
            </div>
            <ReviewStatusBar />
          </>
        )}
      </div>
    </div>
  );
});

export const Review: React.FC = () => (
  <EditorStoreProvider>
    <ReviewStoreProvider>
      <ReviewInner />
    </ReviewStoreProvider>
  </EditorStoreProvider>
);
