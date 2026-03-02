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
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  PanelLoadingIndicator,
} from '@finos/legend-art';
import type { LegendSQLStudioPlaygroundState } from '../../stores/editor/LegendSQLStudioPlaygroundState.js';
import { SQLPlaygroundEditorResultPanel } from '@finos/legend-query-builder';

export const LegendSQLPlaygroundModal = observer(
  (props: { playgroundState: LegendSQLStudioPlaygroundState }) => {
    const { playgroundState } = props;
    const accessorExplorerState = playgroundState.accessorExplorerState;

    const close = (): void => {
      playgroundState.close();
    };

    return (
      <Dialog
        open={playgroundState.isOpen}
        onClose={close}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <Modal darkMode={true} className="editor-modal sql-playground-modal">
          <ModalHeader title="SQL PLAYGROUND" />
          <ModalBody>
            <PanelLoadingIndicator
              isLoading={playgroundState.executeRawSQLState.isInProgress}
            />
            <div className="sql-playground-modal__content">
              {accessorExplorerState && (
                <SQLPlaygroundEditorResultPanel
                  playgroundState={playgroundState}
                  advancedMode={true}
                  enableDarkMode={true}
                  showAccessorExplorer={true}
                  accessorExplorerState={accessorExplorerState}
                />
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton text="Close" onClick={close} />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
