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

import { useRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { EntityDiffViewState } from '../../../stores/editor/editor-state/entity-diff-editor-state/EntityDiffViewState.js';
import { EntityDiffSideBarItem } from '../editor-group/diff-editor/EntityDiffView.js';
import {
  clsx,
  PanelLoadingIndicator,
  TruncatedGitMergeIcon,
  RefreshIcon,
  InfoCircleIcon,
  TimesIcon,
  PlusIcon,
  ExternalLinkSquareIcon,
  PanelContent,
} from '@finos/legend-art';
import { ACTIVITY_MODE } from '../../../stores/editor/EditorConfig.js';
import { generateReviewRoute } from '../../../__lib__/LegendStudioNavigation.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../__lib__/LegendStudioTesting.js';
import { flowResult } from 'mobx';
import {
  AuthorizableProjectAction,
  type EntityDiff,
} from '@finos/legend-server-sdlc';
import { entityDiffSorter } from '../../../stores/editor/EditorSDLCState.js';
import { useEditorStore } from '../EditorStoreProvider.js';
import { useLegendStudioApplicationStore } from '../../LegendStudioFrameworkProvider.js';
import { formatDistanceToNow } from '@finos/legend-shared';
import { STUDIO_SDLC_USER_ERRORS } from '../../shared/StudioSDLCErrors.js';

export const WorkspaceReviewDiffs = observer(() => {
  const editorStore = useEditorStore();
  const workspaceReviewState = editorStore.workspaceReviewState;
  const currentTabState = editorStore.tabManagerState.currentTab;
  const changes = editorStore.changeDetectionState.aggregatedWorkspaceChanges;
  const isSelectedDiff = (diff: EntityDiff): boolean =>
    currentTabState instanceof EntityDiffViewState &&
    diff.oldPath === currentTabState.fromEntityPath &&
    diff.newPath === currentTabState.toEntityPath;
  const openChange =
    (diff: EntityDiff): (() => void) =>
    (): void =>
      workspaceReviewState.openReviewChange(diff);

  return (
    <div className="panel side-bar__panel workspace-review__diffs">
      <div className="panel__header">
        <div className="panel__header__title">
          <div className="panel__header__title__content">CHANGES</div>
          <div
            className="side-bar__panel__title__info"
            title="All changes made in the workspace since the revision the workspace is created"
          >
            <InfoCircleIcon />
          </div>
        </div>
        <div
          className="side-bar__panel__header__changes-count"
          data-testid={
            LEGEND_STUDIO_TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT
          }
        >
          {changes.length}
        </div>
      </div>
      <PanelContent>
        {changes
          .slice()
          .sort(entityDiffSorter)
          .map((diff) => (
            <EntityDiffSideBarItem
              key={diff.key}
              diff={diff}
              isSelected={isSelectedDiff(diff)}
              openDiff={openChange(diff)}
            />
          ))}
      </PanelContent>
    </div>
  );
});

export const WorkspaceReview = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useLegendStudioApplicationStore();
  const workspaceReviewState = editorStore.workspaceReviewState;
  const workspaceContainsSnapshotDependencies =
    editorStore.projectConfigurationEditorState.containsSnapshotDependencies;
  const workspaceReview = workspaceReviewState.workspaceReview;
  // Review Title
  const reviewTitleInputRef = useRef<HTMLInputElement>(null);
  const editReviewTitle: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => {
    if (!workspaceReview) {
      workspaceReviewState.setReviewTitle(event.target.value);
    }
  };
  const isDispatchingAction =
    workspaceReviewState.isCreatingWorkspaceReview ||
    workspaceReviewState.isFetchingCurrentWorkspaceReview ||
    workspaceReviewState.isRefreshingWorkspaceChangesDetector ||
    workspaceReviewState.isCommittingWorkspaceReview ||
    workspaceReviewState.isClosingWorkspaceReview ||
    workspaceReviewState.isRecreatingWorkspaceAfterCommittingReview;
  const refresh = (): void => {
    flowResult(workspaceReviewState.refreshWorkspaceChanges()).catch(
      applicationStore.alertUnhandledError,
    );
    flowResult(workspaceReviewState.fetchCurrentWorkspaceReview()).catch(
      applicationStore.alertUnhandledError,
    );
  };
  const closeReview = (): void => {
    workspaceReviewState.setReviewTitle('');
    flowResult(workspaceReviewState.closeWorkspaceReview()).catch(
      applicationStore.alertUnhandledError,
    );
  };
  // commit Review
  const isCommitReviewDisabled =
    isDispatchingAction ||
    Boolean(!workspaceReview) ||
    workspaceContainsSnapshotDependencies ||
    !workspaceReviewState.canMergeReview;
  const commitReviewTitle = workspaceContainsSnapshotDependencies
    ? STUDIO_SDLC_USER_ERRORS.COMMIT_WORKSPACE_WITH_SNAPSHOT
    : workspaceReviewState.sdlcState.isActiveProjectSandbox
      ? `Can't commit review: reviews are not allowed on sandbox projects`
      : !workspaceReviewState.canMergeReview
        ? workspaceReviewState.sdlcState.unAuthorizedActionMessage(
            AuthorizableProjectAction.COMMIT_REVIEW,
          )
        : 'Commit review';
  const commitReview = (): void => {
    if (workspaceReview && !isDispatchingAction) {
      editorStore.localChangesState.alertUnsavedChanges((): void => {
        workspaceReviewState.setReviewTitle('');
        flowResult(
          workspaceReviewState.commitWorkspaceReview(workspaceReview),
        ).catch(applicationStore.alertUnhandledError);
      });
    }
  };
  // create Review
  const isCreateReviewDisabled =
    isDispatchingAction ||
    Boolean(workspaceReview) ||
    !workspaceReviewState.reviewTitle ||
    workspaceContainsSnapshotDependencies ||
    !workspaceReviewState.canCreateReview ||
    workspaceReviewState.sdlcState.isActiveProjectSandbox;
  const createReviewTitle = workspaceContainsSnapshotDependencies
    ? STUDIO_SDLC_USER_ERRORS.COMMIT_WORKSPACE_WITH_SNAPSHOT
    : workspaceReviewState.sdlcState.isActiveProjectSandbox
      ? `Can't create review: reviews are not allowed on sandbox projects`
      : !workspaceReviewState.canCreateReview
        ? workspaceReviewState.sdlcState.unAuthorizedActionMessage(
            AuthorizableProjectAction.SUBMIT_REVIEW,
          )
        : 'Create review';
  const createReview = (): void => {
    if (
      workspaceReviewState.reviewTitle &&
      !workspaceReview &&
      !isDispatchingAction
    ) {
      flowResult(
        workspaceReviewState.createWorkspaceReview(
          workspaceReviewState.reviewTitle,
        ),
      ).catch(applicationStore.alertUnhandledError);
    }
  };

  // since the review can be changed by other people, we can refresh it more proactively
  // the diffs are caused by the current user though, so we should handle that as part
  // of `syncWithWorkspace` for example; in case it is bad, user can click refresh to make it right again
  useEffect(() => {
    flowResult(workspaceReviewState.fetchCurrentWorkspaceReview()).catch(
      applicationStore.alertUnhandledError,
    );
  }, [applicationStore, workspaceReviewState]);

  useEffect(() => {
    if (editorStore.activeActivity === ACTIVITY_MODE.WORKSPACE_REVIEW) {
      reviewTitleInputRef.current?.focus();
    }
  }, [editorStore.activeActivity]);

  return (
    <div className="panel workspace-review">
      <div className="panel__header side-bar__header">
        <div className="panel__header__title workspace-review__header__title">
          <div className="panel__header__title__content side-bar__header__title__content">
            REVIEW
          </div>
        </div>
        <div className="panel__header__actions side-bar__header__actions">
          <button
            className={clsx(
              'panel__header__action side-bar__header__action workspace-review__refresh-btn',
              {
                'workspace-review__refresh-btn--loading':
                  workspaceReviewState.isRefreshingWorkspaceChangesDetector,
              },
            )}
            disabled={isDispatchingAction}
            onClick={refresh}
            tabIndex={-1}
            title="Refresh"
          >
            <RefreshIcon />
          </button>
          <button
            className="panel__header__action side-bar__header__action workspace-review__close-btn"
            disabled={!workspaceReview || isDispatchingAction}
            onClick={closeReview}
            tabIndex={-1}
            title="Close review"
          >
            <TimesIcon />
          </button>
        </div>
      </div>
      <div className="panel__content side-bar__content">
        <PanelLoadingIndicator isLoading={isDispatchingAction} />
        <div className="panel workspace-review">
          {!workspaceReview && (
            <>
              <form
                className="workspace-review__title"
                onSubmit={(event) => {
                  event.preventDefault();
                }}
              >
                <div className="workspace-review__title__content">
                  <input
                    className="workspace-review__title__content__input input--dark"
                    ref={reviewTitleInputRef}
                    spellCheck={false}
                    value={workspaceReviewState.reviewTitle}
                    disabled={Boolean(workspaceReview)}
                    onChange={editReviewTitle}
                    placeholder="Title"
                  />
                </div>
                <button
                  className={clsx('btn--dark btn--sm', {
                    'btn--error': workspaceContainsSnapshotDependencies,
                  })}
                  onClick={createReview}
                  disabled={isCreateReviewDisabled}
                  title={createReviewTitle}
                >
                  <PlusIcon />
                </button>
              </form>
            </>
          )}
          {workspaceReview && (
            <>
              <div className="workspace-review__title">
                <div className="workspace-review__title__content">
                  <div
                    className="workspace-review__title__content__input workspace-review__title__content__input--with-link"
                    title="See review detail"
                  >
                    <button
                      className="workspace-review__title__content__input__link"
                      tabIndex={-1}
                      onClick={(): void =>
                        applicationStore.navigationService.navigator.visitAddress(
                          applicationStore.navigationService.navigator.generateAddress(
                            generateReviewRoute(
                              workspaceReview.projectId,
                              workspaceReview.id,
                            ),
                          ),
                        )
                      }
                    >
                      <span className="workspace-review__title__content__input__link__review-name">
                        {workspaceReview.title}
                      </span>
                      <div className="workspace-review__title__content__input__link__btn">
                        <ExternalLinkSquareIcon />
                      </div>
                    </button>
                  </div>
                </div>
                <button
                  className={clsx(
                    'btn--dark btn--sm workspace-review__merge-review-btn',
                    { 'btn--error': workspaceContainsSnapshotDependencies },
                  )}
                  onClick={commitReview}
                  disabled={isCommitReviewDisabled}
                  tabIndex={-1}
                  title={commitReviewTitle}
                >
                  <TruncatedGitMergeIcon />
                </button>
              </div>
              <div className="workspace-review__title__content__review-status">
                {`created ${formatDistanceToNow(workspaceReview.createdAt, {
                  includeSeconds: true,
                  addSuffix: true,
                })}`}
              </div>
            </>
          )}
          <WorkspaceReviewDiffs />
        </div>
      </div>
    </div>
  );
});
