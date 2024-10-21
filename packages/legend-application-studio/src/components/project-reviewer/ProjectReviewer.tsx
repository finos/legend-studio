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
import {
  useProjectReviewerStore,
  withProjectReviewerStore,
} from './ProjectReviewStoreProvider.js';
import { ProjectReviewerSideBar } from './ProjectReviewSideBar.js';
import { ProjectReviewerPanel } from './ProjectReviewerPanel.js';
import { ACTIVITY_MODE } from '../../stores/editor/EditorConfig.js';
import {
  type ResizablePanelHandlerProps,
  getCollapsiblePanelGroupProps,
  clsx,
  PanelLoadingIndicator,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  CheckListIcon,
  CodeBranchIcon,
  UserIcon,
  AssistantIcon,
} from '@finos/legend-art';
import {
  type ProjectReviewerPathParams,
  generateSetupRoute,
} from '../../__lib__/LegendStudioNavigation.js';
import {
  useEditorStore,
  withEditorStore,
} from '../editor/EditorStoreProvider.js';
import { useApplicationStore } from '@finos/legend-application';
import { useParams } from '@finos/legend-application/browser';
import { guaranteeNonNullable } from '@finos/legend-shared';

const ProjectReviewerStatusBar = observer(() => {
  const reviewStore = useProjectReviewerStore();
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const currentUserId =
    editorStore.sdlcServerClient.currentUser?.userId ?? '(unknown)';
  const currentProject = reviewStore.currentProject
    ? reviewStore.currentProject.name
    : reviewStore.projectId;
  const review = reviewStore.review;
  const reviewStatus = reviewStore.approveState.isInProgress
    ? 'approving review...'
    : reviewStore.commitState.isInProgress
      ? 'committing review...'
      : reviewStore.closeState.isInProgress
        ? 'closing review...'
        : reviewStore.reOpenState.isInProgress
          ? 'reopening review...'
          : reviewStore.buildReviewReportState.isInProgress
            ? 'loading changes...'
            : undefined;
  const toggleAssistant = (): void =>
    applicationStore.assistantService.toggleAssistant();

  return (
    <div className="workspace-review__status-bar workspace-review__status-bar">
      <div className="workspace-review__status-bar__left">
        <div className="workspace-review__status-bar__workspace">
          <div className="workspace-review__status-bar__workspace__icon">
            <CodeBranchIcon />
          </div>
          <button
            className="workspace-review__status-bar__workspace__project"
            title="Go back to workspace setup using the specified project"
            tabIndex={-1}
            onClick={(): void =>
              applicationStore.navigationService.navigator.visitAddress(
                applicationStore.navigationService.navigator.generateAddress(
                  generateSetupRoute(reviewStore.projectId, undefined),
                ),
              )
            }
          >
            {currentProject}
          </button>
          /
          <button
            className="workspace-review__status-bar__workspace__workspace"
            title="Go back to workspace setup using the specified workspace"
            tabIndex={-1}
            onClick={(): void =>
              applicationStore.navigationService.navigator.visitAddress(
                applicationStore.navigationService.navigator.generateAddress(
                  generateSetupRoute(
                    reviewStore.projectId,
                    review.workspaceId,
                    review.workspaceType,
                  ),
                ),
              )
            }
          >
            {review.workspaceId}
          </button>
          <div className="workspace-review__status-bar__review">
            <a target="_blank" rel="noopener noreferrer" href={review.webURL}>
              {review.title}
            </a>
          </div>
        </div>
      </div>
      <div className="workspace-review__status-bar__right">
        <div className="workspace-review__status-bar__status">
          {reviewStatus}
        </div>
        <div className="workspace-review__status-bar__user">
          <div className="workspace-review__status-bar__user__icon">
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
          disabled={applicationStore.config.TEMPORARY__disableVirtualAssistant}
          title={
            applicationStore.config.TEMPORARY__disableVirtualAssistant
              ? 'Virtual Assistant is disabled'
              : 'Toggle assistant'
          }
        >
          <AssistantIcon />
        </button>
      </div>
    </div>
  );
});

const ProjectReviewerExplorer = observer(() => {
  const editorStore = useEditorStore();

  // layout
  const resizeSideBar = (handleProps: ResizablePanelHandlerProps): void =>
    editorStore.sideBarDisplayState.setSize(
      (handleProps.domElement as HTMLDivElement).getBoundingClientRect().width,
    );
  const sideBarCollapsiblePanelGroupProps = getCollapsiblePanelGroupProps(
    editorStore.sideBarDisplayState.size === 0,
    {
      onStopResize: resizeSideBar,
      size: editorStore.sideBarDisplayState.size,
    },
  );
  return (
    <ResizablePanelGroup orientation="vertical">
      <ResizablePanel
        {...sideBarCollapsiblePanelGroupProps.collapsiblePanel}
        direction={1}
      >
        <ProjectReviewerSideBar />
      </ResizablePanel>
      <ResizablePanelSplitter />
      <ResizablePanel
        {...sideBarCollapsiblePanelGroupProps.remainingPanel}
        minSize={300}
      >
        <ProjectReviewerPanel />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
});

export const ProjectReviewer = withEditorStore(
  withProjectReviewerStore(
    observer(() => {
      const params = useParams<ProjectReviewerPathParams>();
      const projectId = guaranteeNonNullable(params.projectId);
      const reviewId = guaranteeNonNullable(params.reviewId);
      const reviewStore = useProjectReviewerStore();
      const editorStore = useEditorStore();
      const changeActivity =
        (activity: ACTIVITY_MODE): (() => void) =>
        (): void =>
          editorStore.setActiveActivity(activity);
      useEffect(() => {
        reviewStore.setProjectIdAndReviewId(projectId, reviewId);
        reviewStore.initialize();
      }, [reviewStore, projectId, reviewId]);

      return (
        <div className="app__page">
          <div className="workspace-review">
            <PanelLoadingIndicator
              isLoading={reviewStore.fetchCurrentReviewState.isInProgress}
            />
            {reviewStore.currentReview && (
              <>
                <div className="workspace-review__body">
                  <div className="activity-bar">
                    <div className="activity-bar__items">
                      <button
                        key={ACTIVITY_MODE.REVIEW}
                        className="activity-bar__item activity-bar__item--active workspace-review__activity-bar__review-icon"
                        tabIndex={-1}
                        title="Review"
                        onClick={changeActivity(ACTIVITY_MODE.REVIEW)}
                      >
                        <CheckListIcon />
                      </button>
                    </div>
                  </div>
                  <div className="workspace-review__content-container">
                    <div className="workspace-review__content">
                      <ProjectReviewerExplorer />
                    </div>
                  </div>
                </div>
                <ProjectReviewerStatusBar />
              </>
            )}
          </div>
        </div>
      );
    }),
  ),
);
