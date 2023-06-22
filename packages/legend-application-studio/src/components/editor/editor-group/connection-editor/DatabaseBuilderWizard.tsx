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
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitter,
  PanelLoadingIndicator,
  PanelContent,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalTitle,
  ModalHeaderActions,
  TimesIcon,
  ModalFooterButton,
  BlankPanelContent,
  PanelHeader,
  Panel,
} from '@finos/legend-art';
import { useEffect } from 'react';
import { noop } from '@finos/legend-shared';
import {
  useApplicationStore,
  useConditionedApplicationNavigationContext,
} from '@finos/legend-application';
import { flowResult } from 'mobx';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../__lib__/LegendStudioApplicationNavigationContext.js';
import {
  CODE_EDITOR_LANGUAGE,
  CodeEditor,
} from '@finos/legend-lego/code-editor';
import type { DatabaseBuilderWizardState } from '../../../../stores/editor/editor-state/element-editor-state/connection/DatabaseBuilderWizardState.js';
import { DatabaseSchemaExplorer } from './DatabaseSchemaExplorer.js';

export const DatabaseBuilderWizard = observer(
  (props: {
    databaseBuilderState: DatabaseBuilderWizardState;
    isReadOnly: boolean;
  }) => {
    const { databaseBuilderState, isReadOnly } = props;
    const schemaExplorerState = databaseBuilderState.schemaExplorerState;
    const applicationStore = useApplicationStore();
    const preview = applicationStore.guardUnhandledError(() =>
      flowResult(databaseBuilderState.previewDatabaseModel()),
    );
    const updateDatabase = applicationStore.guardUnhandledError(() =>
      flowResult(databaseBuilderState.updateDatabase()),
    );
    const closeModal = (): void => {
      databaseBuilderState.setShowModal(false);
      databaseBuilderState.editorStore.explorerTreeState.setDatabaseBuilderState(
        undefined,
      );
    };
    const isExecutingAction =
      schemaExplorerState.isGeneratingDatabase ||
      schemaExplorerState.isUpdatingDatabase;

    useEffect(() => {
      flowResult(schemaExplorerState.fetchDatabaseMetadata()).catch(
        applicationStore.alertUnhandledError,
      );
    }, [applicationStore, schemaExplorerState]);

    useConditionedApplicationNavigationContext(
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.DATABASE_BUILDER,
      databaseBuilderState.showModal,
    );

    return (
      <Dialog
        open={databaseBuilderState.showModal}
        onClose={noop} // disallow closing dialog by using Esc key or clicking on the backdrop
        classes={{ container: 'search-modal__container' }}
        PaperProps={{
          classes: {
            root: 'search-modal__inner-container database-builder__container',
          },
        }}
      >
        <Modal darkMode={true} className="database-builder">
          <ModalHeader>
            <ModalTitle title="Database Builder" />
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
              <ResizablePanel size={450}>
                <div className="database-builder__config">
                  <PanelHeader title="schema explorer" />
                  <PanelContent className="database-builder__config__content">
                    {schemaExplorerState.treeData && (
                      <DatabaseSchemaExplorer
                        treeData={schemaExplorerState.treeData}
                        isReadOnly={false}
                        schemaExplorerState={
                          databaseBuilderState.schemaExplorerState
                        }
                      />
                    )}
                  </PanelContent>
                </div>
              </ResizablePanel>
              <ResizablePanelSplitter />
              <ResizablePanel>
                <Panel className="database-builder__model">
                  <PanelHeader title="database model" />

                  <PanelContent>
                    <div className="database-builder__modeller">
                      <div className="panel__content__form__section database-builder__modeller__path">
                        <div className="panel__content__form__section__header__label">
                          Target Database Path
                        </div>
                        <input
                          className="panel__content__form__section__input"
                          spellCheck={false}
                          disabled={true}
                          value={schemaExplorerState.database.path}
                        />
                      </div>
                      <div className="database-builder__modeller__preview">
                        {databaseBuilderState.databaseGrammarCode && (
                          <CodeEditor
                            language={CODE_EDITOR_LANGUAGE.PURE}
                            inputValue={
                              databaseBuilderState.databaseGrammarCode
                            }
                            isReadOnly={true}
                          />
                        )}
                        {!databaseBuilderState.databaseGrammarCode && (
                          <BlankPanelContent>
                            No database preview
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
              title="Preview database model..."
            >
              Preview
            </ModalFooterButton>
            <ModalFooterButton
              className="database-builder__action--btn"
              disabled={isReadOnly || isExecutingAction}
              onClick={updateDatabase}
            >
              Update Database
            </ModalFooterButton>
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
