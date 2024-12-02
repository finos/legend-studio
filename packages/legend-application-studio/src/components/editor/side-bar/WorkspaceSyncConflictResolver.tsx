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
import { useEditorStore } from '../EditorStoreProvider.js';
import { noop } from '@finos/legend-shared';
import {
  clsx,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  InfoCircleIcon,
  TimesIcon,
  Dialog,
  PanelContent,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalFooterButton,
} from '@finos/legend-art';
import type {
  EntityChangeConflict,
  EntityDiff,
} from '@finos/legend-server-sdlc';
import {
  EntityChangeConflictEditor,
  EntityChangeConflictSideBarItem,
} from '../editor-group/diff-editor/EntityChangeConflictEditor.js';
import { EntityChangeConflictEditorState } from '../../../stores/editor/editor-state/entity-diff-editor-state/EntityChangeConflictEditorState.js';
import type { EntityDiffViewerState } from '../../../stores/editor/editor-state/entity-diff-editor-state/EntityDiffEditorState.js';
import {
  EntityDiffSideBarItem,
  EntityDiffView,
} from '../editor-group/diff-editor/EntityDiffView.js';
import { EntityDiffViewState } from '../../../stores/editor/editor-state/entity-diff-editor-state/EntityDiffViewState.js';
import { entityDiffSorter } from '../../../stores/editor/EditorSDLCState.js';
import { flowResult } from 'mobx';
import { useApplicationStore } from '@finos/legend-application';

export const WorkspaceSyncConflictResolver = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const updateState = editorStore.localChangesState.workspaceSyncState;
  const updateConflictState = updateState.workspaceSyncConflictResolutionState;
  const currentDiffEditorState = updateConflictState.currentDiffEditorState;
  const openMergedEditorStates = updateConflictState.openMergedEditorStates;
  const conflicts = updateConflictState.pendingConflicts;
  const hadResolvedAllConflicts = !conflicts.length;
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
    (conflictState: EntityDiffViewerState): React.MouseEventHandler =>
    (event): void => {
      if (event.nativeEvent.button === 1) {
        updateConflictState.closeConflict(conflictState);
      }
    };
  const closeTab =
    (conflictState: EntityDiffViewerState): React.MouseEventHandler =>
    (event): void =>
      updateConflictState.closeConflict(conflictState);
  const openTab =
    (conflictState: EntityDiffViewerState): (() => void) =>
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
        applicationStore.alertUnhandledError,
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
      <Modal
        darkMode={
          !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
        }
        className="editor-modal query-builder__dialog"
      >
        <ModalHeader title="Resolve Merge Conflicts" />
        <ModalBody>
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel size={350} minSize={350}>
              <div className="panel explorer">
                <div className="panel__header workspace-sync-conflict-resolver__changes__header">
                  <div className="panel__header__title">
                    <div className="panel__header__title__content workspace-sync-conflict-resolver__changes__header__title__content">
                      All Changes
                    </div>
                  </div>
                </div>
                <div className="panel__content explorer__content__container">
                  <ResizablePanelGroup orientation="horizontal">
                    <div className="panel workspace-sync-conflict-resolver__changes__panel">
                      <div className="panel__header">
                        <div className="panel__header__title">
                          <div className="panel__header__title__content">
                            CHANGES
                          </div>
                          <div
                            className="workspace-sync-conflict-resolver__changes__panel__title__info"
                            title="All local changes that have not been yet pushed with the server"
                          >
                            <InfoCircleIcon />
                          </div>
                        </div>
                        <div className="workspace-sync-conflict-resolver__changes__panel__header__changes-count">
                          {changes.length + conflicts.length}
                        </div>
                      </div>
                      <PanelContent>
                        {!hadResolvedAllConflicts && (
                          <>
                            {conflicts
                              .toSorted((a, b) =>
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
                            {Boolean(conflicts.length) &&
                              Boolean(changes.length) && (
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
                        {hadResolvedAllConflicts &&
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
                  </ResizablePanelGroup>
                </div>
              </div>
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel>
              <div className="workspace-sync-conflict-resolver">
                <div className="workspace-sync-conflict-resolver__header">
                  <div className="workspace-sync-conflict-resolver__header__tabs">
                    {openMergedEditorStates.map((mergedState) => (
                      <div
                        key={mergedState.uuid}
                        className={clsx(
                          'workspace-sync-conflict-resolver__header__tab',
                          {
                            'workspace-sync-conflict-resolver__header__tab--active':
                              mergedState === currentDiffEditorState,
                          },
                        )}
                        onMouseUp={closeTabOnMiddleClick(mergedState)}
                      >
                        <div className="editor-group__header__tab__content">
                          <button
                            className="workspace-sync-conflict-resolver__header__tab__label"
                            tabIndex={-1}
                            onClick={openTab(mergedState)}
                            title={mergedState.label}
                          >
                            {mergedState.label}
                          </button>
                          <button
                            className="workspace-sync-conflict-resolver__header__tab__close-btn"
                            onClick={closeTab(mergedState)}
                            tabIndex={-1}
                            title="Close"
                          >
                            <TimesIcon />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <PanelContent>
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
                </PanelContent>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ModalBody>
        <ModalFooter>
          <ModalFooterButton
            text="Apply Resolutions"
            title="Apply Resolutions"
            disabled={Boolean(conflicts.length)}
            onClick={applyResolutions}
          />
          <ModalFooterButton
            text="Abort"
            title="Aborts"
            onClick={abort}
            type="secondary"
          />
        </ModalFooter>
      </Modal>
    </Dialog>
  );
});
