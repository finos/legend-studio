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
import {
  clsx,
  Dialog,
  PanelLoadingIndicator,
  TimesIcon,
  RefreshIcon,
  InfoCircleIcon,
  DownloadIcon,
  UploadIcon,
  CloudDownloadIcon,
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  CloudUploadIcon,
} from '@finos/legend-art';
import { EntityDiffViewState } from '../../../stores/editor-state/entity-diff-editor-state/EntityDiffViewState';
import { EntityDiffSideBarItem } from '../../editor/edit-panel/diff-editor/EntityDiffView';
import { LEGEND_STUDIO_TEST_ID } from '../../LegendStudioTestID';
import { flowResult } from 'mobx';
import type {
  EntityChange,
  EntityChangeConflict,
  EntityDiff,
} from '@finos/legend-server-sdlc';
import { entityDiffSorter } from '../../../stores/EditorSDLCState';
import { useEditorStore } from '../EditorStoreProvider';
import { useApplicationStore } from '@finos/legend-application';
import { useEffect } from 'react';
import { EntityChangeConflictEditorState } from '../../../stores/editor-state/entity-diff-editor-state/EntityChangeConflictEditorState';
import { EntityChangeConflictSideBarItem } from '../edit-panel/diff-editor/EntityChangeConflictEditor';

