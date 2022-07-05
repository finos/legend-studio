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

import { AgGridColumn, AgGridReact } from '@ag-grid-community/react';
import {
  BlankPanelContent,
  PanelLoadingIndicator,
  PlayIcon,
  DropdownMenu,
  MenuContent,
  MenuContentItem,
  CaretDownIcon,
  ContextMenu,
  clsx,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { flowResult } from 'mobx';
import type { QueryBuilderState } from '../stores/QueryBuilderState.js';
import {
  type ExecutionResult,
  InstanceValue,
  extractExecutionResultValues,
  TdsExecutionResult,
  RawExecutionResult,
  EXECUTION_SERIALIZATION_FORMAT,
} from '@finos/legend-graph';
import {
  ActionAlertActionType,
  ActionAlertType,
  EDITOR_LANGUAGE,
  ExecutionPlanViewer,
  instanceValue_changeValue,
  PARAMETER_SUBMIT_ACTION,
  TAB_SIZE,
  TextInputEditor,
  useApplicationStore,
} from '@finos/legend-application';
import { assertErrorThrown, isBoolean } from '@finos/legend-shared';
import { forwardRef, useState } from 'react';
import type { CellMouseOverEvent } from '@ag-grid-community/core';
import {
  FilterConditionState,
  QueryBuilderFilterTreeConditionNodeData,
} from '../stores/QueryBuilderFilterState.js';
import {
  QueryBuilderSimpleProjectionColumnState,
  QueryBuilderProjectionColumnState,
} from '../stores/QueryBuilderProjectionState.js';
import { getPropertyChainName } from '../stores/QueryBuilderPropertyEditorState.js';
import {
  QueryBuilderFilterOperator_Equal,
  QueryBuilderFilterOperator_NotEqual,
} from '../stores/filterOperators/QueryBuilderFilterOperator_Equal.js';
import {
  QueryBuilderFilterOperator_In,
  QueryBuilderFilterOperator_NotIn,
} from '../stores/filterOperators/QueryBuilderFilterOperator_In.js';
import {
  PostFilterConditionState,
  QueryBuilderPostFilterTreeConditionNodeData,
} from '../stores/QueryBuilderPostFilterState.js';
import {
  QueryBuilderPostFilterOperator_Equal,
  QueryBuilderPostFilterOperator_NotEqual,
} from '../stores/postFilterOperators/QueryBuilderPostFilterOperator_Equal.js';
import {
  QueryBuilderPostFilterOperator_In,
  QueryBuilderPostFilterOperator_NotIn,
} from '../stores/postFilterOperators/QueryBuilderPostFilterOperator_In.js';

const QueryBuilderResultContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      event: CellMouseOverEvent | null;
      queryBuilderState: QueryBuilderState;
    }
  >(function QueryBuilderResultContextMenu(props, ref) {
    const { event, queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    const filterState = queryBuilderState.filterState;
    const postFilterState = queryBuilderState.postFilterState;
    const theColumnState =
      queryBuilderState.fetchStructureState.projectionState.columns
        .filter((c) => c.columnName === event?.column.getColId())
        .filter((c) => c instanceof QueryBuilderSimpleProjectionColumnState)
        .map((c) => c as QueryBuilderSimpleProjectionColumnState)[0];

    const filterBy = (): void => {
      if (theColumnState === undefined) {
        applicationStore.notifyWarning(
          'Filter by on derivation column is not supported',
        );
        return;
      }
      // If it is MANY multiplicity, add to post filter, otherwise add to filter.
      const theColumnMultiplicity =
        theColumnState.propertyExpressionState.propertyExpression.func
          .multiplicity;
      if (
        theColumnMultiplicity.upperBound === undefined ||
        (theColumnMultiplicity.upperBound &&
          theColumnMultiplicity.upperBound > 1)
      ) {
        postFilterState.setShowPostFilterPanel(true);
        const existingPostFilterNode = Array.from(
          postFilterState.nodes.values(),
        )
          .filter(
            (v) =>
              v instanceof QueryBuilderPostFilterTreeConditionNodeData &&
              v.condition.columnState instanceof
                QueryBuilderProjectionColumnState,
          )
          .filter(
            (n) =>
              (n as QueryBuilderPostFilterTreeConditionNodeData).condition
                .columnState.columnName === theColumnState.columnName &&
              [
                new QueryBuilderPostFilterOperator_Equal().getLabel(),
                new QueryBuilderPostFilterOperator_In().getLabel(),
              ].includes(
                (
                  n as QueryBuilderPostFilterTreeConditionNodeData
                ).condition.operator.getLabel(),
              ),
          );
        if (existingPostFilterNode.length === 0) {
          let postFilterConditionState: PostFilterConditionState;
          try {
            postFilterConditionState = new PostFilterConditionState(
              postFilterState,
              theColumnState,
              undefined,
              undefined,
            );
            postFilterConditionState.setValue(
              postFilterConditionState.operator.getDefaultFilterConditionValue(
                postFilterConditionState,
              ),
            );
          } catch (error) {
            assertErrorThrown(error);
            applicationStore.notifyWarning(error.message);
            return;
          }
          postFilterState.addNodeFromNode(
            new QueryBuilderPostFilterTreeConditionNodeData(
              undefined,
              postFilterConditionState,
            ),
            undefined,
          );
        } else {
          const conditionState = (
            existingPostFilterNode[0] as QueryBuilderPostFilterTreeConditionNodeData
          ).condition;
          if (
            conditionState.operator.getLabel() ===
            new QueryBuilderPostFilterOperator_Equal().getLabel()
          ) {
            if (
              !(
                conditionState.value instanceof InstanceValue &&
                conditionState.value.values.includes(event?.value)
              )
            ) {
              const currentValueSpecificaton = conditionState.value;
              const newValueSpecification =
                conditionState.operator.getDefaultFilterConditionValue(
                  conditionState,
                );
              instanceValue_changeValue(
                newValueSpecification as InstanceValue,
                event?.value,
                0,
              );
              conditionState.changeOperator(
                new QueryBuilderPostFilterOperator_In(),
              );
              (conditionState.value as InstanceValue).values = [
                currentValueSpecificaton,
                newValueSpecification,
              ];
            }
          } else {
            // to do : limit new()
            if (
              !(
                conditionState.value instanceof InstanceValue &&
                conditionState.value.values
                  .filter((v) => v instanceof InstanceValue)
                  .map((v) => (v as InstanceValue).values[0])
                  .includes(event?.value)
              )
            ) {
              const newValueSpecification =
                new QueryBuilderPostFilterOperator_Equal().getDefaultFilterConditionValue(
                  conditionState,
                );
              instanceValue_changeValue(
                newValueSpecification as InstanceValue,
                event?.value,
                0,
              );
              (conditionState.value as InstanceValue).values = [
                ...(conditionState.value as InstanceValue).values,
                newValueSpecification,
              ];
            }
          }
        }
      } else {
        const existingFilterNode = Array.from(filterState.nodes.values())
          .filter((v) => v instanceof QueryBuilderFilterTreeConditionNodeData)
          .filter(
            (n) =>
              getPropertyChainName(
                (n as QueryBuilderFilterTreeConditionNodeData).condition
                  .propertyExpressionState.propertyExpression,
                false,
              ) ===
                getPropertyChainName(
                  theColumnState.propertyExpressionState.propertyExpression,
                  false,
                ) &&
              [
                new QueryBuilderFilterOperator_Equal().getLabel(
                  (n as QueryBuilderFilterTreeConditionNodeData).condition,
                ),
                new QueryBuilderFilterOperator_In().getLabel(
                  (n as QueryBuilderFilterTreeConditionNodeData).condition,
                ),
              ].includes(
                (
                  n as QueryBuilderFilterTreeConditionNodeData
                ).condition.operator.getLabel(
                  (n as QueryBuilderFilterTreeConditionNodeData).condition,
                ),
              ),
          );
        if (existingFilterNode.length === 0) {
          let filterConditionState: FilterConditionState;
          try {
            filterConditionState = new FilterConditionState(
              filterState,
              theColumnState.propertyExpressionState.propertyExpression,
            );
            (filterConditionState.value as InstanceValue).values[0] =
              event?.value;
          } catch (error) {
            assertErrorThrown(error);
            applicationStore.notifyWarning(error.message);
            return;
          }
          filterState.setSelectedNode(undefined);
          filterState.addNodeFromNode(
            new QueryBuilderFilterTreeConditionNodeData(
              undefined,
              filterConditionState,
            ),
            undefined,
          );
        } else {
          const conditionState = (
            existingFilterNode[0] as QueryBuilderFilterTreeConditionNodeData
          ).condition;
          if (
            conditionState.operator.getLabel(conditionState) ===
            new QueryBuilderFilterOperator_Equal().getLabel(conditionState)
          ) {
            if (
              !(
                conditionState.value instanceof InstanceValue &&
                conditionState.value.values.includes(event?.value)
              )
            ) {
              const currentValueSpecificaton = conditionState.value;
              const newValueSpecification =
                conditionState.operator.getDefaultFilterConditionValue(
                  conditionState,
                );
              instanceValue_changeValue(
                newValueSpecification as InstanceValue,
                event?.value,
                0,
              );
              conditionState.changeOperator(
                new QueryBuilderFilterOperator_In(),
              );
              (conditionState.value as InstanceValue).values = [
                currentValueSpecificaton,
                newValueSpecification,
              ];
            }
          } else {
            // to do : limit new()
            if (
              !(
                conditionState.value instanceof InstanceValue &&
                conditionState.value.values
                  .filter((v) => v instanceof InstanceValue)
                  .map((v) => (v as InstanceValue).values[0])
                  .includes(event?.value)
              )
            ) {
              const newValueSpecification =
                new QueryBuilderFilterOperator_Equal().getDefaultFilterConditionValue(
                  conditionState,
                );
              instanceValue_changeValue(
                newValueSpecification as InstanceValue,
                event?.value,
                0,
              );
              (conditionState.value as InstanceValue).values = [
                ...(conditionState.value as InstanceValue).values,
                newValueSpecification,
              ];
            }
          }
        }
      }
    };
    const filterOut = (): void => {
      if (theColumnState === undefined) {
        applicationStore.notifyWarning(
          'Filter out on derivation column is not supported',
        );
        return;
      }
      // If it is MANY multiplicity, add to post filter, otherwise add to filter.
      const theColumnMultiplicity =
        theColumnState.propertyExpressionState.propertyExpression.func
          .multiplicity;
      if (
        theColumnMultiplicity.upperBound === undefined ||
        (theColumnMultiplicity.upperBound &&
          theColumnMultiplicity.upperBound > 1)
      ) {
        postFilterState.setShowPostFilterPanel(true);
        const existingPostFilterNode = Array.from(
          postFilterState.nodes.values(),
        )
          .filter(
            (v) =>
              v instanceof QueryBuilderPostFilterTreeConditionNodeData &&
              v.condition.columnState instanceof
                QueryBuilderProjectionColumnState,
          )
          .filter(
            (n) =>
              (n as QueryBuilderPostFilterTreeConditionNodeData).condition
                .columnState.columnName === theColumnState.columnName &&
              [
                new QueryBuilderPostFilterOperator_NotEqual().getLabel(),
                new QueryBuilderPostFilterOperator_NotIn().getLabel(),
              ].includes(
                (
                  n as QueryBuilderPostFilterTreeConditionNodeData
                ).condition.operator.getLabel(),
              ),
          );
        if (existingPostFilterNode.length === 0) {
          let postFilterConditionState: PostFilterConditionState;
          try {
            postFilterConditionState = new PostFilterConditionState(
              postFilterState,
              theColumnState,
              undefined,
              new QueryBuilderPostFilterOperator_NotEqual(),
            );
            postFilterConditionState.setValue(
              postFilterConditionState.operator.getDefaultFilterConditionValue(
                postFilterConditionState,
              ),
            );
          } catch (error) {
            assertErrorThrown(error);
            applicationStore.notifyWarning(error.message);
            return;
          }
          postFilterState.addNodeFromNode(
            new QueryBuilderPostFilterTreeConditionNodeData(
              undefined,
              postFilterConditionState,
            ),
            undefined,
          );
        } else {
          const conditionState = (
            existingPostFilterNode[0] as QueryBuilderPostFilterTreeConditionNodeData
          ).condition;
          if (
            conditionState.operator.getLabel() ===
            new QueryBuilderPostFilterOperator_NotEqual().getLabel()
          ) {
            if (
              !(
                conditionState.value instanceof InstanceValue &&
                conditionState.value.values.includes(event?.value)
              )
            ) {
              const currentValueSpecificaton = conditionState.value;
              const newValueSpecification =
                conditionState.operator.getDefaultFilterConditionValue(
                  conditionState,
                );
              instanceValue_changeValue(
                newValueSpecification as InstanceValue,
                event?.value,
                0,
              );
              conditionState.changeOperator(
                new QueryBuilderPostFilterOperator_NotIn(),
              );
              (conditionState.value as InstanceValue).values = [
                currentValueSpecificaton,
                newValueSpecification,
              ];
            }
          } else {
            // to do : limit new()
            if (
              !(
                conditionState.value instanceof InstanceValue &&
                conditionState.value.values
                  .filter((v) => v instanceof InstanceValue)
                  .map((v) => (v as InstanceValue).values[0])
                  .includes(event?.value)
              )
            ) {
              const newValueSpecification =
                new QueryBuilderPostFilterOperator_NotEqual().getDefaultFilterConditionValue(
                  conditionState,
                );
              instanceValue_changeValue(
                newValueSpecification as InstanceValue,
                event?.value,
                0,
              );
              (conditionState.value as InstanceValue).values = [
                ...(conditionState.value as InstanceValue).values,
                newValueSpecification,
              ];
            }
          }
        }
      } else {
        const existingFilterNode = Array.from(filterState.nodes.values())
          .filter((v) => v instanceof QueryBuilderFilterTreeConditionNodeData)
          .filter(
            (n) =>
              getPropertyChainName(
                (n as QueryBuilderFilterTreeConditionNodeData).condition
                  .propertyExpressionState.propertyExpression,
                false,
              ) ===
                getPropertyChainName(
                  theColumnState.propertyExpressionState.propertyExpression,
                  false,
                ) &&
              [
                new QueryBuilderFilterOperator_NotEqual().getLabel(
                  (n as QueryBuilderFilterTreeConditionNodeData).condition,
                ),
                new QueryBuilderFilterOperator_NotIn().getLabel(
                  (n as QueryBuilderFilterTreeConditionNodeData).condition,
                ),
              ].includes(
                (
                  n as QueryBuilderFilterTreeConditionNodeData
                ).condition.operator.getLabel(
                  (n as QueryBuilderFilterTreeConditionNodeData).condition,
                ),
              ),
          );
        if (existingFilterNode.length === 0) {
          let filterConditionState: FilterConditionState;
          try {
            filterConditionState = new FilterConditionState(
              filterState,
              theColumnState.propertyExpressionState.propertyExpression,
            );
            filterConditionState.setOperator(
              new QueryBuilderFilterOperator_NotEqual(),
            );
            (filterConditionState.value as InstanceValue).values[0] =
              event?.value;
          } catch (error) {
            assertErrorThrown(error);
            applicationStore.notifyWarning(error.message);
            return;
          }
          filterState.setSelectedNode(undefined);
          filterState.addNodeFromNode(
            new QueryBuilderFilterTreeConditionNodeData(
              undefined,
              filterConditionState,
            ),
            undefined,
          );
        } else {
          const conditionState = (
            existingFilterNode[0] as QueryBuilderFilterTreeConditionNodeData
          ).condition;
          if (
            conditionState.operator.getLabel(conditionState) ===
            new QueryBuilderFilterOperator_NotEqual().getLabel(conditionState)
          ) {
            if (
              !(
                conditionState.value instanceof InstanceValue &&
                conditionState.value.values.includes(event?.value)
              )
            ) {
              const currentValueSpecificaton = conditionState.value;
              const newValueSpecification =
                conditionState.operator.getDefaultFilterConditionValue(
                  conditionState,
                );
              instanceValue_changeValue(
                newValueSpecification as InstanceValue,
                event?.value,
                0,
              );
              conditionState.changeOperator(
                new QueryBuilderFilterOperator_NotIn(),
              );
              (conditionState.value as InstanceValue).values = [
                currentValueSpecificaton,
                newValueSpecification,
              ];
            }
          } else {
            // to do : limit new()
            if (
              !(
                conditionState.value instanceof InstanceValue &&
                conditionState.value.values
                  .filter((v) => v instanceof InstanceValue)
                  .map((v) => (v as InstanceValue).values[0])
                  .includes(event?.value)
              )
            ) {
              const newValueSpecification =
                new QueryBuilderFilterOperator_NotEqual().getDefaultFilterConditionValue(
                  conditionState,
                );
              instanceValue_changeValue(
                newValueSpecification as InstanceValue,
                event?.value,
                0,
              );
              (conditionState.value as InstanceValue).values = [
                ...(conditionState.value as InstanceValue).values,
                newValueSpecification,
              ];
            }
          }
        }
      }
    };

    return (
      <MenuContent ref={ref}>
        <MenuContentItem onClick={filterBy}>Filter By</MenuContentItem>
        <MenuContentItem onClick={filterOut}>Filter Out</MenuContentItem>
      </MenuContent>
    );
  }),
);

