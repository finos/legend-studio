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
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import { CUBE_PRIMARY_BUTTON_DARK_MODE } from '../CubeDialogTheme.js';

const TEXT_AREA_CLASS_NAME =
  'h-80 w-full resize-none rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] p-1 font-mono text-sm text-[var(--color-text-primary)]';

/**
 * Import Pure (PLAN §11.18): a lambda pasted as Pure, as Show Pure shows one,
 * or as the engine's JSON, read into the steps Cube writes it with, in
 * place of this cube
 */
export const CubeImportPureDialog = observer(
  (props: { editorState: CubeEditorState }) => {
    const { editorState } = props;
    const { lambdaImport } = editorState;
    const { applicationStore } = editorState.host;
    const darkMode =
      !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;
    const importText = (): void => {
      flowResult(lambdaImport.importText()).catch(
        applicationStore.alertUnhandledError,
      );
    };
    return (
      <Dialog
        open={lambdaImport.isDialogOpen}
        onClose={() => lambdaImport.closeDialog()}
      >
        <Modal darkMode={darkMode} className="w-[720px] max-w-full">
          <ModalHeader>
            <div className="modal__title">Import Pure</div>
          </ModalHeader>
          <PanelLoadingIndicator isLoading={lambdaImport.isImporting} />
          <ModalBody>
            <div
              className="flex flex-col gap-2"
              data-testid={LEGEND_CUBE_TEST_ID.IMPORT_PURE}
            >
              <div className="text-base text-[var(--color-text-secondary)]">
                Paste a query, as Show Pure shows one, e.g.{' '}
                <code>
                  {'|#>{db::Store.SCHEMA.TABLE}#->filter(x | $x.ID > 1)'}
                </code>
                , or its JSON. Cube reads it into steps that replace this cube;
                Undo brings it back. Its sources are read where the source
                dialog reads them.
              </div>
              <textarea
                className={TEXT_AREA_CLASS_NAME}
                aria-label="Pure query"
                placeholder="Pure query"
                spellCheck={false}
                value={lambdaImport.text}
                onChange={(event) => lambdaImport.setText(event.target.value)}
              />
              {lambdaImport.dialogError !== undefined && (
                <div
                  className="break-words text-base text-[var(--color-status-error)]"
                  role="alert"
                >
                  {lambdaImport.dialogError.message}
                  {lambdaImport.dialogError.detail !== undefined && (
                    <details>
                      <summary className="cursor-pointer">Details</summary>
                      <pre className="whitespace-pre-wrap text-sm">
                        {lambdaImport.dialogError.detail}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              darkMode={CUBE_PRIMARY_BUTTON_DARK_MODE}
              formatText={false}
              text="Import"
              disabled={!lambdaImport.text.trim() || lambdaImport.isImporting}
              onClick={importText}
            />
            <ModalFooterButton
              darkMode={darkMode}
              formatText={false}
              type="secondary"
              text="Cancel"
              onClick={() => lambdaImport.closeDialog()}
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
