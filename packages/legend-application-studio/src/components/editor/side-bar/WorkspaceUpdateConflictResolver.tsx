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
import { EntityDiffViewState } from '../../../stores/editor/editor-state/entity-diff-editor-state/EntityDiffViewState.js';
import { EntityDiffSideBarItem } from '../editor-group/diff-editor/EntityDiffView.js';
import {
  PanelLoadingIndicator,
  CloudDownloadIcon,
  CheckIcon,
  TimesIcon,
  InfoCircleIcon,
  BanIcon,
  PanelContent,
} from '@finos/legend-art';
import { EntityChangeConflictSideBarItem } from '../editor-group/diff-editor/EntityChangeConflictEditor.js';
import { EntityChangeConflictEditorState } from '../../../stores/editor/editor-state/entity-diff-editor-state/EntityChangeConflictEditorState.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../__lib__/LegendStudioTesting.js';
import { flowResult } from 'mobx';
import type {
  EntityChangeConflict,
  EntityDiff,
} from '@finos/legend-server-sdlc';
import { entityDiffSorter } from '../../../stores/editor/EditorSDLCState.js';
import { useEditorStore } from '../EditorStoreProvider.js';
import { useApplicationStore } from '@finos/legend-application';

export const WorkspaceUpdateConflictResolver = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const sdlcState = editorStore.sdlcState;
  const currentTabState = editorStore.tabManagerState.currentTab;
  const conflictResolutionState = editorStore.conflictResolutionState;
  // Actions
  const isRunningTask =
    editorStore.workspaceUpdaterState.isUpdatingWorkspace ||
    conflictResolutionState.isInitializingConflictResolution ||
    conflictResolutionState.isAcceptingConflictResolution ||
    conflictResolutionState.isDiscardingConflictResolutionChanges ||
    conflictResolutionState.isAbortingConflictResolution;
  const updateWorkspace = applicationStore.guardUnhandledError(() =>
    flowResult(editorStore.workspaceUpdaterState.updateWorkspace()),
  );
  const accept = applicationStore.guardUnhandledError(() =>
    flowResult(conflictResolutionState.acceptConflictResolution()),
  );
  const discardChanges = applicationStore.guardUnhandledError(() =>
    flowResult(conflictResolutionState.discardConflictResolutionChanges()),
  );
  const abort = applicationStore.guardUnhandledError(() =>
    flowResult(conflictResolutionState.abortConflictResolution()),
  );
  // Conflicts
  const conflicts = conflictResolutionState.conflicts;
  const isSelectedConflict = (conflict: EntityChangeConflict): boolean =>
    currentTabState instanceof EntityChangeConflictEditorState &&
    conflict.entityPath === currentTabState.entityPath;
  const openConflict =
    (conflict: EntityChangeConflict): (() => void) =>
    (): void =>
      conflictResolutionState.openConflict(conflict);
  // Changes
  const changes = conflictResolutionState.changes;
  const openChange =
    (diff: EntityDiff): (() => void) =>
    (): void =>
      conflictResolutionState.openConflictResolutionChange(diff);
  const isSelectedDiff = (diff: EntityDiff): boolean =>
    currentTabState instanceof EntityDiffViewState &&
    diff.oldPath === currentTabState.fromEntityPath &&
    diff.newPath === currentTabState.toEntityPath;

  return (
    <div className="panel conflict-resolution">
      <div className="panel__header side-bar__header">
        <div className="panel__header__title conflict-resolution__header__title">
          <div className="panel__header__title__content side-bar__header__title__content">
            CONFLICT RESOLUTION
          </div>
        </div>
        <div className="panel__header__actions side-bar__header__actions">
          <button
            className="panel__header__action side-bar__header__action conflict-resolution__update-btn"
            onClick={updateWorkspace}
            disabled={!sdlcState.isWorkspaceOutdated || isRunningTask}
            tabIndex={-1}
            title="Update workspace"
          >
            <CloudDownloadIcon />
          </button>
          <button
            className="panel__header__action side-bar__header__action"
            onClick={accept}
            disabled={
              !conflictResolutionState.hasResolvedAllConflicts || isRunningTask
            }
            tabIndex={-1}
            title="Accept resolution"
          >
            <CheckIcon />
          </button>
          <button
            className="panel__header__action side-bar__header__action"
            onClick={discardChanges}
            disabled={isRunningTask}
            tabIndex={-1}
            title="Discard all changes made in the workspace"
          >
            <TimesIcon />
          </button>
          <button
            className="panel__header__action side-bar__header__action"
            onClick={abort}
            disabled={isRunningTask}
            tabIndex={-1}
            title="Abort conflict resolution"
          >
            <BanIcon />
          </button>
        </div>
      </div>
      <div className="panel__content side-bar__content">
        <PanelLoadingIndicator isLoading={isRunningTask} />
        <div className="panel side-bar__panel">
          <div className="panel__header">
            <div className="panel__header__title">
              <div className="panel__header__title__content">CHANGES</div>
              <div
                className="side-bar__panel__title__info"
                title="All changes made in the workspace applied on top of the project revision the workspace is updated to"
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
              {changes.length +
                (conflictResolutionState.hasResolvedAllConflicts
                  ? 0
                  : conflicts.length)}
            </div>
          </div>
          <PanelContent>
            {!conflictResolutionState.hasResolvedAllConflicts && (
              <>
                {conflicts
                  .toSorted((a, b) => a.entityName.localeCompare(b.entityName))
                  .map((conflict) => (
                    <EntityChangeConflictSideBarItem
                      key={`conflict-${conflict.entityPath}`}
                      conflict={conflict}
                      isSelected={isSelectedConflict(conflict)}
                      openConflict={openConflict(conflict)}
                    />
                  ))}
                {Boolean(conflicts.length) && Boolean(changes.length) && (
                  <div className="diff-panel__item-section-separator" />
                )}
                {changes.toSorted(entityDiffSorter).map((diff) => (
                  <EntityDiffSideBarItem
                    key={diff.key}
                    diff={diff}
                    isSelected={isSelectedDiff(diff)}
                    openDiff={openChange(diff)}
                  />
                ))}
              </>
            )}
            {conflictResolutionState.hasResolvedAllConflicts &&
              changes
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
      </div>
    </div>
  );
});
