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

import { observer } from 'mobx-react-lite';
import { EntityDiffSideBarItem } from '../editor/editor-group/diff-editor/EntityDiffView.js';
import {
  clsx,
  PanelLoadingIndicator,
  TruncatedGitMergeIcon,
  RefreshIcon,
  TimesIcon,
  ArrowUpIcon,
  CheckIcon,
  InfoCircleIcon,
  PanelContent,
} from '@finos/legend-art';
import { EntityDiffViewState } from '../../stores/editor/editor-state/entity-diff-editor-state/EntityDiffViewState.js';
import { LEGEND_STUDIO_TEST_ID } from '../../__lib__/LegendStudioTesting.js';
import { flowResult } from 'mobx';
import {
  type EntityDiff,
  ReviewState,
  EntityChangeType,
  getChangeTypeIconFromChange,
} from '@finos/legend-server-sdlc';
import { entityDiffSorter } from '../../stores/editor/EditorSDLCState.js';
import { useProjectReviewerStore } from './ProjectReviewStoreProvider.js';
import { useEditorStore } from '../editor/EditorStoreProvider.js';
import { useApplicationStore } from '@finos/legend-application';
import { formatDistanceToNow } from '@finos/legend-shared';
import { SPECIAL_REVISION_ALIAS } from '../../stores/editor/editor-state/entity-diff-editor-state/EntityDiffEditorState.js';
import { ProjectConfigurationDiffEditorState } from '../../stores/editor/editor-state/diff-viewer-state/ProjectConfigurationDiffEditorState.js';
import { STUDIO_SDLC_USER_ERRORS } from '../shared/StudioSDLCErrors.js';

