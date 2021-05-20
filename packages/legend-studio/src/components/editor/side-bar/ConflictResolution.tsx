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
import { useEditorStore } from '../../../stores/EditorStore';
import type { EntityDiff } from '../../../models/sdlc/models/comparison/EntityDiff';
import { entityDiffSorter } from '../../../models/sdlc/models/comparison/EntityDiff';
import { EntityDiffViewState } from '../../../stores/editor-state/entity-diff-editor-state/EntityDiffViewState';
import { EntityDiffSideBarItem } from '../../editor/edit-panel/diff-editor/EntityDiffView';
import { GoCloudDownload } from 'react-icons/go';
import { FaCheck, FaTimes, FaBan, FaInfoCircle } from 'react-icons/fa';
import { PanelLoadingIndicator } from '@finos/legend-studio-components';
import { EntityChangeConflictSideBarItem } from '../../editor/edit-panel/diff-editor/EntityChangeConflictEditor';
import type { EntityChangeConflict } from '../../../models/sdlc/models/entity/EntityChangeConflict';
import { EntityChangeConflictEditorState } from '../../../stores/editor-state/entity-diff-editor-state/EntityChangeConflictEditorState';
import { useApplicationStore } from '../../../stores/ApplicationStore';
import { CORE_TEST_ID } from '../../../const';

export const ConflictResolution = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const sdlcState = editorStore.sdlcState;
  const currentEditorState = editorStore.currentEditorState;
  const conflictResolutionState = editorStore.conflictResolutionState;
  // Actions
  const isRunningTask =
    editorStore.workspaceUpdaterState.isUpdatingWorkspace ||
    conflictResolutionState.isInitializingConflictResolution ||
    conflictResolutionState.isAcceptingConflictResolution ||
    conflictResolutionState.isDiscardingConflictResolutionChanges ||
    conflictResolutionState.isAbortingConflictResolution;
  const updateWorkspace = applicationStore.guaranteeSafeAction(() =>
    editorStore.workspaceUpdaterState.updateWorkspace(),
  );
  const accept = applicationStore.guaranteeSafeAction(() =>
    conflictResolutionState.acceptConflictResolution(),
  );
  const discardChanges = applicationStore.guaranteeSafeAction(() =>
    conflictResolutionState.discardConflictResolutionChanges(),
  );
  const abort = applicationStore.guaranteeSafeAction(() =>
    conflictResolutionState.abortConflictResolution(),
  );
  // Conflicts
  const conflicts = conflictResolutionState.conflicts;
  const isSelectedConflict = (conflict: EntityChangeConflict): boolean =>
    currentEditorState instanceof EntityChangeConflictEditorState &&
    conflict.entityPath === currentEditorState.entityPath;
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
    currentEditorState instanceof EntityDiffViewState &&
    diff.oldPath === currentEditorState.fromEntityPath &&
    diff.newPath === currentEditorState.toEntityPath;

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
            <GoCloudDownload />
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
            <FaCheck />
          </button>
          <button
            className="panel__header__action side-bar__header__action"
            onClick={discardChanges}
            disabled={isRunningTask}
            tabIndex={-1}
            title="Discard all changes made in the workspace"
          >
            <FaTimes />
          </button>
          <button
            className="panel__header__action side-bar__header__action"
            onClick={abort}
            disabled={isRunningTask}
            tabIndex={-1}
            title="Abort conflict resolution"
          >
            <FaBan />
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
                <FaInfoCircle />
              </div>
            </div>
            <div
              className="side-bar__panel__header__changes-count"
              data-testid={CORE_TEST_ID.SIDEBAR_PANEL_HEADER__CHANGES_COUNT}
            >
              {changes.length +
                (conflictResolutionState.hasResolvedAllConflicts
                  ? 0
                  : conflicts.length)}
            </div>
          </div>
          <div className="panel__content">
            {!conflictResolutionState.hasResolvedAllConflicts && (
              <>
                {conflicts
                  .slice()
                  .sort((a, b) => a.entityName.localeCompare(b.entityName))
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
              </>
            )}
            {conflictResolutionState.hasResolvedAllConflicts &&
              changes
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
  );
});
