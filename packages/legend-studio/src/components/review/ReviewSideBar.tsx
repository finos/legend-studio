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
import { useReviewStore } from '../../stores/ReviewStore';
import { EntityDiffSideBarItem } from '../editor/edit-panel/diff-editor/EntityDiffView';
import { ReviewState } from '../../models/sdlc/models/review/Review';
import { FaInfoCircle, FaTimes, FaArrowUp, FaCheck } from 'react-icons/fa';
import { clsx, PanelLoadingIndicator } from '@finos/legend-studio-components';
import { formatDistanceToNow } from 'date-fns';
import { FiGitMerge } from 'react-icons/fi';
import type { EntityDiff } from '../../models/sdlc/models/comparison/EntityDiff';
import { entityDiffSorter } from '../../models/sdlc/models/comparison/EntityDiff';
import { useEditorStore } from '../../stores/EditorStore';
import { EntityDiffViewState } from '../../stores/editor-state/entity-diff-editor-state/EntityDiffViewState';
import { useApplicationStore } from '../../stores/ApplicationStore';
import { CORE_TEST_ID } from '../../const';

export const ReviewSideBar = observer(() => {
  const reviewStore = useReviewStore();
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  // Review infos
  const review = reviewStore.review;
  const currentUser =
    applicationStore.networkClientManager.sdlcClient.currentUser;
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
    reviewStore.isFetchingComparison ||
    reviewStore.isApprovingReview ||
    reviewStore.isClosingReview ||
    reviewStore.isCommittingReview ||
    reviewStore.isReopeningReview;
  const closeReview = applicationStore.guaranteeSafeAction(() =>
    reviewStore.closeReview(),
  );
  const reOpenReview = applicationStore.guaranteeSafeAction(() =>
    reviewStore.reOpenReview(),
  );
  const commitReview = applicationStore.guaranteeSafeAction(() =>
    reviewStore.commitReview(),
  );
  const approveReview = applicationStore.guaranteeSafeAction(() =>
    reviewStore.approveReview(),
  );
  // Changes
  const changes = editorStore.changeDetectionState.aggregatedWorkspaceChanges;
  const currentEditorState = editorStore.currentEditorState;
  const isSelectedDiff = (diff: EntityDiff): boolean =>
    currentEditorState instanceof EntityDiffViewState &&
    diff.oldPath === currentEditorState.fromEntityPath &&
    diff.newPath === currentEditorState.toEntityPath;
  const openChange =
    (diff: EntityDiff): (() => void) =>
    (): void =>
      editorStore.workspaceReviewState.openReviewChange(diff);

  return (
    <div className="panel review__side-bar">
      <div className="panel__header side-bar__header">
        <div className="panel__header__title review__side-bar__header__title">
          <div className="panel__header__title__content side-bar__header__title__content">
            REVIEW
          </div>
        </div>
        <div className="panel__header__actions side-bar__header__actions">
          {review.state !== ReviewState.COMMITTED && (
            <button
              className="panel__header__action side-bar__header__action review__close-btn"
              disabled={
                isDispatchingAction || review.state === ReviewState.CLOSED
              }
              onClick={closeReview}
              tabIndex={-1}
              title="Close review"
            >
              <FaTimes />
            </button>
          )}
        </div>
      </div>
      <div className="panel__content side-bar__content">
        <PanelLoadingIndicator isLoading={isDispatchingAction} />
        <div className="panel workspace-review">
          <div className="review__side-bar__review__info">
            <div
              className={clsx(
                'review__side-bar__review__info__content',
                {
                  'review__side-bar__review__info__content--closed':
                    review.state === ReviewState.CLOSED,
                },
                {
                  'review__side-bar__review__info__content--committed':
                    review.state === ReviewState.COMMITTED,
                },
              )}
            >
              <div className="review__side-bar__review__info__content__title">
                <span className="review__side-bar__review__info__content__title__review-name">
                  {review.title}
                </span>
              </div>
            </div>
            {review.state === ReviewState.CLOSED && (
              <button
                className="review__side-bar__review__info__action btn--dark btn--sm"
                onClick={reOpenReview}
                disabled={isDispatchingAction}
                tabIndex={-1}
                title={'Re-open review'}
              >
                <FaArrowUp />
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
                  title={'Approve review'}
                >
                  <FaCheck />
                </button>
                <button
                  className="btn--dark btn--sm review__side-bar__merge-btn"
                  onClick={commitReview}
                  // TODO: when we improve approval APIs we can know when to hide/disable this button altogether
                  disabled={isDispatchingAction}
                  tabIndex={-1}
                  title={'Commit review'}
                >
                  <FiGitMerge />
                </button>
              </>
            )}
          </div>
          <div className="review__side-bar__review__info__content__status">
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
                  <FaInfoCircle />
                </div>
              </div>
              <div
                className="side-bar__panel__header__changes-count"
                data-testid={CORE_TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT}
              >
                {changes.length}
              </div>
            </div>
            <div className="panel__content">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
