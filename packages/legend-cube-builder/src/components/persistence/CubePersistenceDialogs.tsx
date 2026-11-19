/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import {
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  PanelLoadingIndicator,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { useRef } from 'react';
import {
  CUBE_DEPLOYMENT_DESCRIPTION,
  CUBE_PERSISTENCE_PENDING_LABEL,
  CUBE_SAVE_BETA_WARNING,
  MAX_CUBE_NAME_LENGTH,
} from '../../__lib__/LegendCubePersistenceLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import type { SavedCubeSummary } from '../../graph-manager/CubeStore.js';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import type { CubeConfirmation } from '../../stores/CubePersistenceState.js';
import { CubeButton } from '../CubeButton.js';

const useDarkMode = (editorState: CubeEditorState): boolean =>
  !editorState.host.applicationStore.layoutService
    .TEMPORARY__isLightColorThemeEnabled;

const INPUT_CLASS_NAME =
  'h-7 w-full rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] px-2 text-base text-[var(--color-text-primary)]';

/** When a cube was saved, in the viewer's words */
export const formatCubeSavedAt = (time: number | undefined): string =>
  time === undefined
    ? ''
    : new Date(time).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });

/** Who saved a cube last, and when */
const describeLastSave = (cube: SavedCubeSummary): string =>
  [
    cube.updatedBy ? `Saved by ${cube.updatedBy}` : 'Saved',
    formatCubeSavedAt(cube.updatedAt),
  ]
    .filter(Boolean)
    .join(', ');

/**
 * Save and Save as: the cube's name and the deployment that will own it,
 * with a warning that saved cubes aren't backward compatible while Cube is
 * in beta. A save the store refused says why here, e.g. a version saved
 * elsewhere since, and saving a copy is the way on.
 */
