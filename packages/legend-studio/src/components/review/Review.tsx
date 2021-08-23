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
import { ReviewStoreProvider, useReviewStore } from './ReviewStoreProvider';
import { useParams } from 'react-router';
import { ReviewSideBar } from './ReviewSideBar';
import { ReviewPanel } from './ReviewPanel';
import {
  FaCodeBranch,
  FaCog,
  FaUser,
  FaRegWindowMaximize,
} from 'react-icons/fa';
import { ACTIVITY_MODE } from '../../stores/EditorConfig';
import { MdPlaylistAddCheck } from 'react-icons/md';
import { Link } from 'react-router-dom';
import type { ResizablePanelHandlerProps } from '@finos/legend-application-components';
import {
  getControlledResizablePanelProps,
  clsx,
  PanelLoadingIndicator,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
} from '@finos/legend-application-components';
import type { ReviewPathParams } from '../../stores/LegendStudioRouter';
import {
  generateViewProjectRoute,
  generateEditorRoute,
} from '../../stores/LegendStudioRouter';
import { AppHeader } from '../shared/AppHeader';
import { AppHeaderMenu } from '../editor/header/AppHeaderMenu';
import { flowResult } from 'mobx';
import {
  EditorStoreProvider,
  useEditorStore,
} from '../editor/EditorStoreProvider';
import {
  NotificationSnackbar,
  useApplicationStore,
} from '@finos/legend-application';

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
  const toggleExpandMode = (): void =>
    editorStore.setExpandedMode(!editorStore.isInExpandedMode);

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

  return (
    <div className="review__status-bar review__status-bar">
      <div className="review__status-bar__left">
        <div className="review__status-bar__workspace">
          <div className="review__status-bar__workspace__icon">
            <FaCodeBranch />
          </div>
          <div className="review__status-bar__workspace__project">
            <Link
              to={generateViewProjectRoute(
                applicationStore.config.sdlcServerKey,
                reviewStore.projectId,
              )}
            >
              {currentProject}
            </Link>
          </div>
          /
          <div className="review__status-bar__workspace__workspace">
            <Link
              to={generateEditorRoute(
                applicationStore.config.sdlcServerKey,
                reviewStore.projectId,
                review.workspaceId,
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
            <FaUser />
          </div>
          <div className="review__status-bar__user__name">{currentUserId}</div>
        </div>
        <button
          className={clsx(
            'review__status-bar__action review__status-bar__action__toggler',
            {
              'review__status-bar__action__toggler--active':
                editorStore.isInExpandedMode,
            },
          )}
          onClick={toggleExpandMode}
          tabIndex={-1}
          title={'Maximize/Minimize'}
        >
          <FaRegWindowMaximize />
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
      applicationStore.alertIllegalUnhandledError,
    );
  }, [applicationStore, reviewStore]);

  return (
    <ResizablePanelGroup
      orientation="vertical"
      className="review-explorer__content"
    >
      <ResizablePanel
        {...getControlledResizablePanelProps(
          editorStore.sideBarDisplayState.size === 0,
          {
            onStopResize: resizeSideBar,
          },
        )}
        direction={1}
        size={editorStore.sideBarDisplayState.size}
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
      applicationStore.alertIllegalUnhandledError,
    );
    flowResult(reviewStore.getReview()).catch(
      applicationStore.alertIllegalUnhandledError,
    );
    flowResult(reviewStore.fetchProject()).catch(
      applicationStore.alertIllegalUnhandledError,
    );
  }, [applicationStore, reviewStore, projectId, reviewId]);

  return (
    <div className="app__page">
      <AppHeader>
        <AppHeaderMenu />
      </AppHeader>
      <div className="app__content">
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
                      <MdPlaylistAddCheck />
                    </button>
                  </div>
                  <div className="activity-bar__setting">
                    <button
                      className="activity-bar__item"
                      tabIndex={-1}
                      title={'Settings...'}
                    >
                      <FaCog />
                    </button>
                  </div>
                </div>
                <div className="review__content-container">
                  <div
                    className={clsx('review__content', {
                      'review__content--expanded': editorStore.isInExpandedMode,
                    })}
                  >
                    <ReviewExplorer />
                  </div>
                </div>
              </div>
              <ReviewStatusBar />
              <NotificationSnackbar />
            </>
          )}
        </div>
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
