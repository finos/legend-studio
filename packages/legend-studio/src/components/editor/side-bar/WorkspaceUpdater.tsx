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
import { useEditorStore } from '../../../stores/EditorStore';
import type { EntityDiff } from '../../../models/sdlc/models/comparison/EntityDiff';
import { entityDiffSorter } from '../../../models/sdlc/models/comparison/EntityDiff';
import { EntityDiffViewState } from '../../../stores/editor-state/entity-diff-editor-state/EntityDiffViewState';
import { EntityDiffSideBarItem } from '../../editor/edit-panel/diff-editor/EntityDiffView';
import { FaInfoCircle } from 'react-icons/fa';
import { GoCloudDownload } from 'react-icons/go';
import { MdRefresh } from 'react-icons/md';
import { clsx, PanelLoadingIndicator } from '@finos/legend-studio-components';
import SplitPane from 'react-split-pane';
import { Link } from 'react-router-dom';
import type { EntityChangeConflict } from '../../../models/sdlc/models/entity/EntityChangeConflict';
import { EntityChangeConflictSideBarItem } from '../../editor/edit-panel/diff-editor/EntityChangeConflictEditor';
import {
  ActionAlertType,
  ActionAlertActionType,
  useApplicationStore,
} from '../../../stores/ApplicationStore';
import { EntityChangeConflictEditorState } from '../../../stores/editor-state/entity-diff-editor-state/EntityChangeConflictEditorState';
import { generateReviewRoute } from '../../../stores/Router';
import { CORE_TEST_ID } from '../../../const';

