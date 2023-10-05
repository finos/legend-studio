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

import {
  ResizablePanelGroup,
  ResizablePanel,
  Panel,
  BaseStepper,
  PanelContent,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  InputWithInlineValidation,
  PanelHeader,
  BlankPanelContent,
  PanelLoadingIndicator,
  ResizablePanelSplitter,
  EyeIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import type { QueryConnectionEndToEndWorkflowState } from '../../../../stores/editor/sidebar-state/end-to-end-workflow/GlobalEndToEndFlowState.js';
import { useEffect, useMemo } from 'react';
import { RelationalConnectionGeneralEditor } from '../connection-editor/RelationalDatabaseConnectionEditor.js';
import { flowResult } from 'mobx';
import { useApplicationStore } from '@finos/legend-application';
import { DatabaseBuilderModalContent } from '../connection-editor/DatabaseBuilderWizard.js';
import { debounce, guaranteeNonNullable } from '@finos/legend-shared';
import {
  CODE_EDITOR_LANGUAGE,
  CodeEditor,
} from '@finos/legend-lego/code-editor';
import type { DatabaseBuilderWizardState } from '../../../../stores/editor/editor-state/element-editor-state/connection/DatabaseBuilderWizardState.js';
import type { DatabaseModelBuilderState } from '../../../../stores/editor/editor-state/element-editor-state/connection/DatabaseModelBuilderState.js';
import { isValidPath } from '@finos/legend-graph';

const QUERY_CONNECTION_WORKFLOW_STEPS = [
  'Create Connection',
  'Create Database',
  'Edit Database',
  'Create Class/Mapping/Runtime',
  'Confirmation',
];

const QueryConnectionRelationalConnectionGeneralEditor = observer(
  (props: {
    queryConnectionEndToEndWorkflowState: QueryConnectionEndToEndWorkflowState;
  }) => {
    const { queryConnectionEndToEndWorkflowState } = props;
    const elementAlreadyExistsMessage =
      queryConnectionEndToEndWorkflowState.globalEndToEndWorkflowState.editorStore.graphManagerState.graph.allElements
        .map((s) => s.path)
        .includes(queryConnectionEndToEndWorkflowState.targetConnectionPath)
        ? 'Element with same path already exists'
        : undefined;
    const onTargetPathChange: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      queryConnectionEndToEndWorkflowState.setTargetConnectionPath(
        event.target.value,
      );
    };

    return (
      <Panel className="query-connection-workflow-panel query-connection-relational-connection-editor">
        <PanelHeader title="build a connection" />
        <PanelContent>
          <div className="query-connection-relational-connection-editor__connection-builder">
            <div className="panel__content__form__section query-connection-relational-connection-editor__connection-builder__path">
              <div className="panel__content__form__section__header__label">
                Target Connection Path
              </div>
              <InputWithInlineValidation
                className="panel__content__form__section__input"
                spellCheck={false}
                onChange={onTargetPathChange}
                value={
                  queryConnectionEndToEndWorkflowState.targetConnectionPath
                }
                error={elementAlreadyExistsMessage}
              />
            </div>
            <div className="query-connection-relational-connection-editor__editor">
              <RelationalConnectionGeneralEditor
                connectionValueState={
                  queryConnectionEndToEndWorkflowState.connectionValueState
                }
                isReadOnly={false}
                hideHeader={true}
              />
            </div>
          </div>
        </PanelContent>
      </Panel>
    );
  },
);

const QueryConnectionDatabaseBuilderEditor = observer(
  (props: { databaseBuilderState: DatabaseBuilderWizardState }) => {
    const { databaseBuilderState } = props;
    const applicationStore = useApplicationStore();
    const preview = applicationStore.guardUnhandledError(() =>
      flowResult(databaseBuilderState.previewDatabaseModel()),
    );

    return (
      <Panel className="query-connection-workflow-panel query-connection-database-builder-editor">
        <div className="query-connection-workflow-panel query-connection-database-builder-editor__header">
          <PanelHeader title="Database Builder" />
          <button
            className="query-connection-workflow-panel query-connection-database-builder-editor__header__action"
            onClick={preview}
            title="Preview database..."
          >
            <EyeIcon className="query-connection-database-builder-editor__header__action__icon" />
            <div className="query-connection-database-builder-editor__header__action__label">
              Preview
            </div>
          </button>
        </div>
        <Modal
          darkMode={true}
          className="query-connection-database-builder-editor__modal"
        >
          <div className="query-connection-database-builder-editor__modal__content">
            <DatabaseBuilderModalContent
              databaseBuilderState={databaseBuilderState}
            />
          </div>
        </Modal>
      </Panel>
    );
  },
);