const PatchLoader = observer(() => {
  const editorStore = useEditorStore();
  const localChangesState = editorStore.localChangesState;
  const patchState = localChangesState.patchLoaderState;
  const onClose = (): void => patchState.closeModal();
  const onChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      patchState.loadPatchFile(file);
    }
  };
  const upload = (): void => {
    patchState.applyChanges();
  };
  const deleteChange = (change: EntityChange): void =>
    patchState.deleteChange(change);
  return (
    <Dialog onClose={onClose} open={patchState.showModal}>
      <div className="modal modal--dark modal--scrollable patch-loader">
        <div className="modal__header">
          <div className="modal__title">
            <div className="modal__title__label">Patch Loader</div>
          </div>
        </div>
        <div className="modal__body">
          <PanelLoadingIndicator isLoading={patchState.isLoadingChanges} />
          <div>
            <input
              id="upload-file"
              type="file"
              name="myFiles"
              onChange={onChange}
            />
          </div>
          {Boolean(patchState.overiddingChanges.length) && (
            <div className="panel__content__form__section">
              <div className="panel__content__form__section__header__label">
                Overriding Changes
              </div>
              <div className="panel__content__form__section__header__prompt">
                The following element changes will be overridden by the patch
              </div>
              <div className="panel__content__form__section__list">
                <div className="panel__content__form__section__list__items">
                  {patchState.overiddingChanges.map((value) => (
                    <div
                      key={value.entityPath}
                      className="panel__content__form__section__list__item"
                    >
                      <div className="panel__content__form__section__list__item__value">
                        {value.entityPath}
                      </div>
                      <div className="panel__content__form__section__list__item__actions">
                        <button
                          title="Remove change"
                          className="panel__content__form__section__list__item__remove-btn"
                          onClick={(): void => deleteChange(value)}
                          tabIndex={-1}
                        >
                          <TimesIcon />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="modal__footer">
          <button
            type="button"
            className="btn btn--dark blocking-alert__action--standard"
            onClick={upload}
            disabled={!patchState.changes?.length || !patchState.isValidPatch}
          >
            Apply Patch
          </button>
        </div>
      </div>
    </Dialog>
  );
});

export const LocalChanges = observer(() => {
  const editorStore = useEditorStore();
  const sdlcState = editorStore.sdlcState;
  const applicationStore = useApplicationStore();
  const localChangesState = editorStore.localChangesState;
  const updateState = localChangesState.workspaceSyncState;
  // Actions
  const downloadLocalChanges = (): void =>
    localChangesState.downloadLocalChanges();
  const uploadPatchChanges = (): void =>
    localChangesState.patchLoaderState.openModal(
      editorStore.graphState.computeLocalEntityChanges(),
    );
  const pushLocalChanges = applicationStore.guardUnhandledError(() =>
    flowResult(localChangesState.pushLocalChanges()),
  );
  const refreshLocalChanges = applicationStore.guardUnhandledError(() =>
    flowResult(localChangesState.refreshLocalChanges()),
  );
  const pullRemoteWorkspace = (): void => {
    if (!localChangesState.refreshWorkspaceSyncStatusState.isInProgress) {
      flowResult(updateState.pullChanges()).catch(
        applicationStore.alertUnhandledError,
      );
    }
  };
  const isDispatchingAction =
    localChangesState.pushChangesState.isInProgress ||
    localChangesState.refreshLocalChangesDetectorState.isInProgress ||
    localChangesState.workspaceSyncState.pullChangesState.isInProgress ||
    localChangesState.refreshWorkspaceSyncStatusState.isInProgress;
  // Changes
  const currentEditorState = editorStore.currentEditorState;
  const isSelectedDiff = (diff: EntityDiff): boolean =>
    currentEditorState instanceof EntityDiffViewState &&
    diff.oldPath === currentEditorState.fromEntityPath &&
    diff.newPath === currentEditorState.toEntityPath;
  const changes =
    editorStore.changeDetectionState.workspaceLocalLatestRevisionState.changes;
  const openChange =
    (diff: EntityDiff): (() => void) =>
    (): void =>
      localChangesState.openLocalChange(diff);
  // Local/Remote Workspace Conflicts
  const conflicts =
    editorStore.changeDetectionState.potentialWorkspacePullConflicts;
  const isSelectedConflict = (conflict: EntityChangeConflict): boolean =>
    currentEditorState instanceof EntityChangeConflictEditorState &&
    conflict.entityPath === currentEditorState.entityPath;
  const openPotentialConflict =
    (conflict: EntityChangeConflict): (() => void) =>
    (): void =>
      localChangesState.openPotentialWorkspacePullConflict(conflict);
  // Local/Remote Workspace Changes
  const workspacePullChanges =
    editorStore.changeDetectionState.aggregatedWorkspaceRemoteChanges;
  const changesWithoutConflicts = workspacePullChanges.filter(
    (change) =>
      !conflicts
        .map((conflict) => conflict.entityPath)
        .includes(change.entityPath),
  );
  const openWorkspacePullChange =
    (diff: EntityDiff): (() => void) =>
    (): void =>
      localChangesState.openWorkspacePullChange(diff);

  // check if workspace is still in-sync
  useEffect(() => {
    flowResult(localChangesState.refreshWorkspaceSyncStatus()).catch(
      applicationStore.alertUnhandledError,
    );
  }, [applicationStore, localChangesState]);
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
            <DownloadIcon />
          </button>
          <button
            className="panel__header__action side-bar__header__action local-changes__download-patch-btn"
            onClick={uploadPatchChanges}
            disabled={
              isDispatchingAction ||
              editorStore.workspaceUpdaterState.isUpdatingWorkspace ||
              !editorStore.changeDetectionState.initState.hasSucceeded ||
              !editorStore.isInFormMode
            }
            tabIndex={-1}
            title="Upload local entity changes"
          >
            <UploadIcon />
          </button>
          <button
            className={clsx(
              'panel__header__action side-bar__header__action local-changes__refresh-btn',
              {
                'local-changes__refresh-btn--loading':
                  localChangesState.refreshLocalChangesDetectorState
                    .isInProgress,
              },
            )}
            onClick={refreshLocalChanges}
            disabled={isDispatchingAction}
            tabIndex={-1}
            title="Refresh"
          >
            <RefreshIcon />
          </button>
          <button
            className={clsx(
              'panel__header__action side-bar__header__action local-changes__push-changes-btn',
              {
                'local-changes__push-changes-btn--loading':
                  localChangesState.pushChangesState.isInProgress,
              },
            )}
            onClick={pushLocalChanges}
            disabled={
              isDispatchingAction ||
              editorStore.workspaceUpdaterState.isUpdatingWorkspace
            }
            tabIndex={-1}
            title="Push local changes (Ctrl + S)"
          >
            <CloudUploadIcon />
          </button>
          <button
            className="panel__header__action side-bar__header__action workspace-updater__update-btn"
            onClick={pullRemoteWorkspace}
            disabled={
              isDispatchingAction ||
              !sdlcState.remoteWorkspaceRevision ||
              !sdlcState.isWorkspaceOutOfSync
            }
            tabIndex={-1}
            title="Pull remote workspace changes"
          >
            <CloudDownloadIcon />
          </button>
        </div>
      </div>
      <div className="panel__content side-bar__content">
        <PanelLoadingIndicator isLoading={isDispatchingAction} />
        {localChangesState.patchLoaderState.showModal && <PatchLoader />}
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel size={600} minSize={28}>
            <div className="panel side-bar__panel">
              <div className="panel__header">
                <div className="panel__header__title">
                  <div className="panel__header__title__content">CHANGES</div>
                  <div
                    className="side-bar__panel__title__info"
                    title="All local changes that have not been yet pushed with the server"
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
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine color="var(--color-dark-grey-100)" />
          </ResizablePanelSplitter>
          <ResizablePanel minSize={28}>
            <div className="panel side-bar__panel">
              <div className="panel__header">
                <div className="panel__header__title">
                  <div className="panel__header__title__content">
                    INCOMING REMOTE REVISIONS
                  </div>
                  <div
                    className="side-bar__panel__title__info"
                    title="All incoming remote revisions since last syncing of workspace"
                  >
                    <InfoCircleIcon />
                  </div>
                </div>
                <div className="side-bar__panel__header__changes-count">
                  {updateState.incomingRevisions.length}
                </div>
              </div>
              <div className="panel__content">
                {updateState.incomingRevisions.map((revision) => (
                  <div key={revision.id} className="side-bar__panel__item">
                    <div className="local-changes__revision">
                      <span className="local-changes__revision__name">
                        {revision.message}
                      </span>
                      <span className="local-changes__revision__info">
                        {revision.committerName}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
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
                    INCOMING REMOTE CHANGES
                  </div>
                  <div
                    className="side-bar__panel__title__info"
                    title={
                      'All changes made to remote workspace since last syncing of workspace.\nPotential workspace sync conflicts are also shown if they exist'
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
                  {workspacePullChanges.length}
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
                      openDiff={openWorkspacePullChange(diff)}
                    />
                  ))}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
});
