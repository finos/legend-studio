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
import type { DatabaseModelBuilderState } from '../../../../stores/editor/editor-state/element-editor-state/connection/DatabaseModelBuilderState.js';
import {
  BlankPanelContent,
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  ModalHeaderActions,
  ModalTitle,
  Panel,
  PanelContent,
  PanelHeader,
  PanelLoadingIndicator,
  ResizablePanel,
  ResizablePanelGroup,
  TimesIcon,
} from '@finos/legend-art';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../__lib__/LegendStudioApplicationNavigationContext.js';
import {
  useApplicationStore,
  useConditionedApplicationNavigationContext,
} from '@finos/legend-application';
import { flowResult } from 'mobx';
import { useEffect } from 'react';
import {
  CODE_EDITOR_LANGUAGE,
  CodeEditor,
} from '@finos/legend-lego/code-editor';
import { noop } from '@finos/legend-shared';

export const DatabaseModelBuilder = observer(
  (props: {
    databaseModelBuilderState: DatabaseModelBuilderState;
    isReadOnly: boolean;
  }) => {
    const { databaseModelBuilderState, isReadOnly } = props;

    const applicationStore = useApplicationStore();
    const preview = applicationStore.guardUnhandledError(() =>
      flowResult(databaseModelBuilderState.previewDatabaseModels()),
    );
    const saveModels = applicationStore.guardUnhandledError(() =>
      flowResult(databaseModelBuilderState.saveModels()),
    );
    const closeModal = (): void => {
      databaseModelBuilderState.close();
    };

    const isExecutingAction =
      databaseModelBuilderState.generatingModelState.isInProgress ||
      databaseModelBuilderState.saveModelState.isInProgress;

    useEffect(() => {
      flowResult(databaseModelBuilderState.previewDatabaseModels()).catch(
        applicationStore.alertUnhandledError,
      );
    }, [applicationStore, databaseModelBuilderState]);

    useConditionedApplicationNavigationContext(
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.DATABASE_MODEL_BUILDER,
      databaseModelBuilderState.showModal,
    );

    return (
      <Dialog
        open={databaseModelBuilderState.showModal}
        classes={{ container: 'search-modal__container' }}
        onClose={noop}
        PaperProps={{
          classes: {
            root: 'search-modal__inner-container database-builder__container',
          },
        }}
      >
        <Modal darkMode={true} className="database-builder">
          <ModalHeader>
            <ModalTitle title="Database Model Builder" />
            <ModalHeaderActions>
              <button
                className="modal__header__action"
                tabIndex={-1}
                onClick={closeModal}
              >
                <TimesIcon />
              </button>
            </ModalHeaderActions>
          </ModalHeader>
          <ModalBody className="database-builder__content">
            <PanelLoadingIndicator isLoading={isExecutingAction} />
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel>
                <Panel className="database-builder__model">
                  <PanelHeader title="database model" />
                  <PanelContent>
                    <div className="database-builder__modeller">
                      <div className="database-builder__modeller__preview">
                        {databaseModelBuilderState.generatedGrammarCode && (
                          <CodeEditor
                            language={CODE_EDITOR_LANGUAGE.PURE}
                            inputValue={
                              databaseModelBuilderState.generatedGrammarCode
                            }
                            isReadOnly={true}
                          />
                        )}
                        {!databaseModelBuilderState.generatedGrammarCode && (
                          <BlankPanelContent>
                            No model preview
                          </BlankPanelContent>
                        )}
                      </div>
                    </div>
                  </PanelContent>
                </Panel>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              className="database-builder__action--btn"
              disabled={isReadOnly || isExecutingAction}
              onClick={preview}
              title="Preview models..."
            >
              Preview
            </ModalFooterButton>
            <ModalFooterButton
              className="database-builder__action--btn"
              disabled={isReadOnly || isExecutingAction}
              onClick={saveModels}
            >
              Save Models
            </ModalFooterButton>
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
