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
  BlankPanelContent,
  PanelLoadingIndicator,
  PlayIcon,
  DropdownMenu,
  MenuContent,
  MenuContentItem,
  CaretDownIcon,
  ContextMenu,
  clsx,
  PauseCircleIcon,
  ExclamationTriangleIcon,
  PanelContent,
  MenuContentDivider,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { flowResult } from 'mobx';
import type { QueryBuilderState } from '../stores/QueryBuilderState.js';
import {
  type ExecutionResult,
  type Enumeration,
  InstanceValue,
  extractExecutionResultValues,
  TDSExecutionResult,
  RawExecutionResult,
  EnumValueInstanceValue,
  EnumValueExplicitReference,
} from '@finos/legend-graph';
import {
  ActionAlertActionType,
  ActionAlertType,
  CODE_EDITOR_LANGUAGE,
  TAB_SIZE,
  useApplicationStore,
} from '@finos/legend-application';
import {
  assertErrorThrown,
  guaranteeNonNullable,
  isBoolean,
  type PlainObject,
  prettyDuration,
  prettyCONSTName,
} from '@finos/legend-shared';
import { forwardRef, useState } from 'react';
import type {
  CellClassParams,
  CellMouseDownEvent,
  CellMouseOverEvent,
} from '@ag-grid-community/core';
import {
  QueryBuilderDerivationProjectionColumnState,
  QueryBuilderProjectionColumnState,
} from '../stores/fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import {
  type QueryBuilderPostFilterTreeNodeData,
  PostFilterConditionState,
  QueryBuilderPostFilterTreeConditionNodeData,
} from '../stores/fetch-structure/tds/post-filter/QueryBuilderPostFilterState.js';
import {
  QueryBuilderPostFilterOperator_Equal,
  QueryBuilderPostFilterOperator_NotEqual,
} from '../stores/fetch-structure/tds/post-filter/operators/QueryBuilderPostFilterOperator_Equal.js';
import {
  QueryBuilderPostFilterOperator_In,
  QueryBuilderPostFilterOperator_NotIn,
} from '../stores/fetch-structure/tds/post-filter/operators/QueryBuilderPostFilterOperator_In.js';
import type { QueryBuilderPostFilterOperator } from '../stores/fetch-structure/tds/post-filter/QueryBuilderPostFilterOperator.js';
import { QueryBuilderTDSState } from '../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import {
  instanceValue_setValue,
  instanceValue_setValues,
} from '../stores/shared/ValueSpecificationModifierHelper.js';
import { PARAMETER_SUBMIT_ACTION } from '../stores/shared/LambdaParameterState.js';
import { QUERY_BUILDER_TEST_ID } from '../application/QueryBuilderTesting.js';
import {
  DataGrid,
  type DataGridCellMouseOverEvent,
} from '@finos/legend-lego/data-grid';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import { ExecutionPlanViewer } from './execution-plan/ExecutionPlanViewer.js';
import type {
  FilteredResult,
  ResultCoordinate,
} from '../stores/QueryBuilderResultState.js';
import {
  QueryBuilderPostFilterOperator_IsEmpty,
  QueryBuilderPostFilterOperator_IsNotEmpty,
} from '../stores/fetch-structure/tds/post-filter/operators/QueryBuilderPostFilterOperator_IsEmpty.js';

const QueryBuilderGridResultContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      event: DataGridCellMouseOverEvent | null;
      tdsState: QueryBuilderTDSState;
    }
  >(function QueryBuilderResultContextMenu(props, ref) {
    const { event, tdsState } = props;
    const applicationStore = useApplicationStore();
    const postFilterEqualOperator = new QueryBuilderPostFilterOperator_Equal();
    const postFilterInOperator = new QueryBuilderPostFilterOperator_In();
    const postFilterEmptyOperator =
      new QueryBuilderPostFilterOperator_IsEmpty();
    const postFilterNotEmptyOperator =
      new QueryBuilderPostFilterOperator_IsNotEmpty();

    const postFilterNotEqualOperator =
      new QueryBuilderPostFilterOperator_NotEqual();
    const postFilterNotInOperator = new QueryBuilderPostFilterOperator_NotIn();
    const postFilterState = tdsState.postFilterState;

    const projectionColumnState = guaranteeNonNullable(
      tdsState.projectionColumns
        .filter((c) => c.columnName === event?.column.getColId())
        .concat(
          tdsState.aggregationState.columns
            .filter((c) => c.columnName === event?.column.getColId())
            .map((ag) => ag.projectionColumnState),
        )[0],
    );

    const getExistingPostFilterNode = (
      operators: QueryBuilderPostFilterOperator[],
      projectionColumnName: string | undefined,
    ): QueryBuilderPostFilterTreeNodeData | undefined =>
      Array.from(postFilterState.nodes.values())
        .filter(
          (v) =>
            v instanceof QueryBuilderPostFilterTreeConditionNodeData &&
            v.condition.columnState instanceof
              QueryBuilderProjectionColumnState,
        )
        .filter(
          (n) =>
            (n as QueryBuilderPostFilterTreeConditionNodeData).condition
              .columnState.columnName ===
              (projectionColumnName ?? projectionColumnState.columnName) &&
            // .columnState.columnName === projectionColumnState.columnName &&
            operators
              .map((op) => op.getLabel())
              .includes(
                (
                  n as QueryBuilderPostFilterTreeConditionNodeData
                ).condition.operator.getLabel(),
              ),
        )[0];

    const updateFilterConditionValue = (
      conditionValue: InstanceValue,
      filteredResult: FilteredResult,
    ): void => {
      if (filteredResult.value) {
        instanceValue_setValue(
          conditionValue,
          conditionValue instanceof EnumValueInstanceValue
            ? EnumValueExplicitReference.create(
                guaranteeNonNullable(
                  (
                    conditionValue.genericType?.ownerReference
                      .value as Enumeration
                  ).values.filter((v) => v.name === filteredResult.value)[0],
                ),
              )
            : filteredResult.value,
          0,
          tdsState.queryBuilderState.observerContext,
        );
      }
    };

    const generateNewPostFilterConditionNodeData = async (
      operator: QueryBuilderPostFilterOperator,
      filteredResult: FilteredResult,
    ): Promise<void> => {
      let postFilterConditionState: PostFilterConditionState;
      try {
        postFilterConditionState = new PostFilterConditionState(
          postFilterState,
          filteredResult.columnName
            ? guaranteeNonNullable(
                tdsState.projectionColumns
                  .filter((c) => c.columnName === filteredResult.columnName)
                  .concat(
                    tdsState.aggregationState.columns
                      .filter((c) => c.columnName === filteredResult.columnName)
                      .map((ag) => ag.projectionColumnState),
                  )[0],
              )
            : projectionColumnState,
          undefined,
          operator,
        );
        if (
          projectionColumnState instanceof
          QueryBuilderDerivationProjectionColumnState
        ) {
          await flowResult(
            projectionColumnState.fetchDerivationLambdaReturnType(),
          );
        }
        const defaultFilterConditionValue =
          postFilterConditionState.operator.getDefaultFilterConditionValue(
            postFilterConditionState,
          );
        postFilterConditionState.setValue(defaultFilterConditionValue);
        updateFilterConditionValue(
          defaultFilterConditionValue as InstanceValue,
          filteredResult,
        );
      } catch (error) {
        assertErrorThrown(error);
        applicationStore.notificationService.notifyWarning(error.message);
        return;
      }
      postFilterState.addNodeFromNode(
        new QueryBuilderPostFilterTreeConditionNodeData(
          undefined,
          postFilterConditionState,
        ),
        undefined,
      );
    };

    const updateExistingPostFilterConditionNodeData = (
      existingPostFilterNode: QueryBuilderPostFilterTreeNodeData,
      isFilterBy: boolean,
      filteredResult: FilteredResult,
      operator: QueryBuilderPostFilterOperator,
    ): void => {
      if (
        operator === postFilterEmptyOperator ||
        operator === postFilterNotEmptyOperator
      ) {
        const conditionState = (
          existingPostFilterNode as QueryBuilderPostFilterTreeConditionNodeData
        ).condition;
        if (conditionState.operator.getLabel() !== operator.getLabel()) {
          conditionState.changeOperator(
            isFilterBy ? postFilterEmptyOperator : postFilterNotEmptyOperator,
          );
        }
        return;
      }
      const conditionState = (
        existingPostFilterNode as QueryBuilderPostFilterTreeConditionNodeData
      ).condition;

      if (conditionState.operator.getLabel() === operator.getLabel()) {
        const doesValueAlreadyExist =
          conditionState.value instanceof InstanceValue &&
          (conditionState.value instanceof EnumValueInstanceValue
            ? conditionState.value.values.map((ef) => ef.value.name)
            : conditionState.value.values
          ).includes(filteredResult.value);

        if (!doesValueAlreadyExist) {
          const currentValueSpecificaton = conditionState.value;
          const newValueSpecification =
            conditionState.operator.getDefaultFilterConditionValue(
              conditionState,
            );
          updateFilterConditionValue(
            newValueSpecification as InstanceValue,
            filteredResult,
          );
          conditionState.changeOperator(
            isFilterBy ? postFilterInOperator : postFilterNotInOperator,
          );
          instanceValue_setValues(
            conditionState.value as InstanceValue,
            [currentValueSpecificaton, newValueSpecification],
            tdsState.queryBuilderState.observerContext,
          );
        }
      } else {
        const doesValueAlreadyExist =
          conditionState.value instanceof InstanceValue &&
          conditionState.value.values
            .filter((v) => v instanceof InstanceValue)
            .map((v) =>
              v instanceof EnumValueInstanceValue
                ? v.values.map((ef) => ef.value.name)
                : (v as InstanceValue).values,
            )
            .flat()
            .includes(filteredResult.value ?? event?.value);

        if (!doesValueAlreadyExist) {
          const newValueSpecification = (
            isFilterBy ? postFilterEqualOperator : postFilterNotEqualOperator
          ).getDefaultFilterConditionValue(conditionState);
          updateFilterConditionValue(
            newValueSpecification as InstanceValue,
            filteredResult,
          );
          instanceValue_setValues(
            conditionState.value as InstanceValue,
            [
              ...(conditionState.value as InstanceValue).values,
              newValueSpecification,
            ],
            tdsState.queryBuilderState.observerContext,
          );
        }
      }
    };

    const getFilterOperator = (
      isFilterBy: boolean,
      filteredResult: FilteredResult,
    ): QueryBuilderPostFilterOperator => {
      if (isFilterBy === true) {
        if (filteredResult.value === null) {
          return postFilterEmptyOperator;
        } else {
          return postFilterEqualOperator;
        }
      } else {
        if (filteredResult.value === null) {
          return postFilterNotEmptyOperator;
        } else {
          return postFilterNotEqualOperator;
        }
      }
    };

    const filterByOrOutValue = (
      isFilterBy: boolean,
      filteredResult: FilteredResult,
    ): void => {
      tdsState.setShowPostFilterPanel(true);

      const operator = getFilterOperator(isFilterBy, filteredResult);

      const existingPostFilterNode = getExistingPostFilterNode(
        filteredResult.value === null
          ? [postFilterEmptyOperator, postFilterNotEmptyOperator]
          : isFilterBy
          ? [postFilterEqualOperator, postFilterInOperator]
          : [postFilterNotEqualOperator, postFilterNotInOperator],
        filteredResult.columnName,
      );

      existingPostFilterNode === undefined
        ? generateNewPostFilterConditionNodeData(
            operator,
            filteredResult,
          ).catch(applicationStore.alertUnhandledError)
        : updateExistingPostFilterConditionNodeData(
            existingPostFilterNode,
            isFilterBy,
            filteredResult,
            operator,
          );
    };

    const filterByOrOutValues = (isFilterBy: boolean): void => {
      tdsState.queryBuilderState.resultState.filteredResults.forEach(
        (filteredResult) => {
          filterByOrOutValue(isFilterBy, filteredResult);
        },
      );
    };

    const handleCopyCellValue = applicationStore.guardUnhandledError(() =>
      applicationStore.clipboardService.copyTextToClipboard(event?.value),
    );

    const handleCopyRowValue = applicationStore.guardUnhandledError(() =>
      applicationStore.clipboardService.copyTextToClipboard(
        Object.values(event?.data).toString(),
      ),
    );

    return (
      <MenuContent ref={ref}>
        <MenuContentItem
          onClick={(): void => {
            filterByOrOutValues(true);
          }}
        >
          Filter By
        </MenuContentItem>
        <MenuContentItem
          onClick={(): void => {
            filterByOrOutValues(false);
          }}
        >
          Filter Out
        </MenuContentItem>
        <MenuContentDivider />
        <MenuContentItem onClick={handleCopyCellValue}>
          Copy Cell Value
        </MenuContentItem>
        <MenuContentItem onClick={handleCopyRowValue}>
          Copy Row Value
        </MenuContentItem>
      </MenuContent>
    );
  }),
);