const QueryBuilderResultValues = observer(
  (props: {
    executionResult: ExecutionResult;
    queryBuilderState: QueryBuilderState;
  }) => {
    const { executionResult, queryBuilderState } = props;
    if (executionResult instanceof TdsExecutionResult) {
      const [cellDoubleClickedEvent, setCellDoubleClickedEvent] =
        useState<CellMouseOverEvent | null>(null);
      const columns = executionResult.result.columns;
      const rowData = executionResult.result.rows.map((_row) => {
        const row: Record<PropertyKey, unknown> = {};
        const cols = executionResult.result.columns;
        _row.values.forEach((value, idx) => {
          // `ag-grid` shows `false` value as empty string so we have
          // call `.toString()` to avoid this behavior.
          // See https://github.com/finos/legend-studio/issues/1008
          row[cols[idx] as string] = isBoolean(value) ? String(value) : value;
        });
        return row;
      });
      return (
        <ContextMenu
          content={
            <QueryBuilderResultContextMenu
              event={cellDoubleClickedEvent}
              queryBuilderState={queryBuilderState}
            />
          }
          menuProps={{ elevation: 7 }}
          key={executionResult._UUID}
          className={clsx(
            'ag-theme-balham-dark query-builder__result__tds-grid',
          )}
        >
          <AgGridReact
            rowData={rowData}
            onCellMouseOver={(event): void => {
              setCellDoubleClickedEvent(event);
            }}
          >
            {columns.map((colName) => (
              <AgGridColumn
                minWidth={50}
                sortable={true}
                resizable={true}
                field={colName}
                key={colName}
                flex={1}
              />
            ))}
          </AgGridReact>
        </ContextMenu>
      );
    } else if (executionResult instanceof RawExecutionResult) {
      return (
        <TextInputEditor
          language={EDITOR_LANGUAGE.TEXT}
          inputValue={executionResult.value}
          isReadOnly={true}
        />
      );
    } else {
      const executionResultString = JSON.stringify(
        extractExecutionResultValues(executionResult),
        null,
        TAB_SIZE,
      );
      return (
        <TextInputEditor
          language={EDITOR_LANGUAGE.JSON}
          inputValue={executionResultString}
          isReadOnly={true}
        />
      );
    }
  },
);