const QueryConnectionDatabaseGrammarEditor = observer(
  (props: {
    queryConnectionEndToEndWorkflowState: QueryConnectionEndToEndWorkflowState;
  }) => {
    const { queryConnectionEndToEndWorkflowState } = props;

    const compile = (): void => {
      flowResult(
        queryConnectionEndToEndWorkflowState.compileDatabaseGrammarCode(),
      );
    };

    const updateInput = (val: string): void => {
      queryConnectionEndToEndWorkflowState.setDatabaseGrammarCode(val);
    };

    return (
      <Panel className="query-connection-workflow-panel query-connection-database-builder-editor">
        <div className="query-connection-workflow-panel query-connection-database-builder-editor__header">
          <PanelHeader title="Database Editor" />
          <button
            className="query-connection-workflow-panel query-connection-database-builder-editor__header__action"
            onClick={compile}
            title="Compile database model..."
          >
            Compile
          </button>
        </div>
        <PanelLoadingIndicator
          isLoading={
            queryConnectionEndToEndWorkflowState.isGeneratingDatabaseGrammarCode
              .isInProgress
          }
        />
        <div className="panel__content__form__section__header__prompt  query-connection-database-builder-editor__prompt">
          Joins could be added manually and please confirm there is only one
          database
        </div>
        <div className="query-connection-database-builder-editor__editor">
          <CodeEditor
            inputValue={
              queryConnectionEndToEndWorkflowState.databaseGrammarCode
            }
            updateInput={updateInput}
            language={CODE_EDITOR_LANGUAGE.PURE}
          />
        </div>
      </Panel>
    );
  },
);

