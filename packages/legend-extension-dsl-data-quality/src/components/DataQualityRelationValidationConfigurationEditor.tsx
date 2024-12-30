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
  type UMLEditorElementDropTarget,
  type ElementDragSource,
  CORE_DND_TYPE,
  useEditorStore,
} from '@finos/legend-application-studio';
import {
  DATA_QUALITY_RELATION_VALIDATION_EDITOR_TAB,
  DataQualityRelationValidationConfigurationState,
} from './states/DataQualityRelationValidationConfigurationState.js';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  BlankPanelContent,
  CaretDownIcon,
  clsx,
  ControlledDropdownMenu,
  CsvIcon,
  DragPreviewLayer,
  ExclamationTriangleIcon,
  MenuContent,
  MenuContentItem,
  MenuContentItemIcon,
  MenuContentItemLabel,
  Panel,
  PanelContent,
  PanelLoadingIndicator,
  PauseCircleIcon,
  PlayIcon,
  PlusIcon,
} from '@finos/legend-art';
import {
  prettyCONSTName,
  prettyDuration,
  returnUndefOnError,
} from '@finos/legend-shared';
import {
  ExecutionPlanViewer,
  LambdaEditor,
  LambdaParameterValuesEditor,
} from '@finos/legend-query-builder';
import {
  type RawVariableExpression,
  type ExecutionResult,
  PrimitiveType,
  stub_RawVariableExpression,
  Type,
  RawExecutionResult,
  extractExecutionResultValues,
  TDSExecutionResult,
} from '@finos/legend-graph';
import {
  ActionAlertActionType,
  ActionAlertType,
  DEFAULT_TAB_SIZE,
  useApplicationNavigationContext,
  useApplicationStore,
} from '@finos/legend-application';
import {
  dataQualityRelationValidation_addParameter,
  dataQualityRelationValidation_deleteParameter,
} from '../graph-manager/DSL_DataQuality_GraphModifierHelper.js';
import { flowResult } from 'mobx';
import { DataQualityRelationTrialRuns } from './DataQualityRelationTrialRuns.js';
import {
  type FunctionParameterDragSource,
  DataQualityValidationParametersEditor,
  FUNCTION_PARAMETER_DND_TYPE,
} from './DataQualityValidationParametersEditor.js';
import { useDrop } from 'react-dnd';
import { DataQualityRelationValidationsEditor } from './DataQualityRelationValidationsEditor.js';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { DataQualityRelationGridResult } from './DataQualityRelationGridResult.js';
import {
  DATA_QUALITY_VALIDATION_TEST_ID,
  USER_ATTESTATION_MESSAGE,
} from './constants/DataQualityConstants.js';

