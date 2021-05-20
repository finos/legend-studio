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
import { clsx, PanelLoadingIndicator } from '@finos/legend-studio-components';
import type { EntityDiff } from '../../../models/sdlc/models/comparison/EntityDiff';
import { entityDiffSorter } from '../../../models/sdlc/models/comparison/EntityDiff';
import { EntityDiffViewState } from '../../../stores/editor-state/entity-diff-editor-state/EntityDiffViewState';
import { EntityDiffSideBarItem } from '../../editor/edit-panel/diff-editor/EntityDiffView';
import { FaInfoCircle, FaDownload } from 'react-icons/fa';
import { MdRefresh } from 'react-icons/md';
import { GoSync } from 'react-icons/go';
import { useApplicationStore } from '../../../stores/ApplicationStore';
import { CORE_TEST_ID } from '../../../const';

export const LocalChanges = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const localChangesState = editorStore.localChangesState;
  // Actions
  const downloadLocalChanges = (): void =>
    localChangesState.downloadLocalChanges();
  const syncingWithWorkspace = applicationStore.guaranteeSafeAction(() =>
    localChangesState.syncWithWorkspace(),
  );
  const refreshLocalChanges = applicationStore.guaranteeSafeAction(() =>
    localChangesState.refreshLocalChanges(),
  );
  const isDispatchingAction =
    localChangesState.isSyncingWithWorkspace ||
    localChangesState.isRefreshingLocalChangesDetector;
  // Changes
  const currentEditorState = editorStore.currentEditorState;
  const isSelectedDiff = (diff: EntityDiff): boolean =>
    currentEditorState instanceof EntityDiffViewState &&
    diff.oldPath === currentEditorState.fromEntityPath &&
    diff.newPath === currentEditorState.toEntityPath;
  const changes =
    editorStore.changeDetectionState.workspaceLatestRevisionState.changes;
  const openChange =
    (diff: EntityDiff): (() => void) =>
    (): void =>
      localChangesState.openLocalChange(diff);

  return (
    <div className="panel local-changes">
      <div className="panel__header side-bar__header">
        <div className="panel__header__title local-changes__header__title">
          <div className="panel__header__title__content side-bar__header__title__content">
            LOCAL CHANGES
          </div>
        </div>
        <div className="panel__header__actions side-bar__header__actions">
          <button
            className="panel__header__action side-bar__header__action local-changes__download-patch-btn"
            onClick={downloadLocalChanges}
            disabled={
              isDispatchingAction ||
              editorStore.workspaceUpdaterState.isUpdatingWorkspace ||
              !changes.length
            }
            tabIndex={-1}
            title="Download local entity changes"
          >
            <FaDownload />
          </button>
          <button
            className={clsx(
              'panel__header__action side-bar__header__action local-changes__refresh-btn',
              {
                'local-changes__refresh-btn--loading':
                  localChangesState.isRefreshingLocalChangesDetector,
              },
            )}
            onClick={refreshLocalChanges}
            disabled={isDispatchingAction}
            tabIndex={-1}
            title="Refresh"
          >
            <MdRefresh />
          </button>
          <button
            className={clsx(
              'panel__header__action side-bar__header__action local-changes__sync-btn',
              {
                'local-changes__sync-btn--loading':
                  localChangesState.isSyncingWithWorkspace,
              },
            )}
            onClick={syncingWithWorkspace}
            disabled={
              isDispatchingAction ||
              editorStore.workspaceUpdaterState.isUpdatingWorkspace
            }
            tabIndex={-1}
            title="Sync with workspace (Ctrl + S)"
          >
            <GoSync />
          </button>
        </div>
      </div>
      <div className="panel__content side-bar__content">
        <PanelLoadingIndicator isLoading={isDispatchingAction} />
        <div className="panel side-bar__panel">
          <div className="panel__header">
            <div className="panel__header__title">
              <div className="panel__header__title__content">CHANGES</div>
              <div
                className="side-bar__panel__title__info"
                title="All local changes that have not been yet synced with the server"
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
  );
});