export const WorkspaceUpdater = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const sdlcState = editorStore.sdlcState;
  const currentEditorState = editorStore.currentEditorState;
  const workspaceUpdaterState = editorStore.workspaceUpdaterState;
  // Actions
  const updateWorkspace = (): void => {
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
            label: 'Proceed to update workspace',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler: (): void => {
              editorStore.setIgnoreNavigationBlocking(true);
              workspaceUpdaterState
                .updateWorkspace()
                .catch(applicationStore.alertIllegalUnhandledError);
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
      workspaceUpdaterState
        .updateWorkspace()
        .catch(applicationStore.alertIllegalUnhandledError);
    }
  };
  const refreshWorkspaceUpdater = applicationStore.guaranteeSafeAction(() =>
    workspaceUpdaterState.refreshWorkspaceUpdater(),
  );
  const isDispatchingAction =
    workspaceUpdaterState.isUpdatingWorkspace ||
    sdlcState.isCheckingIfWorkspaceIsOutdated ||
    workspaceUpdaterState.isRefreshingWorkspaceUpdater;
  // Conflicts
  const conflicts =
    editorStore.changeDetectionState.potentialWorkspaceUpdateConflicts;
  const isSelectedConflict = (conflict: EntityChangeConflict): boolean =>
    currentEditorState instanceof EntityChangeConflictEditorState &&
    conflict.entityPath === currentEditorState.entityPath;
  const openPotentialConflict =
    (conflict: EntityChangeConflict): (() => void) =>
    (): void =>
      workspaceUpdaterState.openPotentialWorkspaceUpdateConflict(conflict);
  // Changes
  const changes =
    editorStore.changeDetectionState.aggregatedProjectLatestChanges;
  const changesWithoutConflicts = changes.filter(
    (change) =>
      !conflicts
        .map((conflict) => conflict.entityPath)
        .includes(change.entityPath),
  );
  const isSelectedDiff = (diff: EntityDiff): boolean =>
    currentEditorState instanceof EntityDiffViewState &&
    diff.oldPath === currentEditorState.fromEntityPath &&
    diff.newPath === currentEditorState.toEntityPath;
  const openChange =
    (diff: EntityDiff): (() => void) =>
    (): void =>
      workspaceUpdaterState.openProjectLatestChange(diff);
  // Committed Reviews
  const commitedReviews =
    workspaceUpdaterState.committedReviewsBetweenWorkspaceBaseAndProjectLatest;

  // since the project latest changes can be affected by other users, we refresh it more proactively
  useEffect(() => {
    workspaceUpdaterState
      .refreshWorkspaceUpdater()
      .catch(applicationStore.alertIllegalUnhandledError);
  }, [applicationStore, workspaceUpdaterState]);

  return (
    <div className="panel workspace-updater">
      <div className="panel__header side-bar__header">
        <div className="panel__header__title workspace-updater__header__title">
          <div className="panel__header__title__content side-bar__header__title__content">
            WORKSPACE UPDATER
          </div>
        </div>
        <div className="panel__header__actions side-bar__header__actions">
          <button
            className={clsx(
              'panel__header__action side-bar__header__action workspace-updater__refresh-btn',
              {
                'workspace-updater__refresh-btn--loading':
                  workspaceUpdaterState.isRefreshingWorkspaceUpdater,
              },
            )}
            onClick={refreshWorkspaceUpdater}
            disabled={isDispatchingAction}
            tabIndex={-1}
            title="Refresh"
          >
            <MdRefresh />
          </button>
          <button
            className="panel__header__action side-bar__header__action workspace-updater__update-btn"
            onClick={updateWorkspace}
            disabled={!sdlcState.isWorkspaceOutdated || isDispatchingAction}
            tabIndex={-1}
            title="Update workspace"
          >
            <GoCloudDownload />
          </button>
        </div>
      </div>
      <div className="panel__content side-bar__content">
        <PanelLoadingIndicator isLoading={isDispatchingAction} />
        <SplitPane
          split="horizontal"
          defaultSize="50%"
          minSize={28}
          maxSize={-28}
        >
          <div className="panel side-bar__panel">
            <div className="panel__header">
              <div className="panel__header__title">
                <div className="panel__header__title__content">CHANGES</div>
                <div
                  className="side-bar__panel__title__info"
                  title={
                    'All changes made to project since the revision the workspace is created.\nPotential workspace update conflicts are also shown if they exist'
                  }
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
              {conflicts
                .slice()
                .sort((a, b) => a.entityName.localeCompare(b.entityName))
                .map((conflict) => (
                  <EntityChangeConflictSideBarItem
                    key={`conflict-${conflict.entityPath}`}
                    conflict={conflict}
                    isSelected={isSelectedConflict(conflict)}
                    openConflict={openPotentialConflict(conflict)}
                  />
                ))}
              {Boolean(conflicts.length) &&
                Boolean(changesWithoutConflicts.length) && (
                  <div className="diff-panel__item-section-separator" />
                )}
              {changesWithoutConflicts
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
          <div className="panel side-bar__panel">
            <div className="panel__header">
              <div className="panel__header__title">
                <div className="panel__header__title__content">
                  COMMITTED REVIEWS
                </div>
                <div
                  className="side-bar__panel__title__info"
                  title="All committed reviews in the project since the revision the workspace is created"
                >
                  <FaInfoCircle />
                </div>
              </div>
              <div
                className="side-bar__panel__header__changes-count"
                data-testid={CORE_TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT}
              >
                {commitedReviews.length}
              </div>
            </div>
            <div className="panel__content">
              {commitedReviews.map((review) => (
                <Link
                  key={review.id}
                  className="side-bar__panel__item workspace-updater__review__link"
                  rel="noopener noreferrer"
                  target="_blank"
                  to={generateReviewRoute(
                    applicationStore.config.sdlcServerKey,
                    review.projectId,
                    review.id,
                  )}
                  title={'See review detail'}
                >
                  <div className="workspace-updater__review">
                    <span className="workspace-updater__review__name">
                      {review.title}
                    </span>
                    <span className="workspace-updater__review__info">
                      {review.author.name}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </SplitPane>
      </div>
    </div>
  );
});