export const CubeSaveDialog = observer(
  (props: { editorState: CubeEditorState }) => {
    const { editorState } = props;
    const { persistence } = editorState;
    const dialog = persistence.saveDialog;
    const darkMode = useDarkMode(editorState);
    const isSaving =
      persistence.pending === CUBE_PERSISTENCE_PENDING_LABEL.SAVING;
    const invalid = dialog.nameError ?? dialog.deploymentError;
    const save = (): void => {
      dialog
        .confirm()
        .catch(editorState.host.applicationStore.alertUnhandledError);
    };

    return (
      <Dialog open={dialog.isOpen} onClose={() => dialog.close()}>
        <Modal darkMode={darkMode} className="w-[480px] max-w-full">
          <ModalHeader>
            <div className="modal__title">
              {persistence.savedCube ? 'Save as a new cube' : 'Save cube'}
            </div>
          </ModalHeader>
          <PanelLoadingIndicator isLoading={isSaving} />
          <ModalBody>
            <form
              className="flex flex-col gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                save();
              }}
            >
              {dialog.error !== undefined && (
                <div
                  className="break-words text-base text-[var(--color-status-error)]"
                  role="alert"
                >
                  {dialog.error}
                  {persistence.savedCube &&
                    ' Save it as a new cube to keep your changes.'}
                </div>
              )}
              <label className="flex flex-col gap-1 text-base">
                Name
                <input
                  className={INPUT_CLASS_NAME}
                  autoFocus={true}
                  maxLength={MAX_CUBE_NAME_LENGTH + 10}
                  spellCheck={false}
                  value={dialog.name}
                  onChange={(event) => dialog.setName(event.target.value)}
                />
              </label>
              {dialog.nameError !== undefined && dialog.name !== '' && (
                <div className="text-base text-[var(--color-status-error)]">
                  {dialog.nameError}
                </div>
              )}
              <label className="flex flex-col gap-1 text-base">
                Owner deployment
                <input
                  className={INPUT_CLASS_NAME}
                  placeholder="Deployment identifier"
                  maxLength={MAX_CUBE_NAME_LENGTH + 10}
                  spellCheck={false}
                  value={dialog.deployment}
                  onChange={(event) => dialog.setDeployment(event.target.value)}
                />
              </label>
              {dialog.deploymentError !== undefined &&
                dialog.deployment !== '' && (
                  <div className="text-base text-[var(--color-status-error)]">
                    {dialog.deploymentError}
                  </div>
                )}
              <div className="text-base text-[var(--color-text-secondary)]">
                {CUBE_DEPLOYMENT_DESCRIPTION}
              </div>
              <div
                className="rounded-sm border border-[var(--color-status-warn)] px-2 py-1 text-base text-[var(--color-status-warn)]"
                data-testid={LEGEND_CUBE_TEST_ID.SAVE_BETA_WARNING}
              >
                {CUBE_SAVE_BETA_WARNING}
              </div>
              {/* Enter saves, as the button does */}
              <button type="submit" hidden={true} />
            </form>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              darkMode={darkMode}
              formatText={false}
              text={isSaving ? 'Saving…' : 'Save'}
              {...(invalid ? { title: invalid } : {})}
              disabled={invalid !== undefined || isSaving}
              onClick={save}
            />
            <ModalFooterButton
              darkMode={darkMode}
              formatText={false}
              type="secondary"
              text="Cancel"
              onClick={() => dialog.close()}
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

/**
 * Load: the store's cubes, searched by id, name or owning deployment (spec
 * §14.4), the latest saved first; Open and Delete on a row, the store
 * deciding whether the viewer may delete it
 */
export const CubeLoadDialog = observer(
  (props: { editorState: CubeEditorState }) => {
    const { editorState } = props;
    const { persistence } = editorState;
    const dialog = persistence.loadDialog;
    const darkMode = useDarkMode(editorState);
    const user = persistence.currentUser;

    return (
      <Dialog open={dialog.isOpen} onClose={() => dialog.close()}>
        <Modal darkMode={darkMode} className="w-[720px] max-w-full">
          <ModalHeader>
            <div className="modal__title">Load cube</div>
          </ModalHeader>
          <PanelLoadingIndicator
            isLoading={dialog.isSearching || persistence.isPending}
          />
          <ModalBody>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  className={INPUT_CLASS_NAME}
                  aria-label="Search cubes"
                  placeholder="Search by id, name or deployment"
                  autoFocus={true}
                  spellCheck={false}
                  value={dialog.searchText}
                  onChange={(event) => dialog.setSearchText(event.target.value)}
                />
                {user && (
                  <label className="flex shrink-0 items-center gap-1 text-base">
                    <input
                      type="checkbox"
                      checked={dialog.onlyMine}
                      onChange={(event) =>
                        dialog.setOnlyMine(event.target.checked)
                      }
                    />
                    Created by me
                  </label>
                )}
              </div>
              {dialog.error !== undefined && (
                <div
                  className="break-words text-base text-[var(--color-status-error)]"
                  role="alert"
                >
                  {dialog.error}
                </div>
              )}
              <div
                className="flex h-80 flex-col overflow-y-auto rounded-sm border border-[var(--color-border-default)]"
                role="list"
                aria-label="Saved cubes"
              >
                {dialog.results?.length === 0 && !dialog.isSearching && (
                  <div className="p-2 text-base text-[var(--color-text-secondary)]">
                    {dialog.searchText.trim() || dialog.onlyMine
                      ? 'No saved cube matches.'
                      : 'No cube has been saved yet.'}
                  </div>
                )}
                {dialog.results?.map((cube) => {
                  return (
                    <div
                      key={cube.id}
                      className="flex items-center gap-2 border-b border-[var(--color-border-default)] px-2 py-1 last:border-b-0 hover:bg-[var(--color-bg-hover)]"
                      role="listitem"
                      data-testid={LEGEND_CUBE_TEST_ID.LOAD_DIALOG_ROW}
                    >
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-base font-medium">
                          {cube.name}
                          {cube.id === persistence.currentId && (
                            <span className="font-normal text-[var(--color-text-secondary)]">
                              {' '}
                              (open)
                            </span>
                          )}
                        </span>
                        <span className="truncate text-sm text-[var(--color-text-secondary)]">
                          {`Owner: ${cube.ownership.label} · ${describeLastSave(cube)} · version ${cube.version}`}
                        </span>
                        <span className="truncate font-mono text-sm text-[var(--color-text-secondary)]">
                          {cube.id}
                        </span>
                      </div>
                      <CubeButton
                        primary={true}
                        title={`Open "${cube.name}" in place of this cube`}
                        disabled={persistence.isPending}
                        onClick={() => persistence.loadCube(cube.id)}
                      >
                        Open
                      </CubeButton>
                      <CubeButton
                        title={`Delete "${cube.name}"`}
                        disabled={persistence.isPending}
                        onClick={() => persistence.deleteCube(cube)}
                      >
                        Delete
                      </CubeButton>
                    </div>
                  );
                })}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              darkMode={darkMode}
              formatText={false}
              type="secondary"
              text="Close"
              onClick={() => dialog.close()}
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

/** The question before something that loses unsaved changes, or deletes a cube */
export const CubeConfirmDialog = observer(
  (props: { editorState: CubeEditorState }) => {
    const { editorState } = props;
    const { persistence } = editorState;
    // the question stays shown while the dialog closes
    const lastConfirmation = useRef<CubeConfirmation | undefined>(undefined);
    if (persistence.confirmation) {
      lastConfirmation.current = persistence.confirmation;
    }
    const confirmation = persistence.confirmation ?? lastConfirmation.current;
    const darkMode = useDarkMode(editorState);

    return (
      <Dialog
        open={persistence.confirmation !== undefined}
        onClose={() => persistence.cancelConfirmation()}
      >
        <Modal darkMode={darkMode} className="w-[480px] max-w-full">
          <ModalHeader>
            <div className="modal__title">{confirmation?.title}</div>
          </ModalHeader>
          <ModalBody>
            <div className="text-base">{confirmation?.message}</div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              darkMode={darkMode}
              formatText={false}
              text={confirmation?.confirmLabel ?? 'Continue'}
              onClick={() => persistence.confirm()}
            />
            <ModalFooterButton
              darkMode={darkMode}
              formatText={false}
              type="secondary"
              text="Cancel"
              onClick={() => persistence.cancelConfirmation()}
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
