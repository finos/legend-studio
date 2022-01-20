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
import { useEditorStore } from '../EditorStoreProvider';
import { noop } from '@finos/legend-shared';
import {
  clsx,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  InfoCircleIcon,
  TimesIcon,
} from '@finos/legend-art';
import type {
  EntityChangeConflict,
  EntityDiff,
} from '@finos/legend-server-sdlc';
import {
  EntityChangeConflictEditor,
  EntityChangeConflictSideBarItem,
} from '../edit-panel/diff-editor/EntityChangeConflictEditor';
import { EntityChangeConflictEditorState } from '../../../stores/editor-state/entity-diff-editor-state/EntityChangeConflictEditorState';
import type { EntityDiffEditorState } from '../../../stores/editor-state/entity-diff-editor-state/EntityDiffEditorState';
import {
  EntityDiffSideBarItem,
  EntityDiffView,
} from '../edit-panel/diff-editor/EntityDiffView';
import { EntityDiffViewState } from '../../../stores/editor-state/entity-diff-editor-state/EntityDiffViewState';
import { entityDiffSorter } from '../../../stores/EditorSDLCState';
import { flowResult } from 'mobx';
import { Dialog } from '@mui/material';

export const WorkspaceSyncConflictResolver = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = editorStore.applicationStore;
  const updateState =
    editorStore.localChangesState.workspaceSyncState;
  const updateConflictState =
    updateState.workspaceSyncConflictResolutionState;
  const currentDiffEditorState = updateConflictState.currentDiffEditorState;
  const openMergedEditorStates = updateConflictState.openMergedEditorStates;
  const conflicts = updateConflictState.pendingConflicts;
  const changes = updateConflictState.changes;
  const openConflict =
    (conflict: EntityChangeConflict): (() => void) =>
    (): void => {
      updateConflictState.openConflict(conflict);
    };
  const isSelectedConflict = (conflict: EntityChangeConflict): boolean =>
    currentDiffEditorState instanceof EntityChangeConflictEditorState &&
    conflict.entityPath === currentDiffEditorState.entityPath;
  const closeTabOnMiddleClick =
    (conflictState: EntityDiffEditorState): React.MouseEventHandler =>
    (event): void => {
      if (event.nativeEvent.button === 1) {
        updateConflictState.closeConflict(conflictState);
      }
    };
  const closeTab =
    (conflictState: EntityDiffEditorState): React.MouseEventHandler =>
    (event): void =>
      updateConflictState.closeConflict(conflictState);
  const openTab =
    (conflictState: EntityDiffEditorState): (() => void) =>
    (): void =>
      updateConflictState.openState(conflictState);
  const isSelectedDiff = (diff: EntityDiff): boolean =>
    currentDiffEditorState instanceof EntityDiffViewState &&
    diff.oldPath === currentDiffEditorState.fromEntityPath &&
    diff.newPath === currentDiffEditorState.toEntityPath;
  const openChange =
    (diff: EntityDiff): (() => void) =>
    (): void => {
      updateConflictState.openConflictResolutionChange(diff);
    };
  const applyResolutions = (): void => {
    if (!conflicts.length) {
      flowResult(updateState.applyResolutionChanges()).catch(
        applicationStore.alertIllegalUnhandledError,
      );
    }
  };
  const abort = (): void => updateState.resetConflictState();
  return (
    <Dialog
      open={updateConflictState.showModal}
      onClose={noop}
      classes={{ container: 'search-modal__container' }}
      PaperProps={{ classes: { root: 'search-modal__inner-container' } }}
    >
      <div className="modal modal--dark editor-modal query-builder__dialog">
        <div className="modal__header">
          <div className="modal__title">Resolve Merge Conflicts</div>
        </div>
        <div className="modal__body">
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel size={350} minSize={350}>
              <div className="panel explorer">
                <div className="panel__header workspace-revision-updater__changes__header">
                  <div className="panel__header__title">
                    <div className="panel__header__title__content workspace-revision-updater__changes__header__title__content">
                      All Changes
                    </div>
                  </div>
                </div>
                <div className="panel__content explorer__content__container">
                  <ResizablePanelGroup orientation="horizontal">
                    <ResizablePanel size={600} minSize={28}>
                      <div className="panel workspace-revision-updater__changes__panel">
                        <div className="panel__header">
                          <div className="panel__header__title">
                            <div className="panel__header__title__content">
                              PENDING CONFLICTS
                            </div>
                            <div
                              className="workspace-revision-updater__changes__panel__title__info"
                              title="All local changes that have not been yet synced with the server"
                            >
                              <InfoCircleIcon />
                            </div>
                          </div>
                          <div className="workspace-revision-updater__changes__panel__header__changes-count">
                            {conflicts.length}
                          </div>
                        </div>
                        <div className="panel__content">
                          {conflicts
                            .slice()
                            .sort((a, b) =>
                              a.entityName.localeCompare(b.entityName),
                            )
                            .map((conflict) => (
                              <EntityChangeConflictSideBarItem
                                key={`conflict-${conflict.entityPath}`}
                                conflict={conflict}
                                isSelected={isSelectedConflict(conflict)}
                                openConflict={openConflict(conflict)}
                              />
                            ))}
                        </div>
                      </div>
                    </ResizablePanel>
                    <ResizablePanelSplitter>
                      <ResizablePanelSplitterLine color="var(--color-dark-grey-100)" />
                    </ResizablePanelSplitter>
                    <ResizablePanel minSize={20}>
                      <div className="panel workspace-revision-updater__changes__panel">
                        <div className="panel__header">
                          <div className="panel__header__title">
                            <div className="panel__header__title__content">
                              RESOLVED CHANGES
                            </div>
                            <div
                              className="workspace-revision-updater__changes__panel__title__info"
                              title="All committed reviews in the project since the revision the workspace is created"
                            >
                              <InfoCircleIcon />
                            </div>
                          </div>
                          <div className="workspace-revision-updater__changes__panel__header__changes-count">
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
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </div>
              </div>
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel>
              <div className="workspace-revision-updater">
                <div className="panel__header workspace-revision-updater__header">
                  <div className="workspace-revision-updater__header__tabs">
                    {openMergedEditorStates.map((editorState) => (
                      <div
                        key={editorState.uuid}
                        className={clsx(
                          'workspace-revision-updater__header__tab',
                          {
                            'workspace-revision-updaterl__header__tab--active':
                              editorState === currentDiffEditorState,
                          },
                        )}
                        onMouseUp={closeTabOnMiddleClick(editorState)}
                      >
                        <button
                          className="workspace-revision-updater__header__tab__label"
                          tabIndex={-1}
                          onClick={openTab(editorState)}
                          title={editorState.headerName}
                        >
                          {editorState.headerName}
                        </button>
                        <button
                          className="workspace-revision-updater__header__tab__close-btn"
                          onClick={closeTab(editorState)}
                          tabIndex={-1}
                          title={'Close'}
                        >
                          <TimesIcon />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="panel__content">
                  {updateConflictState.currentDiffEditorState instanceof
                    EntityChangeConflictEditorState && (
                    <EntityChangeConflictEditor
                      conflictEditorState={
                        updateConflictState.currentDiffEditorState
                      }
                    />
                  )}
                  {updateConflictState.currentDiffEditorState instanceof
                    EntityDiffViewState && (
                    <EntityDiffView
                      entityDiffViewState={
                        updateConflictState.currentDiffEditorState
                      }
                    />
                  )}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        <div className="modal__footer">
          <button
            type="button"
            className="btn btn--primary u-pull-right btn--dark"
            disabled={Boolean(conflicts.length)}
            title="Apply Resolutions"
            onClick={applyResolutions}
          >
            Apply Resolutions
          </button>
          <button
            type="button"
            title="Aborts"
            className="btn u-pull-right btn--dark"
            onClick={abort}
          >
            Abort
          </button>
        </div>
      </div>
    </Dialog>
  );
});