const RelationDefinitionEditor = observer(
  (props: {
    dataQualityRelationValidationConfigurationState: DataQualityRelationValidationConfigurationState;
  }) => {
    const { dataQualityRelationValidationConfigurationState } = props;
    const { relationFunctionDefinitionEditorState, resultState } =
      dataQualityRelationValidationConfigurationState;
    const {
      editorStore: { applicationStore },
    } = dataQualityRelationValidationConfigurationState;
    const validationElement =
      dataQualityRelationValidationConfigurationState.validationElement;
    const lambdaExecutionResult =
      dataQualityRelationValidationConfigurationState.executionResult;

    const isReadOnly =
      dataQualityRelationValidationConfigurationState.isReadOnly;

    const isExportDisabled =
      dataQualityRelationValidationConfigurationState.isRunningValidation ||
      dataQualityRelationValidationConfigurationState.isGeneratingPlan;

    const exportValidationResults = async (format: string): Promise<void> => {
      dataQualityRelationValidationConfigurationState.handleExport(format);
    };

    const getResultSetDescription = (
      _executionResult: ExecutionResult,
    ): string | undefined => {
      const queryDuration =
        dataQualityRelationValidationConfigurationState.executionDuration
          ? prettyDuration(
              dataQualityRelationValidationConfigurationState.executionDuration,
              {
                ms: true,
              },
            )
          : undefined;
      if (!queryDuration) {
        return undefined;
      }
      return `lambda ran in ${queryDuration}`;
    };
    const resultDescription =
      !dataQualityRelationValidationConfigurationState.isRunningValidation &&
      lambdaExecutionResult
        ? getResultSetDescription(lambdaExecutionResult)
        : undefined;

    const confirmExport = (format: string): void => {
      applicationStore.alertService.setActionAlertInfo({
        message: USER_ATTESTATION_MESSAGE,
        type: ActionAlertType.CAUTION,
        actions: [
          {
            label: 'Accept',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler: applicationStore.guardUnhandledError(() =>
              exportValidationResults(format),
            ),
          },
          {
            label: 'Decline',
            type: ActionAlertActionType.PROCEED,
            default: true,
          },
        ],
      });
    };

    const addParameter = (): void => {
      dataQualityRelationValidation_addParameter(
        validationElement.query.parameters,
        stub_RawVariableExpression(PrimitiveType.STRING),
      );
    };

    const deleteParameter =
      (val: RawVariableExpression): (() => void) =>
      (): void => {
        dataQualityRelationValidation_deleteParameter(
          validationElement.query.parameters,
          val,
        );
      };

    const handleDropParameter = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        if (!isReadOnly && item.data.packageableElement instanceof Type) {
          dataQualityRelationValidation_addParameter(
            validationElement.query.parameters,
            stub_RawVariableExpression(item.data.packageableElement),
          );
        }
      },
      [validationElement, isReadOnly],
    );
    const [{ isParameterDragOver }, dropConnector] = useDrop<
      ElementDragSource,
      void,
      { isParameterDragOver: boolean }
    >(
      () => ({
        accept: [
          CORE_DND_TYPE.PROJECT_EXPLORER_CLASS,
          CORE_DND_TYPE.PROJECT_EXPLORER_ENUMERATION,
        ],
        drop: (item) => handleDropParameter(item),
        collect: (monitor) => ({
          isParameterDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDropParameter],
    );
    const ref = useRef<HTMLDivElement>(null);
    dropConnector(ref);

    const renderFuncResult = (): React.ReactNode => {
      if (lambdaExecutionResult instanceof TDSExecutionResult) {
        return (
          <DataQualityRelationGridResult
            executionResult={lambdaExecutionResult}
            relationValidationConfigurationState={
              dataQualityRelationValidationConfigurationState
            }
          />
        );
      }
      if (lambdaExecutionResult instanceof RawExecutionResult) {
        const val =
          lambdaExecutionResult.value === null
            ? 'null'
            : lambdaExecutionResult.value.toString();
        return (
          <CodeEditor
            language={CODE_EDITOR_LANGUAGE.TEXT}
            inputValue={val}
            isReadOnly={true}
          />
        );
      } else if (lambdaExecutionResult !== undefined) {
        const json =
          returnUndefOnError(() =>
            JSON.stringify(
              extractExecutionResultValues(lambdaExecutionResult),
              null,
              DEFAULT_TAB_SIZE,
            ),
          ) ?? JSON.stringify(lambdaExecutionResult);
        return (
          <CodeEditor
            language={CODE_EDITOR_LANGUAGE.JSON}
            inputValue={json}
            isReadOnly={true}
          />
        );
      }
      return <BlankPanelContent>Lambda Did Not Run</BlankPanelContent>;
    };

    return (
      <>
        <PanelLoadingIndicator
          isLoading={
            resultState.isGeneratingPlan ||
            dataQualityRelationValidationConfigurationState.isRunningValidation
          }
        />
        <div className="relation-validation-config-editor__definition">
          <div className="relation-validation-config-editor__definition__item">
            <div className="relation-validation-config-editor__definition__item__header">
              <div className="relation-validation-config-editor__definition__item__header__title">
                PARAMETERS
              </div>
              <button
                className="relation-validation-config-editor__definition__item__header__add-btn btn--dark"
                disabled={isReadOnly}
                onClick={addParameter}
                tabIndex={-1}
                title="Add Parameter"
              >
                <PlusIcon />
              </button>
            </div>
            <DragPreviewLayer
              labelGetter={(item: FunctionParameterDragSource): string =>
                item.parameter.name === '' ? '(unknown)' : item.parameter.name
              }
              types={[FUNCTION_PARAMETER_DND_TYPE]}
            />
            <div
              ref={ref}
              className={clsx(
                'relation-validation-config-editor__definition__item__content',
                {
                  'panel__content__lists--dnd-over':
                    isParameterDragOver && !isReadOnly,
                },
              )}
            >
              {validationElement.query.parameters.map((param) => (
                <DataQualityValidationParametersEditor
                  key={param._UUID}
                  parameter={param}
                  _validationConfig={validationElement}
                  deleteParameter={deleteParameter(param)}
                  isReadOnly={isReadOnly}
                />
              ))}
              {validationElement.query.parameters.length === 0 && (
                <div className="relation-validation-config-editor__definition__item__content--empty">
                  No parameters
                </div>
              )}
            </div>
          </div>
          <div className="relation-validation-config-editor__definition__item">
            <div className="relation-validation-config-editor__definition__item__header">
              <div className="relation-validation-config-editor__definition__item__header__title">
                LAMBDA
              </div>
            </div>
            <div
              className={clsx(
                'relation-validation-config-editor__definition__item__content',
                {
                  backdrop__element: Boolean(
                    relationFunctionDefinitionEditorState.parserError,
                  ),
                },
              )}
            >
              <LambdaEditor
                className="relation-validation-config-editor__definition__lambda-editor lambda-editor--dark"
                disabled={
                  relationFunctionDefinitionEditorState.isConvertingFunctionBodyToString ||
                  false
                }
                lambdaEditorState={relationFunctionDefinitionEditorState}
                forceBackdrop={false}
                autoFocus={true}
              />
            </div>
          </div>
          <div className="relation-validation-config-editor__item">
            <div className="relation-validation-config-editor__definition__item__header">
              <div className="relation-validation-config-editor__definition__item__header-group">
                <div className="relation-validation-config-editor__definition__item__header__title">
                  RESULT
                </div>
                {dataQualityRelationValidationConfigurationState.isRunningValidation && (
                  <div className="panel__header__title__label__status">
                    Running Validation...
                  </div>
                )}
                <div
                  data-testid={
                    DATA_QUALITY_VALIDATION_TEST_ID.DATA_QUALITY_VALIDATION_RESULT_ANALYTICS
                  }
                  className="data-quality-validation__result__analytics"
                >
                  {resultDescription ?? ''}
                </div>
                {lambdaExecutionResult &&
                  dataQualityRelationValidationConfigurationState.checkForStaleResults && (
                    <div className="data-quality-validation__result__stale-status">
                      <div className="data-quality-validation__result__stale-status__icon">
                        <ExclamationTriangleIcon />
                      </div>
                      <div className="data-quality-validation__result__stale-status__label">
                        Preview data might be stale
                      </div>
                    </div>
                  )}
              </div>
              <ControlledDropdownMenu
                className="data-quality-validation__result__export__dropdown"
                title="Export"
                disabled={isExportDisabled}
                content={
                  <MenuContent>
                    {Object.values(resultState.exportDataFormatOptions).map(
                      (format) => (
                        <MenuContentItem
                          key={format}
                          onClick={(): void => confirmExport(format)}
                        >
                          <MenuContentItemIcon>
                            <CsvIcon />
                          </MenuContentItemIcon>
                          <MenuContentItemLabel>{format}</MenuContentItemLabel>
                        </MenuContentItem>
                      ),
                    )}
                  </MenuContent>
                }
                menuProps={{
                  anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                  transformOrigin: { vertical: 'top', horizontal: 'right' },
                  elevation: 7,
                }}
              >
                <div className="relation-validation-config-editor__definition__item__header__action">
                  <div className="data-quality-validation__result__export__dropdown__label">
                    Export
                  </div>
                  <div className="data-quality-validation__result__export__dropdown__trigger">
                    <CaretDownIcon />
                  </div>
                </div>
              </ControlledDropdownMenu>
            </div>
            <div className="relation-validation-config-editor__definition__item__content">
              <div className="relation-validation-config-editor__definition__result-viewer">
                {renderFuncResult()}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  },
);

export const DataQualityRelationValidationConfigurationEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const dataQualityRelationValidationConfigurationState =
    editorStore.tabManagerState.getCurrentEditorState(
      DataQualityRelationValidationConfigurationState,
    );
  const dataQualityRelationValidationElement =
    dataQualityRelationValidationConfigurationState.validationElement;
  const selectedTab =
    dataQualityRelationValidationConfigurationState.selectedTab;

  const changeTab =
    (tab: DATA_QUALITY_RELATION_VALIDATION_EDITOR_TAB): (() => void) =>
    (): void =>
      dataQualityRelationValidationConfigurationState.setSelectedTab(tab);

  const executionIsRunning =
    dataQualityRelationValidationConfigurationState.isRunningValidation ||
    dataQualityRelationValidationConfigurationState.isGeneratingPlan;

  const cancelValidation = applicationStore.guardUnhandledError(() =>
    flowResult(
      dataQualityRelationValidationConfigurationState.cancelValidationRun(),
    ),
  );

  const runValidation = applicationStore.guardUnhandledError(() =>
    flowResult(
      dataQualityRelationValidationConfigurationState.handleRunValidation(),
    ),
  );

  const generatePlan = applicationStore.guardUnhandledError(() =>
    flowResult(
      dataQualityRelationValidationConfigurationState.generatePlan(false),
    ),
  );

  const debugPlanGeneration = applicationStore.guardUnhandledError(() =>
    flowResult(
      dataQualityRelationValidationConfigurationState.generatePlan(true),
    ),
  );

  useEffect(() => {
    flowResult(
      dataQualityRelationValidationConfigurationState.relationFunctionDefinitionEditorState.convertLambdaObjectToGrammarString(
        {
          pretty: true,
          firstLoad: true,
        },
      ),
    ).catch(applicationStore.alertUnhandledError);
    flowResult(
      dataQualityRelationValidationConfigurationState.convertValidationLambdaObjects(),
    ).catch(applicationStore.alertUnhandledError);
  }, [applicationStore, dataQualityRelationValidationConfigurationState]);

  useApplicationNavigationContext('studio.editor.dq-relation-editor');

  return (
    <div className="relation-validation-config-editor uml-editor uml-editor--dark">
      <Panel>
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">
              dataQualityRelationValidation
            </div>
            <div className="panel__header__title__content">
              {dataQualityRelationValidationElement.name}
            </div>
          </div>
        </div>
        <div className="panel__header relation-validation-config-editor__tabs__header">
          <div className="relation-validation-config-editor__tabs">
            {Object.values(DATA_QUALITY_RELATION_VALIDATION_EDITOR_TAB).map(
              (tab) => (
                <div
                  key={tab}
                  onClick={changeTab(tab)}
                  className={clsx('relation-validation-config-editor__tab', {
                    'relation-validation-config-editor__tab--active':
                      tab === selectedTab,
                  })}
                >
                  {prettyCONSTName(tab)}
                </div>
              ),
            )}
          </div>
          <div className="panel__header__actions">
            {selectedTab ===
              DATA_QUALITY_RELATION_VALIDATION_EDITOR_TAB.DEFINITION && (
              <>
                <div className="btn__dropdown-combo btn__dropdown-combo--primary">
                  {dataQualityRelationValidationConfigurationState.isRunningValidation ? (
                    <button
                      className="btn__dropdown-combo__canceler"
                      onClick={cancelValidation}
                      tabIndex={-1}
                    >
                      <div className="btn--dark btn--caution btn__dropdown-combo__canceler__label">
                        <PauseCircleIcon className="btn__dropdown-combo__canceler__label__icon" />
                        <div className="btn__dropdown-combo__canceler__label__title">
                          Stop
                        </div>
                      </div>
                    </button>
                  ) : (
                    <>
                      <button
                        className="btn__dropdown-combo__label"
                        onClick={runValidation}
                        title="Run Function"
                        disabled={executionIsRunning}
                        tabIndex={-1}
                      >
                        <PlayIcon className="btn__dropdown-combo__label__icon" />
                        <div className="btn__dropdown-combo__label__title">
                          Run
                        </div>
                      </button>
                      <ControlledDropdownMenu
                        className="btn__dropdown-combo__dropdown-btn"
                        disabled={executionIsRunning}
                        content={
                          <MenuContent>
                            <MenuContentItem
                              className="btn__dropdown-combo__option"
                              onClick={generatePlan}
                            >
                              Generate Plan
                            </MenuContentItem>
                            <MenuContentItem
                              className="btn__dropdown-combo__option"
                              onClick={debugPlanGeneration}
                            >
                              Debug
                            </MenuContentItem>
                          </MenuContent>
                        }
                        menuProps={{
                          anchorOrigin: {
                            vertical: 'bottom',
                            horizontal: 'right',
                          },
                          transformOrigin: {
                            vertical: 'top',
                            horizontal: 'right',
                          },
                        }}
                      >
                        <CaretDownIcon />
                      </ControlledDropdownMenu>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        <PanelContent>
          {selectedTab ===
            DATA_QUALITY_RELATION_VALIDATION_EDITOR_TAB.DEFINITION && (
            <RelationDefinitionEditor
              dataQualityRelationValidationConfigurationState={
                dataQualityRelationValidationConfigurationState
              }
            />
          )}
          {selectedTab ===
            DATA_QUALITY_RELATION_VALIDATION_EDITOR_TAB.TRIAL_RUN && (
            <DataQualityRelationTrialRuns
              dataQualityRelationValidationConfigurationState={
                dataQualityRelationValidationConfigurationState
              }
            />
          )}
          {selectedTab ===
            DATA_QUALITY_RELATION_VALIDATION_EDITOR_TAB.VALIDATIONS && (
            <DataQualityRelationValidationsEditor
              dataQualityRelationValidationConfigurationState={
                dataQualityRelationValidationConfigurationState
              }
            />
          )}
        </PanelContent>
      </Panel>
      <ExecutionPlanViewer
        executionPlanState={
          dataQualityRelationValidationConfigurationState.executionPlanState
        }
      />
      {dataQualityRelationValidationConfigurationState.parametersState
        .parameterValuesEditorState.showModal && (
        <LambdaParameterValuesEditor
          graph={
            dataQualityRelationValidationConfigurationState.editorStore
              .graphManagerState.graph
          }
          observerContext={
            dataQualityRelationValidationConfigurationState.editorStore
              .changeDetectionState.observerContext
          }
          lambdaParametersState={
            dataQualityRelationValidationConfigurationState.parametersState
          }
        />
      )}
    </div>
  );
});
