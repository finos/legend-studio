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
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import { CUBE_SPEC_TRANSFER_MODE } from '../../stores/CubeSpecTransferState.js';

const TEXT_AREA_CLASS_NAME =
  'h-80 w-full resize-none rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] p-1 font-mono text-sm text-[var(--color-text-primary)]';

/**
 * Export and Import of the cube's saved spec, as text to copy, download,
 * paste or read from a file (PLAN §10.3; developer tools until M8).
 */
export const CubeSpecTransferDialog = observer(
  (props: { editorState: CubeEditorState }) => {
    const { editorState } = props;
    const transfer = editorState.specTransfer;
    const { applicationStore } = editorState.host;
    const darkMode =
      !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;
    const isExport = transfer.mode === CUBE_SPEC_TRANSFER_MODE.EXPORT;

    return (
      <Dialog
        open={transfer.mode !== undefined}
        onClose={() => transfer.close()}
      >
        <Modal darkMode={darkMode} className="w-[720px] max-w-full">
          <ModalHeader>
            <div className="modal__title">
              {isExport ? 'Export spec' : 'Import spec'}
            </div>
          </ModalHeader>
          <PanelLoadingIndicator isLoading={transfer.isReadingFile} />
          <ModalBody>
            <div className="flex flex-col gap-2">
              {isExport ? (
                transfer.exportText !== undefined && (
                  <textarea
                    className={TEXT_AREA_CLASS_NAME}
                    aria-label="Cube spec"
                    readOnly={true}
                    value={transfer.exportText}
                  />
                )
              ) : (
                <>
                  <div className="text-base text-[var(--color-text-secondary)]">
                    Paste a cube spec, or choose a .cube.json file. The spec
                    replaces this cube; Undo brings it back.
                  </div>
                  <input
                    className="text-base"
                    type="file"
                    accept=".json,application/json"
                    aria-label="Spec file"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      // the same file can be chosen again
                      event.target.value = '';
                      if (file) {
                        flowResult(transfer.readImportFile(file)).catch(
                          applicationStore.alertUnhandledError,
                        );
                      }
                    }}
                  />
                  <textarea
                    className={TEXT_AREA_CLASS_NAME}
                    aria-label="Cube spec"
                    placeholder="Cube spec"
                    spellCheck={false}
                    value={transfer.importText}
                    onChange={(event) =>
                      transfer.setImportText(event.target.value)
                    }
                  />
                </>
              )}
              {transfer.error !== undefined && (
                <div
                  className="break-words text-base text-[var(--color-status-error)]"
                  role="alert"
                >
                  {transfer.error}
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            {isExport ? (
              <>
                <ModalFooterButton
                  darkMode={darkMode}
                  formatText={false}
                  text="Copy"
                  disabled={transfer.exportText === undefined}
                  onClick={() => {
                    transfer
                      .copyExport()
                      .catch(applicationStore.alertUnhandledError);
                  }}
                />
                <ModalFooterButton
                  darkMode={darkMode}
                  formatText={false}
                  text="Download"
                  disabled={transfer.exportText === undefined}
                  onClick={() => transfer.downloadExport()}
                />
              </>
            ) : (
              <ModalFooterButton
                darkMode={darkMode}
                formatText={false}
                text="Import"
                disabled={!transfer.importText.trim() || transfer.isReadingFile}
                onClick={() => transfer.importSpec()}
              />
            )}
            <ModalFooterButton
              darkMode={darkMode}
              formatText={false}
              type="secondary"
              text={isExport ? 'Close' : 'Cancel'}
              onClick={() => transfer.close()}
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
