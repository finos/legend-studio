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
  PanelLoadingIndicator,
  ResizablePanelSplitter,
  EyeIcon,
  BlankPanelContent,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import type {
  ConnectionValueStepperState,
  DatabaseGrammarEditorStepperState,
  DatabaseModelBuilderStepperState,
  QueryConnectionConfirmationAndGrammarEditorStepperState,
  QueryConnectionEndToEndWorkflowState,
} from '../../../../stores/editor/sidebar-state/end-to-end-workflow/GlobalEndToEndFlowState.js';
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
import {
  DatabaseModelPackageInput,
  DatabaseModelPreviewEditor,
} from '../connection-editor/DatabaseModelBuilder.js';

export enum QUERY_CONNECTION_WORKFLOW_STEPS {
  CREATE_CONNECTION = 'Create Connection',
  CREATE_DATABASE = 'Create Database',
  EDIT_DATABASE = 'Edit Database',
  CREATE_CLASS_MAPPING_RUNTIME = 'Create Class/Mapping/Runtime',
  CONFIRMATION = 'Confirmation',
}

export const QueryConnectionRelationalConnectionEditor = observer(
  (props: {
    queryConnectionEndToEndWorkflowState: QueryConnectionEndToEndWorkflowState;
    connectionValueStepperState: ConnectionValueStepperState;
  }) => {
    const {
      queryConnectionEndToEndWorkflowState,
      connectionValueStepperState,
    } = props;
    const elementAlreadyExistsMessage =
      queryConnectionEndToEndWorkflowState.globalEndToEndWorkflowState.editorStore.graphManagerState.graph.allElements
        .map((s) => s.path)
        .includes(connectionValueStepperState.targetConnectionPath)
        ? 'Element with same path already exists'
        : undefined;
    const onTargetPathChange: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      connectionValueStepperState.setTargetConnectionPath(event.target.value);
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
                value={connectionValueStepperState.targetConnectionPath}
                error={elementAlreadyExistsMessage}
                showEditableIcon={true}
              />
            </div>
            <div className="query-connection-relational-connection-editor__editor">
              <RelationalConnectionGeneralEditor
                connectionValueState={
                  connectionValueStepperState.connectionValueState
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

export const QueryConnectionDatabaseBuilderEditor = observer(
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

export const QueryConnectionDatabaseGrammarEditor = observer(
  (props: {
    queryConnectionEndToEndWorkflowState: QueryConnectionEndToEndWorkflowState;
    databaseGrammarEditorStepperState: DatabaseGrammarEditorStepperState;
  }) => {
    const {
      queryConnectionEndToEndWorkflowState,
      databaseGrammarEditorStepperState,
    } = props;
    const applicationStore = useApplicationStore();

    const compile = (): void => {
      flowResult(
        databaseGrammarEditorStepperState.compileDatabaseGrammarCode(),
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
            databaseGrammarEditorStepperState.isCompilingGrammarCode
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

export const QueryConnectionModelsEditor = observer(
  (props: {
    databaseModelBuilderStepperState: DatabaseModelBuilderStepperState;
    queryConnectionEndToEndWorkflowState: QueryConnectionEndToEndWorkflowState;
  }) => {
    const {
      databaseModelBuilderStepperState,
      queryConnectionEndToEndWorkflowState,
    } = props;
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
      flowResult(
        databaseModelBuilderStepperState.databaseModelBuilderState.previewDatabaseModels(),
      )
        .then(() =>
          databaseModelBuilderStepperState.updateGraphWithModels(
            guaranteeNonNullable(
              databaseModelBuilderStepperState.databaseModelBuilderState
                .entities,
            ),
          ),
        )
        .catch(applicationStore.alertUnhandledError);
    }, [
      applicationStore,
      databaseModelBuilderStepperState,
      databaseModelBuilderStepperState.databaseModelBuilderState,
      databaseModelBuilderStepperState.databaseModelBuilderState.targetPackage,
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
                        databaseModelBuilderState={
                          databaseModelBuilderStepperState.databaseModelBuilderState
                        }
                      />
                      <div className="panel__content__form__section">
                        <div className="panel__content__form__section__header__label">
                          Target Runtime Path
                        </div>
                        <div className="panel__content__form__section__header__prompt">
                          Target path for runtime
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
                    databaseModelBuilderState={
                      databaseModelBuilderStepperState.databaseModelBuilderState
                    }
                    grammarCode={databaseModelBuilderStepperState.databaseModelBuilderState.generatedGrammarCode.concat(
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

export const QueryConnectionConfirmationAndGrammarEditor = observer(
  (props: {
    queryConnectionEndToEndWorkflowState: QueryConnectionEndToEndWorkflowState;
    queryConnectionConfirmationAndGrammarEditorStepperState: QueryConnectionConfirmationAndGrammarEditorStepperState;
  }) => {
    const {
      queryConnectionEndToEndWorkflowState,
      queryConnectionConfirmationAndGrammarEditorStepperState,
    } = props;
    const applicationStore = useApplicationStore();

    const compile = (): void => {
      flowResult(
        queryConnectionConfirmationAndGrammarEditorStepperState.compile(),
      ).catch(applicationStore.alertUnhandledError);
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
            queryConnectionConfirmationAndGrammarEditorStepperState
              .isCompilingCode.isInProgress
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
    const stepLabel =
      queryConnectionEndToEndWorkflowState.activeStepToStepLabel.get(
        queryConnectionEndToEndWorkflowState.activeStep,
      );
    const increaseActiveStep = (): void => {
      if (queryConnectionEndToEndWorkflowState.isValid) {
        queryConnectionEndToEndWorkflowState.setActiveStep(
          queryConnectionEndToEndWorkflowState.activeStep + 1,
        );
      }
    };
    const handleNext = (): void => {
      if (stepLabel) {
        flowResult(
          queryConnectionEndToEndWorkflowState.activeStepToBaseStepperState
            .get(stepLabel)
            ?.handleNext(),
        )
          .then(() => increaseActiveStep())
          .catch(applicationStore.alertUnhandledError);
      }
    };
    const handleBack = (): void => {
      queryConnectionEndToEndWorkflowState.setCompileError(undefined);
      queryConnectionEndToEndWorkflowState.setActiveStep(
        queryConnectionEndToEndWorkflowState.activeStep - 1,
      );
    };

    const renderStepContent = (): React.ReactNode => {
      if (stepLabel) {
        return queryConnectionEndToEndWorkflowState.activeStepToBaseStepperState
          .get(stepLabel)
          ?.renderStepContent();
      } else {
        return <BlankPanelContent> </BlankPanelContent>;
      }
    };

    return (
      <div>
        <Panel>
          <PanelContent className="test-runner-panel__result">
            <BaseStepper
              steps={Object.values(QUERY_CONNECTION_WORKFLOW_STEPS)}
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
              Object.values(QUERY_CONNECTION_WORKFLOW_STEPS).length - 1
                ? 'Import And Query'
                : 'Next'}
            </button>
          </div>
        </Panel>
      </div>
    );
  },
);
