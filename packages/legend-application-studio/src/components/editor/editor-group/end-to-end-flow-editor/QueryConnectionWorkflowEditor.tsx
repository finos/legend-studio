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
import {
  DatabaseModelPackageInput,
  DatabaseModelPreviewEditor,
} from '../connection-editor/DatabaseModelBuilder.js';

const QUERY_CONNECTION_WORKFLOW_STEPS = [
  'Create Connection',
  'Create Database',
  'Edit Database',
  'Create Class/Mapping/Runtime',
  'Confirmation',
];

const QueryConnectionRelationalConnectionEditor = observer(
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
                showEditableIcon={true}
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
    const applicationStore = useApplicationStore();

    const compile = (): void => {
      flowResult(
        queryConnectionEndToEndWorkflowState.compileDatabaseGrammarCode(),
      ).catch(applicationStore.alertUnhandledError);
    };

    const updateDatabaseGrammar = (val: string): void => {
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
          Joins could be added manually and please be aware that only one
          database is supported in this flow
        </div>
        <div className="query-connection-database-builder-editor__editor">
          <CodeEditor
            inputValue={
              queryConnectionEndToEndWorkflowState.databaseGrammarCode
            }
            updateInput={updateDatabaseGrammar}
            language={CODE_EDITOR_LANGUAGE.PURE}
            error={queryConnectionEndToEndWorkflowState.compileError}
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

    const runtimeElementAlreadyExistsMessage =
      queryConnectionEndToEndWorkflowState.globalEndToEndWorkflowState.editorStore.graphManagerState.graph.allElements
        .map((s) => s.path)
        .includes(queryConnectionEndToEndWorkflowState.targetRuntimePath)
        ? 'Element with same path already exists or must contain ::'
        : undefined;

    const debouncedRegenerateRuntime = useMemo(
      () =>
        debounce(
          (val: string) => {
            if (val !== '') {
              queryConnectionEndToEndWorkflowState.updateRuntime(val);
            }
          },

          500,
        ),
      [queryConnectionEndToEndWorkflowState],
    );

    const changeTargetRuntimePackage: React.ChangeEventHandler<
      HTMLInputElement
    > = (event) => {
      queryConnectionEndToEndWorkflowState.setTargetRuntimePath(
        event.target.value,
      );
      debouncedRegenerateRuntime(event.target.value);
    };

    useEffect(() => {
      flowResult(databaseModelBuilderState.previewDatabaseModels())
        .then(() =>
          queryConnectionEndToEndWorkflowState.updateGraphWithModels(
            guaranteeNonNullable(databaseModelBuilderState.entities),
          ),
        )
        .catch(applicationStore.alertUnhandledError);
    }, [
      applicationStore,
      databaseModelBuilderState,
      databaseModelBuilderState.targetPackage,
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
                      <DatabaseModelPackageInput
                        databaseModelBuilderState={databaseModelBuilderState}
                      />
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
                          showEditableIcon={true}
                        />
                      </div>
                    </PanelContent>
                  </div>
                </ResizablePanel>
                <ResizablePanelSplitter />
                <ResizablePanel>
                  <DatabaseModelPreviewEditor
                    databaseModelBuilderState={databaseModelBuilderState}
                    grammarCode={databaseModelBuilderState.generatedGrammarCode.concat(
                      queryConnectionEndToEndWorkflowState.runtimeGrammarCode,
                    )}
                  />
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
    const applicationStore = useApplicationStore();

    const compile = (): void => {
      flowResult(queryConnectionEndToEndWorkflowState.compile()).catch(
        applicationStore.alertUnhandledError,
      );
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
            title="Compile model..."
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
          Please confirm models below will be added to the project and click
          query to open query builder
        </div>
        <div className="query-connection-database-builder-editor__editor">
          <CodeEditor
            inputValue={queryConnectionEndToEndWorkflowState.finalGrammarCode}
            updateInput={updateInput}
            language={CODE_EDITOR_LANGUAGE.PURE}
            error={queryConnectionEndToEndWorkflowState.compileError}
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
    const applicationStore = useApplicationStore();
    const increaseActiveStep = (): void => {
      if (queryConnectionEndToEndWorkflowState.isValid) {
        queryConnectionEndToEndWorkflowState.setActiveStep(
          queryConnectionEndToEndWorkflowState.activeStep + 1,
        );
      }
    };
    const handleNext = (): void => {
      switch (queryConnectionEndToEndWorkflowState.activeStep) {
        case 0:
          {
            queryConnectionEndToEndWorkflowState.buildDatabaseBuilderWizardState();
            increaseActiveStep();
          }
          break;
        case 1:
          {
            flowResult(queryConnectionEndToEndWorkflowState.buildDatabase())
              .then(() => {
                queryConnectionEndToEndWorkflowState.generateDatabaseGrammarCode();
              })
              .then(() => {
                increaseActiveStep();
              })
              .catch(applicationStore.alertUnhandledError);
          }
          break;
        case 2:
          {
            flowResult(
              queryConnectionEndToEndWorkflowState.compileDatabaseGrammarCode(),
            )
              .then(() => {
                queryConnectionEndToEndWorkflowState.buildDatabaseModelBuilderState();
              })
              .then(() => {
                increaseActiveStep();
              })
              .catch(applicationStore.alertUnhandledError);
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
            increaseActiveStep();
          }
          break;
        case 4: {
          flowResult(queryConnectionEndToEndWorkflowState.query())
            .then(() => {
              queryConnectionEndToEndWorkflowState.reset();
            })
            .catch(applicationStore.alertUnhandledError);
          break;
        }
        default:
          increaseActiveStep();
      }
    };
    const handleBack = (): void => {
      queryConnectionEndToEndWorkflowState.setCompileError(undefined);
      queryConnectionEndToEndWorkflowState.setActiveStep(
        queryConnectionEndToEndWorkflowState.activeStep - 1,
      );
    };

    const renderStepContent = (): React.ReactNode => {
      switch (queryConnectionEndToEndWorkflowState.activeStep) {
        case 0:
          return (
            <QueryConnectionRelationalConnectionEditor
              queryConnectionEndToEndWorkflowState={
                queryConnectionEndToEndWorkflowState
              }
            />
          );
        case 1:
          return (
            <QueryConnectionDatabaseBuilderEditor
              databaseBuilderState={guaranteeNonNullable(
                queryConnectionEndToEndWorkflowState.databaseBuilderWizardState,
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
          <div className="query-connection-workflow__actions">
            <button
              className="query-connection-workflow__actions__action-btn"
              disabled={queryConnectionEndToEndWorkflowState.activeStep === 0}
              onClick={handleBack}
              title="Go to previous step..."
            >
              Back
            </button>
            <button
              className="query-connection-workflow__actions__action-btn query-connection-workflow__actions__action-btn--primary"
              onClick={handleNext}
            >
              {queryConnectionEndToEndWorkflowState.activeStep ===
              QUERY_CONNECTION_WORKFLOW_STEPS.length - 1
                ? 'Import And Query'
                : 'Next'}
            </button>
          </div>
        </Panel>
      </div>
    );
  },
);
