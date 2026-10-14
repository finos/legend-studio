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
} from '@finos/legend-art';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import { observer } from 'mobx-react-lite';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import { formatCubeSql } from './CubeSqlFormat.js';
import { CUBE_PRIMARY_BUTTON_DARK_MODE } from '../CubeDialogTheme.js';

/** The code editor's language: legend-code-editor's `CODE_EDITOR_LANGUAGE.SQL` */
const SQL_LANGUAGE = 'sql';

/** The SQL the run's database ran, formatted, with Copy: a dialog, as Legend Query's executed SQL */
export const CubeSqlDialog = observer(
  (props: { editorState: CubeEditorState; onClose: () => void }) => {
    const { editorState, onClose } = props;
    const { applicationStore } = editorState.host;
    const sql = editorState.execution.result?.sql ?? [];
    const darkMode =
      !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;
    const text = formatCubeSql(sql);
    const copySql = (): void => {
      applicationStore.clipboardService
        .copyTextToClipboard(text)
        .catch(applicationStore.alertUnhandledError);
    };
    return (
      <Dialog open={sql.length > 0} onClose={onClose}>
        <Modal darkMode={darkMode} className="w-[960px] max-w-full">
          <ModalHeader>
            <div className="modal__title">Executed SQL</div>
          </ModalHeader>
          <ModalBody>
            <div
              className="h-[60vh] w-full overflow-hidden rounded-sm border border-[var(--color-border-default)]"
              aria-label="Executed SQL"
              data-testid={LEGEND_CUBE_TEST_ID.SQL_PANEL}
            >
              <CodeEditor
                inputValue={text}
                isReadOnly={true}
                language={SQL_LANGUAGE}
                hideMinimap={true}
                hideActionBar={true}
                extraEditorOptions={{ scrollBeyondLastLine: false }}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              darkMode={CUBE_PRIMARY_BUTTON_DARK_MODE}
              formatText={false}
              text="Copy SQL"
              onClick={copySql}
            />
            <ModalFooterButton
              darkMode={darkMode}
              formatText={false}
              type="secondary"
              text="Close"
              onClick={onClose}
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