export const QueryBuilderResultPanel = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    const resultState = queryBuilderState.resultState;
    const queryParametersState = queryBuilderState.queryParametersState;
    const executionResult = resultState.executionResult;
    const USER_ATTESTATION_MESSAGE =
      'I attest that I am aware of the sensitive data leakage risk when exporting queried data. The data I export will only be used by me.';
    const exportQueryResults = async (
      format: EXECUTION_SERIALIZATION_FORMAT,
    ): Promise<void> => {
      if (queryBuilderState.queryParametersState.parameterStates.length) {
        queryParametersState.parameterValuesEditorState.open(
          (): Promise<void> =>
            flowResult(resultState.exportData(format)).catch(
              applicationStore.alertUnhandledError,
            ),
          PARAMETER_SUBMIT_ACTION.EXPORT,
        );
      } else {
        await flowResult(resultState.exportData(format)).catch(
          applicationStore.alertUnhandledError,
        );
      }
    };

    const confirmExport = (format: EXECUTION_SERIALIZATION_FORMAT): void => {
      applicationStore.setActionAlertInfo({
        message: USER_ATTESTATION_MESSAGE,
        type: ActionAlertType.CAUTION,
        actions: [
          {
            label: 'Accept',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler: applicationStore.guardUnhandledError(() =>
              exportQueryResults(format),
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
    const execute = (): void => {
      if (queryParametersState.parameterStates.length) {
        queryParametersState.parameterValuesEditorState.open(
          (): Promise<void> =>
            flowResult(resultState.execute()).catch(
              applicationStore.alertUnhandledError,
            ),
          PARAMETER_SUBMIT_ACTION.EXECUTE,
        );
      } else {
        flowResult(resultState.execute()).catch(
          applicationStore.alertUnhandledError,
        );
      }
    };
    const generatePlan = applicationStore.guardUnhandledError(() =>
      flowResult(resultState.generatePlan(false)),
    );
    const debugPlanGeneration = applicationStore.guardUnhandledError(() =>
      flowResult(resultState.generatePlan(true)),
    );
    const changeLimit: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      const val = event.target.value;
      queryBuilderState.resultState.setPreviewLimit(
        val === '' ? 0 : parseInt(val, 10),
      );
    };
    const allowSettingPreviewLimit = queryBuilderState.isQuerySupported();
    const resultSetSize = (result: ExecutionResult | undefined): string =>
      result && result instanceof TdsExecutionResult
        ? `${
            result.result.rows.length
          } row(s) in ${resultState.executionDuration?.toString()} ms`
        : '';

    return (
      <div className="panel query-builder__result">
        <PanelLoadingIndicator
          isLoading={
            resultState.isExecutingQuery ||
            resultState.isGeneratingPlan ||
            resultState.exportDataState.isInProgress
          }
        />
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">result</div>
            <div className="query-builder__result__analytics">
              {resultSetSize(executionResult)}
            </div>
          </div>
          <div className="panel__header__actions query-builder__result__header__actions">
            {allowSettingPreviewLimit && (
              <div className="query-builder__result__limit">
                <div className="query-builder__result__limit__label">
                  preview limit
                </div>
                <input
                  className="input--dark query-builder__result__limit__input"
                  spellCheck={false}
                  type="number"
                  value={resultState.previewLimit}
                  onChange={changeLimit}
                />
              </div>
            )}
            <button
              className="query-builder__result__execute-btn"
              onClick={execute}
              disabled={
                resultState.isExecutingQuery || resultState.isGeneratingPlan
              }
              tabIndex={-1}
            >
              <div className="query-builder__result__execute-btn__label">
                <PlayIcon className="query-builder__result__execute-btn__label__icon" />
                <div className="query-builder__result__execute-btn__label__title">
                  Execute
                </div>
              </div>
              <DropdownMenu
                className="query-builder__result__execute-btn__dropdown-btn"
                disabled={
                  resultState.isExecutingQuery || resultState.isGeneratingPlan
                }
                content={
                  <MenuContent>
                    <MenuContentItem
                      className="query-builder__result__execute-btn__option"
                      onClick={generatePlan}
                    >
                      Generate Plan
                    </MenuContentItem>
                    <MenuContentItem
                      className="query-builder__result__execute-btn__option"
                      onClick={debugPlanGeneration}
                    >
                      Debug
                    </MenuContentItem>
                  </MenuContent>
                }
                menuProps={{
                  anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                  transformOrigin: { vertical: 'top', horizontal: 'right' },
                }}
              >
                <CaretDownIcon />
              </DropdownMenu>
            </button>
            <DropdownMenu
              className="query-builder__result__export__dropdown"
              content={
                <MenuContent>
                  {Object.values(EXECUTION_SERIALIZATION_FORMAT).map(
                    (format) => (
                      <MenuContentItem
                        key={format}
                        className="query-builder__result__export__dropdown__menu__item"
                        onClick={(): void => confirmExport(format)}
                      >
                        {format}
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
              <button
                className="query-builder__result__export__dropdown__label"
                tabIndex={-1}
                title="Export"
              >
                Export
              </button>
              <div className="query-builder__result__export__dropdown__trigger">
                <CaretDownIcon />
              </div>
            </DropdownMenu>
          </div>
        </div>
        <div className="panel__content">
          {!executionResult && (
            <BlankPanelContent>
              Build or load a valid query first
            </BlankPanelContent>
          )}
          {executionResult && (
            <div className="query-builder__result__values">
              <QueryBuilderResultValues
                executionResult={executionResult}
                queryBuilderState={queryBuilderState}
              />
            </div>
          )}
        </div>
        <ExecutionPlanViewer
          executionPlanState={resultState.executionPlanState}
        />
      </div>
    );
  },
);
