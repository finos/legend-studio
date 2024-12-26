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
  ActionAlertActionType,
  ActionAlertType,
  useApplicationStore,
} from '@finos/legend-application';
import { flowResult } from 'mobx';
import {
  ExecutionPlanViewer,
  LambdaParameterValuesEditor,
} from '@finos/legend-query-builder';
import { type ExecutionResult } from '@finos/legend-graph';
import { prettyDuration } from '@finos/legend-shared';
import React, { useRef, useState } from 'react';
import {
  DATA_QUALITY_VALIDATION_TEST_ID,
  USER_ATTESTATION_MESSAGE,
} from './constants/DataQualityConstants.js';
import {
  type SelectOption,
  BlankPanelContent,
  CaretDownIcon,
  ControlledDropdownMenu,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
  CustomSelectorInput,
  DebugIcon,
  ExclamationTriangleIcon,
  MenuContent,
  MenuContentItem,
  MenuContentItemIcon,
  MenuContentItemLabel,
  PanelContent,
  PauseCircleIcon,
  PlayIcon,
  ReportIcon,
  CsvIcon,
} from '@finos/legend-art';
import { DataQualityResultValues } from './DataQualityResultValues.js';
import type { DataQualityRelationValidationConfigurationState } from './states/DataQualityRelationValidationConfigurationState.js';

