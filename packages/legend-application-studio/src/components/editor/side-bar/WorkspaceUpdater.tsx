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
import { EntityDiffViewState } from '../../../stores/editor/editor-state/entity-diff-editor-state/EntityDiffViewState.js';
import { EntityDiffSideBarItem } from '../editor-group/diff-editor/EntityDiffView.js';
import {
  clsx,
  PanelLoadingIndicator,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  CloudDownloadIcon,
  RefreshIcon,
  InfoCircleIcon,
  PanelContent,
} from '@finos/legend-art';
import { EntityChangeConflictSideBarItem } from '../editor-group/diff-editor/EntityChangeConflictEditor.js';
import { EntityChangeConflictEditorState } from '../../../stores/editor/editor-state/entity-diff-editor-state/EntityChangeConflictEditorState.js';
import { generateReviewRoute } from '../../../__lib__/LegendStudioNavigation.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../__lib__/LegendStudioTesting.js';
import { flowResult } from 'mobx';
import type {
  EntityChangeConflict,
  EntityDiff,
} from '@finos/legend-server-sdlc';
import { entityDiffSorter } from '../../../stores/editor/EditorSDLCState.js';
import { useEditorStore } from '../EditorStoreProvider.js';
import { useLegendStudioApplicationStore } from '../../LegendStudioFrameworkProvider.js';

export const WorkspaceUpdater = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useLegendStudioApplicationStore();
  const sdlcState = editorStore.sdlcState;
  const currentTabState = editorStore.tabManagerState.currentTab;
  const workspaceUpdaterState = editorStore.workspaceUpdaterState;
  // Actions
  const updateWorkspace = (): void => {
    editorStore.localChangesState.alertUnsavedChanges((): void => {
      flowResult(workspaceUpdaterState.updateWorkspace()).catch(
        applicationStore.alertUnhandledError,
      );
    });
  };
  const refreshWorkspaceUpdater = applicationStore.guardUnhandledError(() =>
    flowResult(workspaceUpdaterState.refreshWorkspaceUpdater()),
  );
  const isDispatchingAction =
    workspaceUpdaterState.isUpdatingWorkspace ||
    sdlcState.isCheckingIfWorkspaceIsOutdated ||
    workspaceUpdaterState.isRefreshingWorkspaceUpdater;
  // Conflicts
  const conflicts =
    editorStore.changeDetectionState.potentialWorkspaceUpdateConflicts;
  const isSelectedConflict = (conflict: EntityChangeConflict): boolean =>
    currentTabState instanceof EntityChangeConflictEditorState &&
    conflict.entityPath === currentTabState.entityPath;
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
    currentTabState instanceof EntityDiffViewState &&
    diff.oldPath === currentTabState.fromEntityPath &&
    diff.newPath === currentTabState.toEntityPath;
  const openChange =
    (diff: EntityDiff): (() => void) =>
    (): void =>
      workspaceUpdaterState.openProjectLatestChange(diff);
  // Committed Reviews
  const commitedReviews =
    workspaceUpdaterState.committedReviewsBetweenWorkspaceBaseAndProjectLatest;

  // since the project latest changes can be affected by other users, we refresh it more proactively
  useEffect(() => {
    flowResult(workspaceUpdaterState.refreshWorkspaceUpdater()).catch(
      applicationStore.alertUnhandledError,
    );
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
            <RefreshIcon />
          </button>
          <button
            className="panel__header__action side-bar__header__action workspace-updater__update-btn"
            onClick={updateWorkspace}
            disabled={!sdlcState.isWorkspaceOutdated || isDispatchingAction}
            tabIndex={-1}
            title="Update workspace"
          >
            <CloudDownloadIcon />
          </button>
        </div>
      </div>
      <div className="panel__content side-bar__content">
        <PanelLoadingIndicator isLoading={isDispatchingAction} />
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel size={400} minSize={28}>
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
                {conflicts
                  .toSorted((a, b) => a.entityName.localeCompare(b.entityName))
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
                  .toSorted(entityDiffSorter)
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
          </ResizablePanel>
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine color="var(--color-dark-grey-100)" />
          </ResizablePanelSplitter>
          <ResizablePanel minSize={28}>
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
                    <InfoCircleIcon />
                  </div>
                </div>
                <div
                  className="side-bar__panel__header__changes-count"
                  data-testid={
                    LEGEND_STUDIO_TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT
                  }
                >
                  {commitedReviews.length}
                </div>
              </div>
              <PanelContent>
                {commitedReviews.map((review) => (
                  <button
                    key={review.id}
                    className="side-bar__panel__item workspace-updater__review__link"
                    title="See review"
                    tabIndex={-1}
                    onClick={(): void =>
                      applicationStore.navigationService.navigator.visitAddress(
                        applicationStore.navigationService.navigator.generateAddress(
                          generateReviewRoute(review.projectId, review.id),
                        ),
                      )
                    }
                  >
                    <div className="workspace-updater__review">
                      <span className="workspace-updater__review__name">
                        {review.title}
                      </span>
                      <span className="workspace-updater__review__info">
                        {review.author.name}
                      </span>
                    </div>
                  </button>
                ))}
              </PanelContent>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
});