const QueryBuilderGridResult = observer(
  (props: {
    executionResult: TDSExecutionResult;
    queryBuilderState: QueryBuilderState;
  }) => {
    const { executionResult, queryBuilderState } = props;
    const fetchStructureImplementation =
      queryBuilderState.fetchStructureState.implementation;
    const resultState = queryBuilderState.resultState;
    const holdingCells = resultState.holdingCells;
    const [cellDoubleClickedEvent, setCellDoubleClickedEvent] =
      useState<DataGridCellMouseOverEvent | null>(null);
    useState<CellMouseOverEvent | null>(null);
    const [cellMouseDownEvent, setCellMouseDownEvent] =
      useState<CellMouseDownEvent | null>(null);
    const columns = executionResult.result.columns;
    const rowData = executionResult.result.rows.map((_row, rowIdx) => {
      const row: PlainObject = {};
      const cols = executionResult.result.columns;
      _row.values.forEach((value, colIdx) => {
        // `ag-grid` shows `false` value as empty string so we have
        // call `.toString()` to avoid this behavior.
        // See https://github.com/finos/legend-studio/issues/1008
        row[cols[colIdx] as string] = isBoolean(value) ? String(value) : value;
      });
      row.rowNumber = rowIdx;
      return row;
    });

    const findCoordinatesFromResultValue = (
      params:
        | CellClassParams<PlainObject<unknown>>
        | CellMouseOverEvent<PlainObject<unknown>>,
    ): ResultCoordinate => {
      const colIndex = executionResult.result.columns.findIndex(
        (col) => col === params.column.getColId(),
      );
      const rowIndex = params.node.rowIndex;
      return { rowIndex: rowIndex ?? -1, colIndex: colIndex };
    };

    return (
      <div
        className="query-builder__result__values__table"
        onMouseUp={() => {
          resultState.setIsHoldingCells(false);
        }}
      >
        <ContextMenu
          content={
            // NOTE: we only support this functionality for grid result with a projection fetch-structure
            fetchStructureImplementation instanceof QueryBuilderTDSState ? (
              <QueryBuilderGridResultContextMenu
                event={cellDoubleClickedEvent}
                tdsState={fetchStructureImplementation}
              />
            ) : null
          }
          disabled={
            !(fetchStructureImplementation instanceof QueryBuilderTDSState) ||
            !queryBuilderState.isQuerySupported ||
            !cellDoubleClickedEvent
          }
          menuProps={{ elevation: 7 }}
          key={executionResult._UUID}
          className={clsx(
            'ag-theme-balham-dark query-builder__result__tds-grid',
          )}
        >
          <DataGrid
            rowData={rowData}
            gridOptions={{
              suppressScrollOnNewData: true,
              getRowId: function (data) {
                return data.data.rowNumber as string;
              },
              columnTypes: {
                resultColumn: {
                  cellStyle: (params: CellClassParams<PlainObject>) => {
                    const valueCoordinates =
                      findCoordinatesFromResultValue(params);

                    if (
                      resultState.filteredResults.some(
                        (result) =>
                          result.coordinates.colIndex ===
                            valueCoordinates.colIndex &&
                          result.coordinates.rowIndex ===
                            valueCoordinates.rowIndex,
                      )
                    ) {
                      return {
                        backgroundColor: queryBuilderState.applicationStore
                          .layoutService.TEMPORARY__isLightColorThemeEnabled
                          ? 'var(--color-navy-50)'
                          : 'var(--color-navy-300)',
                      };
                    } else {
                      return {};
                    }
                  },
                },
              },
            }}
            // NOTE: we use onCellMouseOver as a bit of a workaround
            // since we use the context menu so we want the user to be
            // able to right click any cell and have the context menu
            // options use the data belonging to the row that they are
            // in. hence why we set the cell every time we mouse over
            // rather than making user click multiple times.
            onCellMouseOver={(event): void => {
              if (cellMouseDownEvent) {
                if (!holdingCells || resultState.filteredResults.length < 1) {
                  return;
                }
                const results = resultState.filteredResults[0];
                if (!results) {
                  return;
                }

                const firstCorner = results.coordinates;
                const secondCorner = findCoordinatesFromResultValue(event);

                resultState.setFilteredResults([results]);

                const minRow = Math.min(
                  firstCorner.rowIndex,
                  secondCorner.rowIndex,
                );
                const minCol = Math.min(
                  firstCorner.colIndex,
                  secondCorner.colIndex,
                );
                const maxRow = Math.max(
                  firstCorner.rowIndex,
                  secondCorner.rowIndex,
                );
                const maxCol = Math.max(
                  firstCorner.colIndex,
                  secondCorner.colIndex,
                );

                for (let x = minRow; x <= maxRow; x++) {
                  for (let y = minCol; y <= maxCol; y++) {
                    const actualValue =
                      resultState.findResultValueFromCoordinates([x, y]);

                    const valueAndColumnId = {
                      value: actualValue,
                      columnName: resultState.findColumnFromCoordinates(y),
                      coordinates: {
                        rowIndex: x,
                        colIndex: y,
                      },
                    } as FilteredResult;

                    if (
                      !resultState.filteredResults.find(
                        (result) =>
                          result.coordinates.colIndex === y &&
                          result.coordinates.rowIndex === x,
                      )
                    ) {
                      resultState.addFilteredResult(valueAndColumnId);
                    }
                  }
                }
              }

              setCellDoubleClickedEvent(event);
            }}
            onCellMouseDown={(event): void => {
              if ((event.event as MouseEvent).shiftKey) {
                const coordinates = findCoordinatesFromResultValue(event);
                const actualValue = resultState.findResultValueFromCoordinates([
                  coordinates.rowIndex,
                  coordinates.colIndex,
                ]);
                resultState.addFilteredResult({
                  value: actualValue,
                  columnName: event.column.getColId(),
                  coordinates: coordinates,
                });

                event.api.redrawRows();

                return;
              }

              if ((event.event as MouseEvent).button === 0) {
                resultState.setIsHoldingCells(true);
                resultState.setFilteredResults([]);
                setCellMouseDownEvent(event);
                const coordinates = findCoordinatesFromResultValue(event);
                const actualValue = resultState.findResultValueFromCoordinates([
                  coordinates.rowIndex,
                  coordinates.colIndex,
                ]);

                resultState.setFilteredResults([
                  {
                    value: actualValue,
                    columnName: event.column.getColId(),
                    coordinates: coordinates,
                  },
                ]);

                event.api.redrawRows();
              }
            }}
            suppressFieldDotNotation={true}
            columnDefs={columns.map((colName) => ({
              minWidth: 50,
              sortable: true,
              type: 'resultColumn',
              resizable: true,
              field: colName,
              flex: 1,
            }))}
          />
        </ContextMenu>
      </div>
    );
  },
);