const QueryConnectionModelsEditor = observer(
  (props: {
    databaseModelBuilderState: DatabaseModelBuilderState;
    queryConnectionEndToEndWorkflowState: QueryConnectionEndToEndWorkflowState;
  }) => {
    const { databaseModelBuilderState, queryConnectionEndToEndWorkflowState } =
      props;
    const applicationStore = useApplicationStore();

    const debouncedRegenerate = useMemo(
      () =>
        debounce(
          () =>
            flowResult(databaseModelBuilderState.previewDatabaseModels())
              .then(() =>
                queryConnectionEndToEndWorkflowState.setModelEntities(
                  guaranteeNonNullable(databaseModelBuilderState.entities),
                ),
              )
              .then(() =>
                queryConnectionEndToEndWorkflowState.updateGraphWithModels(
                  guaranteeNonNullable(databaseModelBuilderState.entities),
                ),
              ),
          500,
        ),
      [databaseModelBuilderState, queryConnectionEndToEndWorkflowState],
    );

    const targetPackageValidationMessage =
      !databaseModelBuilderState.targetPackage
        ? `Target package path can't be empty`
        : !isValidPath(databaseModelBuilderState.targetPackage)
        ? 'Invalid target package path'
        : undefined;

    const changeTargetPackage: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      databaseModelBuilderState.setTargetPackage(event.target.value);
      debouncedRegenerate()?.catch(applicationStore.alertUnhandledError);
    };
    const isExecutingAction =
      databaseModelBuilderState.generatingModelState.isInProgress ||
      databaseModelBuilderState.saveModelState.isInProgress;

    const runtimeElementAlreadyExistsMessage =
      queryConnectionEndToEndWorkflowState.globalEndToEndWorkflowState.editorStore.graphManagerState.graph.allElements
        .map((s) => s.path)
        .includes(queryConnectionEndToEndWorkflowState.targetRuntimePath)
        ? 'Element with same path already exists or must contain ::'
        : undefined;

    const changeTargetRuntimePackage: React.ChangeEventHandler<
      HTMLInputElement
    > = (event) => {
      queryConnectionEndToEndWorkflowState.setTargetRuntimePath(
        event.target.value,
      );
      if (event.target.value !== '') {
        queryConnectionEndToEndWorkflowState.updateRuntime(event.target.value);
      }
    };

    useEffect(() => {
      flowResult(databaseModelBuilderState.previewDatabaseModels())
        .then(() =>
          queryConnectionEndToEndWorkflowState.setModelEntities(
            guaranteeNonNullable(databaseModelBuilderState.entities),
          ),
        )
        .then(() =>
          queryConnectionEndToEndWorkflowState.updateGraphWithModels(
            guaranteeNonNullable(databaseModelBuilderState.entities),
          ),
        )
        .catch(applicationStore.alertUnhandledError);
    }, [
      applicationStore,
      databaseModelBuilderState,
      queryConnectionEndToEndWorkflowState,
    ]);

    return (
      <Panel className="query-connection-workflow-panel query-connection-database-builder-editor">
        <div className="query-connection-workflow-panel query-connection-database-builder-editor__header">
          <PanelHeader title="Model Builder" />
        </div>
        <Modal
          darkMode={true}
          className="query-connection-connection-model-editor__modal"
        >
          <div className="query-connection-connection-model-editor__modal">
            <ModalBody className="database-builder__content">
              <ResizablePanelGroup orientation="vertical">
                <ResizablePanel size={450}>
                  <div className="database-builder__config">
                    <PanelHeader title="schema explorer" />
                    <PanelContent className="database-builder__config__content">
                      <div className="panel__content__form__section">
                        <div className="panel__content__form__section__header__label">
                          {'Target Package'}
                        </div>
                        <div className="panel__content__form__section__header__prompt">
                          {'Target Package of Mapping and Models Generated'}
                        </div>
                        <InputWithInlineValidation
                          className="query-builder__variables__variable__name__input input-group__input"
                          spellCheck={false}
                          value={databaseModelBuilderState.targetPackage}
                          onChange={changeTargetPackage}
                          placeholder="Target model package path"
                          error={targetPackageValidationMessage}
                        />
                      </div>
                      <div className="panel__content__form__section">
                        <div className="panel__content__form__section__header__label">
                          {'Target Runtime Path'}
                        </div>
                        <div className="panel__content__form__section__header__prompt">
                          {'Target path for runtime'}
                        </div>
                        <InputWithInlineValidation
                          className="query-builder__variables__variable__name__input input-group__input"
                          spellCheck={false}
                          value={
                            queryConnectionEndToEndWorkflowState.targetRuntimePath
                          }
                          onChange={changeTargetRuntimePackage}
                          placeholder="Target Runtime path"
                          error={runtimeElementAlreadyExistsMessage}
                        />
                      </div>
                    </PanelContent>
                  </div>
                </ResizablePanel>
                <ResizablePanelSplitter />
                <ResizablePanel>
                  <Panel className="database-builder__model">
                    <PanelHeader title="database model" />
                    <PanelContent>
                      <PanelLoadingIndicator isLoading={isExecutingAction} />
                      <div className="database-builder__modeler">
                        <div className="database-builder__modeler__preview">
                          {databaseModelBuilderState.generatedGrammarCode && (
                            <CodeEditor
                              language={CODE_EDITOR_LANGUAGE.PURE}
                              inputValue={databaseModelBuilderState.generatedGrammarCode.concat(
                                queryConnectionEndToEndWorkflowState.runtimeGrammarCode,
                              )}
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
          </div>
        </Modal>
      </Panel>
    );
  },
);

const QueryConnectionConfirmationAndGrammarEditor = observer(
  (props: {
    queryConnectionEndToEndWorkflowState: QueryConnectionEndToEndWorkflowState;
  }) => {
    const { queryConnectionEndToEndWorkflowState } = props;

    const compile = (): void => {
      flowResult(queryConnectionEndToEndWorkflowState.compile());
    };

    const updateInput = (val: string): void => {
      queryConnectionEndToEndWorkflowState.setFinalGrammarCode(val);
    };

    return (
      <Panel className="query-connection-workflow-panel query-connection-database-builder-editor">
        <div className="query-connection-workflow-panel query-connection-database-builder-editor__header">
          <PanelHeader title="Database Editor" />
          <button
            className="query-connection-workflow-panel query-connection-database-builder-editor__header__action"
            onClick={compile}
            title="Compile database model..."
          >
            Compile
          </button>
        </div>
        <PanelLoadingIndicator
          isLoading={
            queryConnectionEndToEndWorkflowState.isGeneratingDatabaseGrammarCode
              .isInProgress
          }
        />
        <div className="panel__content__form__section__header__prompt  query-connection-database-builder-editor__prompt">
          Please confirm... add more... more..
        </div>
        <div className="query-connection-database-builder-editor__editor">
          <CodeEditor
            inputValue={queryConnectionEndToEndWorkflowState.finalGrammarCode}
            updateInput={updateInput}
            language={CODE_EDITOR_LANGUAGE.PURE}
          />
        </div>
      </Panel>
    );
  },
);

export const QueryConnectionWorflowEditor = observer(
  (props: {
    queryConnectionEndToEndWorkflowState: QueryConnectionEndToEndWorkflowState;
  }) => {
    const { queryConnectionEndToEndWorkflowState } = props;
    const handleNext = (): void => {
      switch (queryConnectionEndToEndWorkflowState.activeStep) {
        case 0:
          {
            queryConnectionEndToEndWorkflowState.buildDatabaseBuilderWizardState();
            if (queryConnectionEndToEndWorkflowState.isValid) {
              queryConnectionEndToEndWorkflowState.setActiveStep(
                queryConnectionEndToEndWorkflowState.activeStep + 1,
              );
            }
          }
          break;
        case 1:
          {
            flowResult(queryConnectionEndToEndWorkflowState.updateDatabase())
              .then(() => {
                queryConnectionEndToEndWorkflowState.generateDatabaseGrammarCode();
              })
              .then(() => {
                if (queryConnectionEndToEndWorkflowState.isValid) {
                  queryConnectionEndToEndWorkflowState.setActiveStep(
                    queryConnectionEndToEndWorkflowState.activeStep + 1,
                  );
                }
              });
          }
          break;
        case 2:
          {
            flowResult(
              queryConnectionEndToEndWorkflowState.compileDatabaseGrammarCode(),
            ).then(() => {
              if (queryConnectionEndToEndWorkflowState.isValid) {
                queryConnectionEndToEndWorkflowState.setActiveStep(
                  queryConnectionEndToEndWorkflowState.activeStep + 1,
                );
              }
            });
          }
          break;
        case 3:
          {
            queryConnectionEndToEndWorkflowState.setFinalGrammarCode(
              guaranteeNonNullable(
                queryConnectionEndToEndWorkflowState.databaseModelBuilderState
                  ?.generatedGrammarCode,
              )
                .concat(queryConnectionEndToEndWorkflowState.runtimeGrammarCode)
                .concat(
                  queryConnectionEndToEndWorkflowState.databaseGrammarCode,
                )
                .concat(
                  queryConnectionEndToEndWorkflowState.connectionGrammarCode,
                ),
            );
            if (queryConnectionEndToEndWorkflowState.isValid) {
              queryConnectionEndToEndWorkflowState.setActiveStep(
                queryConnectionEndToEndWorkflowState.activeStep + 1,
              );
            }
          }
          break;
        case 4: {
          flowResult(queryConnectionEndToEndWorkflowState.query()).then(() => {
            queryConnectionEndToEndWorkflowState.reset();
          });
          break;
        }
        default:
          if (queryConnectionEndToEndWorkflowState.isValid) {
            queryConnectionEndToEndWorkflowState.setActiveStep(
              queryConnectionEndToEndWorkflowState.activeStep + 1,
            );
          }
      }
    };
    const handleBack = (): void => {
      queryConnectionEndToEndWorkflowState.setActiveStep(
        queryConnectionEndToEndWorkflowState.activeStep - 1,
      );
    };

    const renderStepContent = (): React.ReactNode => {
      switch (queryConnectionEndToEndWorkflowState.activeStep) {
        case 0:
          return (
            <QueryConnectionRelationalConnectionGeneralEditor
              queryConnectionEndToEndWorkflowState={
                queryConnectionEndToEndWorkflowState
              }
            />
          );
        case 1:
          return (
            <QueryConnectionDatabaseBuilderEditor
              databaseBuilderState={guaranteeNonNullable(
                queryConnectionEndToEndWorkflowState.databaseBuilderState,
              )}
            />
          );
        case 2:
          return (
            <QueryConnectionDatabaseGrammarEditor
              queryConnectionEndToEndWorkflowState={
                queryConnectionEndToEndWorkflowState
              }
            />
          );
        case 3:
          return (
            <QueryConnectionModelsEditor
              databaseModelBuilderState={guaranteeNonNullable(
                queryConnectionEndToEndWorkflowState.databaseModelBuilderState,
              )}
              queryConnectionEndToEndWorkflowState={
                queryConnectionEndToEndWorkflowState
              }
            />
          );
        case 4:
          return (
            <QueryConnectionConfirmationAndGrammarEditor
              queryConnectionEndToEndWorkflowState={
                queryConnectionEndToEndWorkflowState
              }
            />
          );
        default:
          return <BlankPanelContent> </BlankPanelContent>;
      }
    };

    return (
      <div>
        <Panel>
          <PanelContent className="test-runner-panel__result">
            <BaseStepper
              steps={QUERY_CONNECTION_WORKFLOW_STEPS}
              activeStep={queryConnectionEndToEndWorkflowState.activeStep}
            ></BaseStepper>
            <PanelContent>
              <div className="query-connection-workflow__content">
                {renderStepContent()}
              </div>
            </PanelContent>
          </PanelContent>
          <ModalFooter className="query-connection-workflow__actions">
            <ModalFooterButton
              className="query-connection-workflow__actions__action-btn"
              disabled={queryConnectionEndToEndWorkflowState.activeStep === 0}
              onClick={handleBack}
              title="Go to previous step..."
            >
              Back
            </ModalFooterButton>
            <ModalFooterButton
              className="query-connection-workflow__actions__action-btn"
              onClick={handleNext}
            >
              {queryConnectionEndToEndWorkflowState.activeStep ===
              QUERY_CONNECTION_WORKFLOW_STEPS.length - 1
                ? 'Query'
                : 'Next'}
            </ModalFooterButton>
          </ModalFooter>
        </Panel>
      </div>
    );
  },
);