export const DataQualityRelationTrialRuns = observer(
  (props: {
    dataQualityRelationValidationConfigurationState: DataQualityRelationValidationConfigurationState;
  }) => {
    const { dataQualityRelationValidationConfigurationState } = props;
    const applicationStore = useApplicationStore();
    const resultState =
      dataQualityRelationValidationConfigurationState.resultState;
    const executionResult = resultState.executionResult;

    const exportValidationResults = async (format: string): Promise<void> => {
      resultState.handleExport(format);
    };

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

    const runQuery = (): void => {
      if (!resultState.isRunningValidation) {
        resultState.handleRunValidation();
      }
    };

    const cancelQuery = applicationStore.guardUnhandledError(() =>
      flowResult(resultState.cancelValidation()),
    );

    const generatePlan = applicationStore.guardUnhandledError(() => {
      return flowResult(resultState.generatePlan(false));
    });
    const debugPlanGeneration = applicationStore.guardUnhandledError(() =>
      flowResult(resultState.generatePlan(true)),
    );

    const isRunValidationDisabled =
      !resultState.validationToRun ||
      resultState.isGeneratingPlan ||
      resultState.isRunningValidation;

    const getResultSetDescription = (
      _executionResult: ExecutionResult,
    ): string | undefined => {
      const queryDuration = resultState.executionDuration
        ? prettyDuration(resultState.executionDuration, {
            ms: true,
          })
        : undefined;
      if (!queryDuration) {
        return undefined;
      }
      return `validation ran in ${queryDuration}`;
    };
    const resultDescription =
      !resultState.isRunningValidation && executionResult
        ? getResultSetDescription(executionResult)
        : undefined;

    const [previewLimitValue, setPreviewLimitValue] = useState(
      resultState.previewLimit,
    );

    const changePreviewLimit: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      setPreviewLimitValue(parseInt(event.target.value, 10));
    };

    const inputRef = useRef<HTMLInputElement>(null);

    const getPreviewLimit = (): void => {
      if (isNaN(previewLimitValue) || previewLimitValue === 0) {
        setPreviewLimitValue(1);
        dataQualityRelationValidationConfigurationState.resultState.setPreviewLimit(
          1,
        );
      } else {
        dataQualityRelationValidationConfigurationState.resultState.setPreviewLimit(
          previewLimitValue,
        );
      }
    };

    const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
      if (event.code === 'Enter') {
        getPreviewLimit();
        inputRef.current?.focus();
      } else if (event.code === 'Escape') {
        inputRef.current?.select();
      }
    };

    const isLoading =
      resultState.isRunningValidation || resultState.isGeneratingPlan;

    const selectedValidation = dataQualityRelationValidationConfigurationState
      .resultState.validationToRun
      ? {
          label:
            dataQualityRelationValidationConfigurationState.resultState
              .validationToRun.name,
          value:
            dataQualityRelationValidationConfigurationState.resultState
              .validationToRun,
        }
      : undefined;

    const onValidationChange = (val: SelectOption | null): void => {
      dataQualityRelationValidationConfigurationState.resetResultState();
      dataQualityRelationValidationConfigurationState.resultState.setValidationToRun(
        val?.value,
      );
    };

    return (
      <div
        data-testid={
          DATA_QUALITY_VALIDATION_TEST_ID.DATA_QUALITY_VALIDATION_RESULT_PANEL
        }
        className="panel data-quality-validation__result"
      >
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">results</div>
            {resultState.isRunningValidation && (
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
            {executionResult && resultState.checkForStaleResults && (
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
          <div className="panel__header__actions data-quality-validation__result__header__actions">
            <div className="data-quality-validation__result__validation">
              <div className="data-quality-validation__result__validation__label">
                Selected Validation
              </div>
              <CustomSelectorInput
                className="data-quality-validation__result__validation__dropdown"
                options={
                  dataQualityRelationValidationConfigurationState.validationOptions
                }
                onChange={onValidationChange}
                value={selectedValidation}
                darkMode={
                  !applicationStore.layoutService
                    .TEMPORARY__isLightColorThemeEnabled
                }
                placeholder={'Select validation to run'}
              />
            </div>
            <div className="data-quality-validation__result__limit">
              <div className="data-quality-validation__result__limit__label">
                preview row limit
              </div>
              <input
                ref={inputRef}
                className="input--dark data-quality-validation__result__limit__input"
                spellCheck={false}
                type="number"
                value={previewLimitValue}
                onChange={changePreviewLimit}
                onBlur={getPreviewLimit}
                onKeyDown={onKeyDown}
              />
            </div>

            <div className="data-quality-validation__result__execute-btn btn__dropdown-combo btn__dropdown-combo--primary">
              {resultState.isRunningValidation ? (
                <button
                  className="btn__dropdown-combo__canceler data-quality-validation__result__execute-btn__btn"
                  onClick={cancelQuery}
                  tabIndex={-1}
                >
                  <div className="btn--dark btn--caution btn__dropdown-combo__canceler__label data-quality-validation__result__execute-btn__btn">
                    <PauseCircleIcon />
                    Stop
                  </div>
                </button>
              ) : (
                <>
                  <button
                    className="btn__dropdown-combo__label data-quality-validation__result__execute-btn__validation data-quality-validation__result__execute-btn__btn data-quality-validation__result__execute-btn__btn--green"
                    onClick={runQuery}
                    tabIndex={-1}
                    disabled={isRunValidationDisabled}
                  >
                    <PlayIcon />
                    Run Validation
                  </button>
                  <ControlledDropdownMenu
                    className="btn__dropdown-combo__dropdown-btn data-quality-validation__result__execute-btn__btn data-quality-validation__result__execute-btn__btn--green"
                    disabled={isRunValidationDisabled}
                    content={
                      <MenuContent>
                        <MenuContentItem
                          className="btn__dropdown-combo__option"
                          onClick={generatePlan}
                          disabled={isRunValidationDisabled}
                        >
                          <MenuContentItemIcon>
                            <ReportIcon />
                          </MenuContentItemIcon>
                          <MenuContentItemLabel>
                            Generate Plan
                          </MenuContentItemLabel>
                        </MenuContentItem>
                        <MenuContentItem
                          className="btn__dropdown-combo__option"
                          onClick={debugPlanGeneration}
                          disabled={isRunValidationDisabled}
                        >
                          <MenuContentItemIcon>
                            <DebugIcon />
                          </MenuContentItemIcon>
                          <MenuContentItemLabel>Debug</MenuContentItemLabel>
                        </MenuContentItem>
                      </MenuContent>
                    }
                    menuProps={{
                      anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                      transformOrigin: { vertical: 'top', horizontal: 'right' },
                    }}
                  >
                    <CaretDownIcon />
                  </ControlledDropdownMenu>
                </>
              )}
            </div>
            <ControlledDropdownMenu
              className="data-quality-validation__result__export__dropdown"
              title="Export"
              disabled={isRunValidationDisabled}
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
              <div className="data-quality-validation__result__export__dropdown__label">
                Export
              </div>
              <div className="data-quality-validation__result__export__dropdown__trigger">
                <CaretDownIcon />
              </div>
            </ControlledDropdownMenu>
          </div>
        </div>
        <PanelContent className="data-quality-validation__result__content">
          <CubesLoadingIndicator isLoading={isLoading}>
            <CubesLoadingIndicatorIcon />
          </CubesLoadingIndicator>
          {!executionResult && !isLoading && (
            <BlankPanelContent>
              Click on run validation to see the validation results
            </BlankPanelContent>
          )}
          {executionResult && !isLoading && (
            <div className="data-quality-validation__result__values">
              <DataQualityResultValues
                executionResult={executionResult}
                relationValidationConfigurationState={
                  dataQualityRelationValidationConfigurationState
                }
              />
            </div>
          )}
        </PanelContent>
        <ExecutionPlanViewer
          executionPlanState={resultState.executionPlanState}
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
  },
);