const QueryBuilderResultValues = observer(
  (props: {
    executionResult: ExecutionResult;
    queryBuilderState: QueryBuilderState;
  }) => {
    const { executionResult, queryBuilderState } = props;
    if (executionResult instanceof TDSExecutionResult) {
      return (
        <QueryBuilderGridResult
          queryBuilderState={queryBuilderState}
          executionResult={executionResult}
        />
      );
    } else if (executionResult instanceof RawExecutionResult) {
      return (
        <CodeEditor
          language={CODE_EDITOR_LANGUAGE.TEXT}
          inputValue={executionResult.value}
          isReadOnly={true}
        />
      );
    }
    return (
      <CodeEditor
        language={CODE_EDITOR_LANGUAGE.JSON}
        inputValue={JSON.stringify(
          extractExecutionResultValues(executionResult),
          null,
          TAB_SIZE,
        )}
        isReadOnly={true}
      />
    );
  },
);

export const QueryBuilderResultPanel = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    const resultState = queryBuilderState.resultState;
    const queryParametersState = queryBuilderState.parametersState;
    const executionResult = resultState.executionResult;
    const fetchStructureImplementation =
      queryBuilderState.fetchStructureState.implementation;
    const USER_ATTESTATION_MESSAGE =
      'I attest that I am aware of the sensitive data leakage risk when exporting queried data. The data I export will only be used by me.';
    const exportQueryResults = async (format: string): Promise<void> => {
      if (queryBuilderState.parametersState.parameterStates.length) {
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

    const confirmExport = (format: string): void => {
      applicationStore.alertService.setActionAlertInfo({
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
    const queryValidationIssues = queryBuilderState.validationIssues;
    const queryWindowValidationIssues =
      fetchStructureImplementation instanceof QueryBuilderTDSState
        ? fetchStructureImplementation.windowState.validationIssues
        : undefined;
    const queryWindowStateIsValid = !queryWindowValidationIssues;

    const isSupportedQueryValid =
      queryBuilderState.validationIssues && queryWindowStateIsValid;
    const isQueryValid =
      !queryBuilderState.isQuerySupported || !isSupportedQueryValid;

    const runQuery = (): void => {
      resultState.setFilteredResults([]);
      resultState.pressedRunQuery.inProgress();
      if (queryParametersState.parameterStates.length) {
        queryParametersState.parameterValuesEditorState.open(
          (): Promise<void> =>
            flowResult(resultState.runQuery()).catch(
              applicationStore.alertUnhandledError,
            ),
          PARAMETER_SUBMIT_ACTION.RUN,
        );
        resultState.pressedRunQuery.complete();
      } else {
        flowResult(resultState.runQuery()).catch(
          applicationStore.alertUnhandledError,
        );
      }
    };
    const cancelQuery = (): void => {
      resultState.setIsRunningQuery(false);
      queryBuilderState.resultState.setQueryRunPromise(undefined);
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
    const allowSettingPreviewLimit = queryBuilderState.isQuerySupported;

    const isRunQueryDisabled =
      !isQueryValid ||
      resultState.isGeneratingPlan ||
      resultState.pressedRunQuery.isInProgress;

    const getResultSetDescription = (
      _executionResult: ExecutionResult,
    ): string | undefined => {
      const queryDuration = resultState.executionDuration
        ? prettyDuration(resultState.executionDuration, {
            ms: true,
          })
        : undefined;
      if (_executionResult instanceof TDSExecutionResult) {
        const rowLength = _executionResult.result.rows.length;
        return `${rowLength} row(s)${
          queryDuration ? ` in ${queryDuration}` : ''
        }`;
      }
      if (!queryDuration) {
        return undefined;
      }
      return `query ran in ${queryDuration}`;
    };
    const resultDescription = executionResult
      ? getResultSetDescription(executionResult)
      : undefined;
    return (
      <div
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_PANEL}
        className="panel query-builder__result"
      >
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">result</div>
            {resultState.pressedRunQuery.isInProgress && (
              <div className="panel__header__title__label__status">
                Running Query...
              </div>
            )}
            <div className="query-builder__result__analytics">
              {resultDescription ?? ''}
            </div>
            {executionResult && resultState.checkForStaleResults && (
              <div className="query-builder__result__stale-status">
                <div className="query-builder__result__stale-status__icon">
                  <ExclamationTriangleIcon />
                </div>
                <div className="query-builder__result__stale-status__label">
                  Preview data might be stale
                </div>
              </div>
            )}
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
                  disabled={!isQueryValid}
                />
              </div>
            )}
            {resultState.isRunningQuery ? (
              <button
                className="query-builder__result__stop-btn"
                onClick={cancelQuery}
                tabIndex={-1}
                disabled={!isQueryValid}
              >
                <div className="btn--dark btn--caution query-builder__result__stop-btn__label">
                  <PauseCircleIcon className="query-builder__result__stop-btn__label__icon" />
                  <div className="query-builder__result__stop-btn__label__title">
                    Stop
                  </div>
                </div>
              </button>
            ) : (
              <div className="query-builder__result__execute-btn">
                <button
                  className="query-builder__result__execute-btn__label"
                  onClick={runQuery}
                  tabIndex={-1}
                  title={
                    queryValidationIssues
                      ? `Query is not valid:\n${queryValidationIssues
                          .map((issue) => `\u2022 ${issue}`)
                          .join('\n')}`
                      : queryWindowValidationIssues
                      ? `Query is not valid:\n${queryWindowValidationIssues
                          .map((issue) => `\u2022 ${issue}`)
                          .join('\n')}`
                      : undefined
                  }
                  disabled={isRunQueryDisabled}
                >
                  <PlayIcon className="query-builder__result__execute-btn__label__icon" />
                  <div className="query-builder__result__execute-btn__label__title">
                    Run Query
                  </div>
                </button>
                <DropdownMenu
                  className="query-builder__result__execute-btn__dropdown-btn"
                  disabled={isRunQueryDisabled}
                  content={
                    <MenuContent>
                      <MenuContentItem
                        className="query-builder__result__execute-btn__option"
                        onClick={generatePlan}
                        disabled={isRunQueryDisabled}
                      >
                        Generate Plan
                      </MenuContentItem>
                      <MenuContentItem
                        className="query-builder__result__execute-btn__option"
                        onClick={debugPlanGeneration}
                        disabled={isRunQueryDisabled}
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
              </div>
            )}
            <DropdownMenu
              className="query-builder__result__export__dropdown"
              title="Export"
              disabled={!isQueryValid}
              content={
                <MenuContent>
                  {Object.values(
                    fetchStructureImplementation.exportDataFormatOptions,
                  ).map((format) => (
                    <MenuContentItem
                      key={format}
                      className="query-builder__result__export__dropdown__menu__item"
                      onClick={(): void => confirmExport(format)}
                    >
                      {prettyCONSTName(format)}
                    </MenuContentItem>
                  ))}
                </MenuContent>
              }
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                transformOrigin: { vertical: 'top', horizontal: 'right' },
                elevation: 7,
              }}
            >
              <div className="query-builder__result__export__dropdown__label">
                Export
              </div>
              <div className="query-builder__result__export__dropdown__trigger">
                <CaretDownIcon />
              </div>
            </DropdownMenu>
          </div>
        </div>
        <PanelContent>
          <PanelLoadingIndicator
            isLoading={
              resultState.isRunningQuery ||
              resultState.isGeneratingPlan ||
              resultState.exportDataState.isInProgress
            }
          />
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
        </PanelContent>
        <ExecutionPlanViewer
          executionPlanState={resultState.executionPlanState}
        />
      </div>
    );
  },
);