export const ProjectReviewerSideBar = observer(() => {
  const reviewStore = useProjectReviewerStore();
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const workspaceContainsSnapshotDependencies =
    editorStore.projectConfigurationEditorState.containsSnapshotDependencies;
  const approvalString = reviewStore.approvalString;
  // Review infos
  const review = reviewStore.review;
  const currentUser = editorStore.sdlcServerClient.currentUser;
  let reviewStatus = '';
  switch (review.state) {
    case ReviewState.OPEN:
      reviewStatus = `created ${formatDistanceToNow(review.createdAt, {
        includeSeconds: true,
        addSuffix: true,
      })} by ${review.author.name}`;
      break;
    case ReviewState.CLOSED:
      reviewStatus = review.closedAt
        ? `closed ${formatDistanceToNow(review.closedAt, {
            includeSeconds: true,
            addSuffix: true,
          })}`
        : 'review is closed';
      break;
    case ReviewState.COMMITTED:
      reviewStatus = review.committedAt
        ? `committed ${formatDistanceToNow(review.committedAt, {
            includeSeconds: true,
            addSuffix: true,
          })}`
        : 'review is closed';
      break;
    case ReviewState.UNKNOWN:
      reviewStatus = review.lastUpdatedAt
        ? `last updated ${formatDistanceToNow(review.lastUpdatedAt, {
            includeSeconds: true,
            addSuffix: true,
          })}`
        : 'review status is unknown';
      break;
    default:
  }
  // Actions
  const isDispatchingAction =
    reviewStore.buildReviewReportState.isInProgress ||
    reviewStore.approveState.isInProgress ||
    reviewStore.closeState.isInProgress ||
    reviewStore.commitState.isInProgress ||
    reviewStore.reOpenState.isInProgress;
  const closeReview = applicationStore.guardUnhandledError(() =>
    flowResult(reviewStore.closeReview()),
  );
  const reOpenReview = applicationStore.guardUnhandledError(() =>
    flowResult(reviewStore.reOpenReview()),
  );
  const commitReview = applicationStore.guardUnhandledError(() =>
    flowResult(reviewStore.commitReview()),
  );
  const approveReview = applicationStore.guardUnhandledError(() =>
    flowResult(reviewStore.approveReview()),
  );

  const refresh = (): void => {
    reviewStore.refresh();
  };
  // Changes
  const changes = reviewStore.reviewReport?.diffs ?? [];
  const currentTabState = editorStore.tabManagerState.currentTab;
  const isSelectedDiff = (diff: EntityDiff): boolean =>
    currentTabState instanceof EntityDiffViewState &&
    diff.oldPath === currentTabState.fromEntityPath &&
    diff.newPath === currentTabState.toEntityPath;
  const openChange =
    (diff: EntityDiff): (() => void) =>
    (): void =>
      reviewStore.openReviewChange(diff);

  const openConfiguration = (): void => {
    const diffs = reviewStore.reviewReport?.fromToProjectConfig;
    if (diffs) {
      const newTab = new ProjectConfigurationDiffEditorState(
        diffs[0],
        diffs[1],
        reviewStore.editorStore,
        SPECIAL_REVISION_ALIAS.WORKSPACE_BASE,
        SPECIAL_REVISION_ALIAS.WORKSPACE_HEAD,
      );
      reviewStore.editorStore.tabManagerState.openTab(
        reviewStore.editorStore.tabManagerState.tabs.find((t) =>
          t.match(newTab),
        ) ?? newTab,
      );
    }
  };

  return (
    <div className="panel workspace-review__side-bar">
      <div className="panel__header side-bar__header">
        <div className="panel__header__title workspace-review__side-bar__header__title">
          <div className="panel__header__title__content side-bar__header__title__content">
            REVIEW
          </div>
        </div>
        <div className="panel__header__actions side-bar__header__actions">
          <button
            className="panel__header__action side-bar__header__action workspace-review__close-btn"
            tabIndex={-1}
            title="Retrieves latest changes from review"
            onClick={refresh}
          >
            <RefreshIcon />
          </button>
          {review.state !== ReviewState.COMMITTED && (
            <button
              className="panel__header__action side-bar__header__action workspace-review__close-btn"
              disabled={
                isDispatchingAction || review.state === ReviewState.CLOSED
              }
              onClick={closeReview}
              tabIndex={-1}
              title="Close review"
            >
              <TimesIcon />
            </button>
          )}
        </div>
      </div>
      <div className="panel__content side-bar__content">
        <PanelLoadingIndicator isLoading={isDispatchingAction} />
        <div className="panel workspace-review">
          <div className="workspace-review__side-bar__review__info">
            <div
              className={clsx(
                'workspace-review__side-bar__review__info__content',
                {
                  'workspace-review__side-bar__review__info__content--closed':
                    review.state === ReviewState.CLOSED,
                },
                {
                  'workspace-review__side-bar__review__info__content--committed':
                    review.state === ReviewState.COMMITTED,
                },
              )}
            >
              <div className="workspace-review__side-bar__review__info__content__title">
                <span className="workspace-review__side-bar__review__info__content__title__review-name">
                  {review.title}
                </span>
              </div>
            </div>

            {review.state === ReviewState.CLOSED && (
              <button
                className="workspace-review__side-bar__review__info__action btn--dark btn--sm"
                onClick={reOpenReview}
                disabled={isDispatchingAction}
                tabIndex={-1}
                title="Reopen review"
              >
                <ArrowUpIcon />
              </button>
            )}
            {review.state === ReviewState.OPEN && (
              <>
                <button
                  className="btn--dark btn--sm"
                  onClick={approveReview}
                  // TODO: when we improve approval APIs we can know when to hide/disable this button altogether, right now the check is just to ensure nobody can self-approve
                  disabled={
                    isDispatchingAction ||
                    currentUser?.userId === review.author.name
                  }
                  tabIndex={-1}
                  title="Approve review"
                >
                  <CheckIcon />
                </button>
                <button
                  className={clsx(
                    'btn--dark btn--sm workspace-review__side-bar__merge-btn',
                    {
                      'btn--error': workspaceContainsSnapshotDependencies,
                    },
                  )}
                  onClick={commitReview}
                  // TODO: when we improve approval APIs we can know when to hide/disable this button altogether
                  disabled={
                    isDispatchingAction || workspaceContainsSnapshotDependencies
                  }
                  tabIndex={-1}
                  title={
                    !workspaceContainsSnapshotDependencies
                      ? 'Commit review'
                      : STUDIO_SDLC_USER_ERRORS.COMMIT_WORKSPACE_WITH_SNAPSHOT
                  }
                >
                  <TruncatedGitMergeIcon />
                </button>
              </>
            )}
          </div>
          {approvalString && (
            <div className="workspace-review__side-bar__review__info__content__status">
              {approvalString}
            </div>
          )}
          <div className="workspace-review__side-bar__review__info__content__status">
            {reviewStatus}
          </div>
          <div className="panel side-bar__panel">
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
              {changes.toSorted(entityDiffSorter).map((diff) => (
                <EntityDiffSideBarItem
                  key={diff.key}
                  diff={diff}
                  isSelected={isSelectedDiff(diff)}
                  openDiff={openChange(diff)}
                />
              ))}

              {Boolean(reviewStore.reviewReport?.fromToProjectConfig) && (
                <button
                  className={clsx('side-bar__panel__item', {
                    'side-bar__panel__item--selected':
                      editorStore.tabManagerState.currentTab instanceof
                      ProjectConfigurationDiffEditorState,
                  })}
                  tabIndex={-1}
                  title={`Project Configuration Modified`}
                  onClick={openConfiguration}
                >
                  <div className="diff-panel__item__info">
                    <span
                      className={clsx(
                        'diff-panel__item__info-name',
                        `diff-panel__item__info-name--${EntityChangeType.MODIFY.toLowerCase()}`,
                      )}
                    >
                      config
                    </span>
                    <span className="diff-panel__item__info-path">
                      project configuration
                    </span>
                  </div>
                  <div
                    className={clsx(
                      'diff-panel__item__type',
                      `diff-panel__item__type--${EntityChangeType.MODIFY.toLowerCase()}`,
                    )}
                  >
                    {getChangeTypeIconFromChange(EntityChangeType.MODIFY)}
                  </div>
                </button>
              )}
            </PanelContent>
          </div>
        </div>
      </div>
    </div>
  );
});
