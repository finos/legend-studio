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
import { CodeEditor } from '@finos/legend-lego/code-editor';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import {
  CUBE_LAMBDA_IMPORT_MESSAGE,
  type CubeLambdaImportState,
} from '../../stores/CubeLambdaImportState.js';
import { CubeCodeCheckStatus } from '../../stores/editors/CubeExpressionAutoCheck.js';
import { CUBE_PRIMARY_BUTTON_DARK_MODE } from '../CubeDialogTheme.js';
import {
  CUBE_CODE_CHECK_LABEL,
  getCubeCodeBoxClass,
} from '../editors/CubeCodeCheck.js';
import { getCubeExpressionCompletionSource } from '../editors/CubeExpressionCompletions.js';

/** The code editor's language: legend-code-editor's `CODE_EDITOR_LANGUAGE.PURE` */
const PURE = 'pure';

/** What the text's check says under it, but a problem, which the alert says */
const CubeImportPureStatus = observer(
  (props: { lambdaImport: CubeLambdaImportState }) => {
    const { lambdaImport } = props;
    switch (lambdaImport.checkStatus) {
      case CubeCodeCheckStatus.READY:
        return (
          <div className="text-sm text-[var(--color-status-success)]">
            {CUBE_LAMBDA_IMPORT_MESSAGE.READABLE(
              lambdaImport.checked?.reading.document.query.nodes.length ?? 0,
            )}
          </div>
        );
      case CubeCodeCheckStatus.CHECKING:
        return (
          <div className="text-sm text-[var(--color-text-muted)]">
            {CUBE_CODE_CHECK_LABEL.CHECKING}
          </div>
        );
      default:
        return null;
    }
  },
);

/**
 * Import Pure (PLAN §11.18): a lambda pasted as Pure, as Show Pure shows one,
 * or as the engine's JSON, read into the steps Cube writes it with, in
 * place of this cube; in a code editor, checked once typing pauses, its
 * border green once Cube can read it (user, 2026-10-16)
 */
export const CubeImportPureDialog = observer(
  (props: { editorState: CubeEditorState }) => {
    const { editorState } = props;
    const { lambdaImport } = editorState;
    const { applicationStore } = editorState.host;
    const darkMode =
      !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;
    // the lambda replaces the cube: unsaved changes are asked about first
    const importText = (): void =>
      editorState.persistence.confirmDiscard(() => {
        flowResult(lambdaImport.importText()).catch(
          applicationStore.alertUnhandledError,
        );
      });
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
              <div
                aria-label="Pure query"
                data-check-status={lambdaImport.checkStatus}
                className={`h-80 ${getCubeCodeBoxClass(lambdaImport.checkStatus)}`}
              >
                <CodeEditor
                  inputValue={lambdaImport.text}
                  updateInput={(text) => lambdaImport.setText(text)}
                  language={PURE}
                  hideMinimap={true}
                  hideGutter={true}
                  hideActionBar={true}
                  completions={getCubeExpressionCompletionSource([], (text) =>
                    lambdaImport.getEngineCompletions(text),
                  )}
                  extraEditorOptions={{
                    lineNumbers: 'off',
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                  }}
                  // the completions show over the dialog
                  floatingWidgetsInBody={true}
                />
              </div>
              <CubeImportPureStatus lambdaImport={lambdaImport} />
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
