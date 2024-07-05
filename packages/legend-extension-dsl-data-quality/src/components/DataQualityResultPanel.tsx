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
import type { DataQualityState } from './states/DataQualityState.js';
import { useApplicationStore } from '@finos/legend-application';
import { flowResult } from 'mobx';
import {
  type QueryBuilderState,
  buildFilterConditionExpression,
  ExecutionPlanViewer,
} from '@finos/legend-query-builder';
import {
  type ExecutionResult,
  buildRawLambdaFromLambdaFunction,
  CORE_PURE_PATH,
  FunctionType,
  GenericType,
  GenericTypeExplicitReference,
  LambdaFunction,
  Multiplicity,
  PackageableElementExplicitReference,
  VariableExpression,
} from '@finos/legend-graph';
import {
  guaranteeNonNullable,
  isNonNullable,
  prettyDuration,
} from '@finos/legend-shared';
import { useRef, useState } from 'react';
import { DATA_QUALITY_VALIDATION_TEST_ID } from './constants/DataQualityConstants.js';
import {
  BlankPanelContent,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
  MenuContent,
  MenuContentItem,
  PanelContent,
  ExclamationTriangleIcon,
  DebugIcon,
  CaretDownIcon,
  MenuContentItemIcon,
  MenuContentItemLabel,
  PauseCircleIcon,
  PlayIcon,
  ReportIcon,
  ControlledDropdownMenu,
} from '@finos/legend-art';
import { DataQualityResultValues } from './DataQualityResultValues.js';
import { dataQualityClassValidation_setFilter } from '../graph-manager/DSL_DataQuality_GraphModifierHelper.js';
import type { DataQualityClassValidationsConfiguration } from '../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';

export const DataQualityResultPanel = observer(
  (props: { dataQualityState: DataQualityState }) => {
    const { dataQualityState } = props;
    const applicationStore = useApplicationStore();
    const resultState = dataQualityState.resultState;
    const executionResult = resultState.executionResult;

    const buildFilterExpression = (
      queryBuilderState: QueryBuilderState,
    ): void => {
      const { filterState } = queryBuilderState;
      const filterConditionExpressions = filterState.rootIds
        .map((e) => guaranteeNonNullable(filterState.nodes.get(e)))
        .map((e) => buildFilterConditionExpression(filterState, e))
        .filter(isNonNullable);
      if (!filterConditionExpressions.length) {
        dataQualityClassValidation_setFilter(
          dataQualityState.constraintsConfigurationElement as DataQualityClassValidationsConfiguration,
          undefined,
        );
        return;
      }
      const genericType = new GenericType(queryBuilderState.class!);
      const genericTypeReference =
        GenericTypeExplicitReference.create(genericType);

      const functionType = new FunctionType(
        PackageableElementExplicitReference.create(
          queryBuilderState.graphManagerState.graph.getType(CORE_PURE_PATH.ANY),
        ),
        Multiplicity.ONE,
      );
      functionType.parameters.push(
        new VariableExpression(
          filterState.lambdaParameterName,
          Multiplicity.ONE,
          genericTypeReference,
        ),
      );

      const lambdaFunction = new LambdaFunction(functionType);
      lambdaFunction.expressionSequence = filterConditionExpressions;
      dataQualityClassValidation_setFilter(
        dataQualityState.constraintsConfigurationElement as DataQualityClassValidationsConfiguration,
        buildRawLambdaFromLambdaFunction(
          lambdaFunction,
          queryBuilderState.graphManagerState,
        ),
      );
    };

    const runQuery = (): void => {
      resultState.pressedRunQuery.inProgress();
      flowResult(resultState.runQuery()).catch(
        applicationStore.alertUnhandledError,
      );
      resultState.pressedRunQuery.complete();
    };
    const cancelQuery = applicationStore.guardUnhandledError(() =>
      flowResult(resultState.cancelQuery()),
    );

    const generatePlan = applicationStore.guardUnhandledError(() => {
      buildFilterExpression(dataQualityState.dataQualityQueryBuilderState);
      return flowResult(resultState.generatePlan(false));
    });
    const debugPlanGeneration = applicationStore.guardUnhandledError(() =>
      flowResult(resultState.generatePlan(true)),
    );

    const allowSettingPreviewLimit = dataQualityState.isQuerySupported;

    const isRunQueryDisabled =
      resultState.isGeneratingPlan ||
      resultState.pressedRunQuery.isInProgress ||
      dataQualityState.dataQualityQueryBuilderState.filterState
        .allValidationIssues.length !== 0;

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
      return `query ran in ${queryDuration}`;
    };
    const resultDescription = executionResult
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
        dataQualityState.resultState.setPreviewLimit(1);
      } else {
        dataQualityState.resultState.setPreviewLimit(previewLimitValue);
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
      resultState.isRunningQuery || resultState.isGeneratingPlan;

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
            {resultState.pressedRunQuery.isInProgress && (
              <div className="panel__header__title__label__status">
                Running Query...
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
            {allowSettingPreviewLimit && (
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
            )}

            <div className="data-quality-validation__result__execute-btn btn__dropdown-combo btn__dropdown-combo--primary">
              {resultState.isRunningQuery ? (
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
                    className="btn__dropdown-combo__label data-quality-validation__result__execute-btn__btn data-quality-validation__result__execute-btn__btn--green"
                    onClick={runQuery}
                    tabIndex={-1}
                    disabled={isRunQueryDisabled}
                  >
                    <PlayIcon />
                    Run Query
                  </button>
                  <ControlledDropdownMenu
                    className="btn__dropdown-combo__dropdown-btn data-quality-validation__result__execute-btn__btn data-quality-validation__result__execute-btn__btn--green"
                    disabled={isRunQueryDisabled}
                    content={
                      <MenuContent>
                        <MenuContentItem
                          className="btn__dropdown-combo__option"
                          onClick={generatePlan}
                          disabled={isRunQueryDisabled}
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
                          disabled={isRunQueryDisabled}
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
          </div>
        </div>
        <PanelContent className="data-quality-validation__result__content">
          <CubesLoadingIndicator isLoading={isLoading}>
            <CubesLoadingIndicatorIcon />
          </CubesLoadingIndicator>
          {!executionResult && !isLoading && (
            <BlankPanelContent>
              Build or load a valid query first
            </BlankPanelContent>
          )}
          {executionResult && !isLoading && (
            <div className="data-quality-validation__result__values">
              <DataQualityResultValues
                executionResult={executionResult}
                dataQualityState={dataQualityState}
              />
            </div>
          )}
        </PanelContent>
        <ExecutionPlanViewer
          executionPlanState={resultState.executionPlanState}
        />
      </div>
    );
  },
);
