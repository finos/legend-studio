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
import { CUBE_PENDING_LABEL } from '../../__lib__/LegendCubeLabels.js';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';

/** The Pure text of what Execute would run, read-only, with Copy */
export const CubeShowPureDialog = observer(
  (props: { editorState: CubeEditorState }) => {
    const { editorState } = props;
    const showPure = editorState.showPure;
    const { applicationStore } = editorState.host;
    const darkMode =
      !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;
    const { text, error } = showPure;

    return (
      <Dialog open={showPure.isOpen} onClose={() => showPure.close()}>
        <Modal darkMode={darkMode} className="w-[800px] max-w-full">
          <ModalHeader>
            <div className="modal__title">Pure query</div>
          </ModalHeader>
          <PanelLoadingIndicator isLoading={showPure.isRendering} />
          <ModalBody>
            <div className="flex flex-col gap-2">
              {showPure.isRendering && (
                <div className="text-base text-[var(--color-text-secondary)]">
                  {CUBE_PENDING_LABEL.RENDERING_QUERY}
                </div>
              )}
              {text !== undefined && (
                <pre
                  className="max-h-[60vh] overflow-auto whitespace-pre rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] p-2 font-mono text-sm text-[var(--color-text-primary)]"
                  aria-label="Pure query"
                >
                  {text}
                </pre>
              )}
              {error && (
                <div
                  className="whitespace-pre-wrap break-words text-base text-[var(--color-status-error)]"
                  role="alert"
                >
                  {error.detail}
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              darkMode={darkMode}
              formatText={false}
              text="Copy to Clipboard"
              disabled={text === undefined}
              onClick={() => {
                if (text !== undefined) {
                  applicationStore.clipboardService
                    .copyTextToClipboard(text, {
                      notifySuccessMessage:
                        'Pure query copied to the clipboard',
                    })
                    .catch(applicationStore.alertUnhandledError);
                }
              }}
            />
            <ModalFooterButton
              darkMode={darkMode}
              formatText={false}
              type="secondary"
              text="Close"
              onClick={() => showPure.close()}
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
