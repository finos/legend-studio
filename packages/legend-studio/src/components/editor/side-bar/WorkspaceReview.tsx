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
import { useEditorStore } from '../../../stores/EditorStore';
import {
  FaInfoCircle,
  FaTimes,
  FaPlus,
  FaExternalLinkSquareAlt,
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { EntityDiffViewState } from '../../../stores/editor-state/entity-diff-editor-state/EntityDiffViewState';
import { EntityDiffSideBarItem } from '../../editor/edit-panel/diff-editor/EntityDiffView';
import type { EntityDiff } from '../../../models/sdlc/models/comparison/EntityDiff';
import { entityDiffSorter } from '../../../models/sdlc/models/comparison/EntityDiff';
import { clsx, PanelLoadingIndicator } from '@finos/legend-studio-components';
import { MdRefresh } from 'react-icons/md';
import { ACTIVITY_MODE } from '../../../stores/EditorConfig';
import { formatDistanceToNow } from 'date-fns';
import { FiGitMerge } from 'react-icons/fi';
import {
  ActionAlertType,
  ActionAlertActionType,
  useApplicationStore,
} from '../../../stores/ApplicationStore';
import { generateReviewRoute } from '../../../stores/Router';
import { CORE_TEST_ID } from '../../../const';
import { flowResult } from 'mobx';

export const WorkspaceReviewDiffs = observer(() => {
  const editorStore = useEditorStore();
  const workspaceReviewState = editorStore.workspaceReviewState;
  const currentEditorState = editorStore.currentEditorState;
  const changes = editorStore.changeDetectionState.aggregatedWorkspaceChanges;
  const isSelectedDiff = (diff: EntityDiff): boolean =>
    currentEditorState instanceof EntityDiffViewState &&
    diff.oldPath === currentEditorState.fromEntityPath &&
    diff.newPath === currentEditorState.toEntityPath;
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
  );
});

export const WorkspaceReview = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const workspaceReviewState = editorStore.workspaceReviewState;
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
      applicationStore.alertIllegalUnhandledError,
    );
    flowResult(workspaceReviewState.fetchCurrentWorkspaceReview()).catch(
      applicationStore.alertIllegalUnhandledError,
    );
  };
  const closeReview = (): void => {
    workspaceReviewState.setReviewTitle('');
    workspaceReviewState
      .closeWorkspaceReview()
      .catch(applicationStore.alertIllegalUnhandledError);
  };
  const commitReview = (): void => {
    if (workspaceReview && !isDispatchingAction) {
      const commit = (): void => {
        workspaceReviewState.setReviewTitle('');
        workspaceReviewState
          .commitWorkspaceReview(workspaceReview)
          .catch(applicationStore.alertIllegalUnhandledError);
      };
      if (editorStore.hasUnsyncedChanges) {
        editorStore.setActionAltertInfo({
          message: 'You have unsynced changes',
          prompt:
            'This action will discard these changes and refresh the application',
          type: ActionAlertType.CAUTION,
          onEnter: (): void => editorStore.setBlockGlobalHotkeys(true),
          onClose: (): void => editorStore.setBlockGlobalHotkeys(false),
          actions: [
            {
              label: 'Proceed to commit review',
              type: ActionAlertActionType.PROCEED_WITH_CAUTION,
              handler: (): void => {
                editorStore.setIgnoreNavigationBlocking(true);
                commit();
              },
            },
            {
              label: 'Abort',
              type: ActionAlertActionType.PROCEED,
              default: true,
            },
          ],
        });
      } else {
        commit();
      }
    }
  };
  const createReview = (): void => {
    if (
      workspaceReviewState.reviewTitle &&
      !workspaceReview &&
      !isDispatchingAction
    ) {
      workspaceReviewState
        .createWorkspaceReview(workspaceReviewState.reviewTitle)
        .catch(applicationStore.alertIllegalUnhandledError);
    }
  };

  // since the review can be changed by other people, we can refresh it more proactively
  // the diffs are caused by the current user though, so we should handle that as part
  // of `syncWithWorkspace` for example; in case it is bad, user can click refresh to make it right again
  useEffect(() => {
    flowResult(workspaceReviewState.fetchCurrentWorkspaceReview()).catch(
      applicationStore.alertIllegalUnhandledError,
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
            <MdRefresh />
          </button>
          <button
            className="panel__header__action side-bar__header__action workspace-review__close-btn"
            disabled={!workspaceReview || isDispatchingAction}
            onClick={closeReview}
            tabIndex={-1}
            title="Close review"
          >
            <FaTimes />
          </button>
        </div>
      </div>
      <div className="panel__content side-bar__content">
        <PanelLoadingIndicator isLoading={isDispatchingAction} />
        <div className="panel workspace-review">
          {!workspaceReview && (
            <form
              className="workspace-review__title"
              onSubmit={(e): void => {
                e.preventDefault();
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
                  placeholder={'Title'}
                />
              </div>
              <button
                className="btn--dark btn--sm"
                onClick={createReview}
                disabled={
                  isDispatchingAction ||
                  Boolean(workspaceReview) ||
                  !workspaceReviewState.reviewTitle
                }
                title={'Create review'}
              >
                <FaPlus />
              </button>
            </form>
          )}
          {workspaceReview && (
            <>
              <div className="workspace-review__title">
                <div className="workspace-review__title__content">
                  <div
                    className="workspace-review__title__content__input workspace-review__title__content__input--with-link"
                    title={'See review detail'}
                  >
                    <Link
                      className="workspace-review__title__content__input__link"
                      rel="noopener noreferrer"
                      target="_blank"
                      to={generateReviewRoute(
                        applicationStore.config.sdlcServerKey,
                        workspaceReview.projectId,
                        workspaceReview.id,
                      )}
                    >
                      <span className="workspace-review__title__content__input__link__review-name">
                        {workspaceReview.title}
                      </span>
                      <div className="workspace-review__title__content__input__link__btn">
                        <FaExternalLinkSquareAlt />
                      </div>
                    </Link>
                  </div>
                </div>
                <button
                  className="btn--dark btn--sm workspace-review__merge-review-btn"
                  onClick={commitReview}
                  disabled={isDispatchingAction || Boolean(!workspaceReview)}
                  tabIndex={-1}
                  title={'Commit review'}
                >
                  <FiGitMerge />
                </button>
              </div>
              <div className="workspace-review__title__content__review-status">
                created{' '}
                {formatDistanceToNow(workspaceReview.createdAt, {
                  includeSeconds: true,
                  addSuffix: true,
                })}
              </div>
            </>
          )}
          <WorkspaceReviewDiffs />
        </div>
      </div>
    </div>
  );
});
