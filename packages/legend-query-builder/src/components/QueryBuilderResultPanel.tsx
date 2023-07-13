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
  Button,
  SQLIcon,
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  PanelDivider,
} from '@finos/legend-art';
import { format as formatSQL } from 'sql-formatter';

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
  RelationalExecutionActivities,
} from '@finos/legend-graph';
import {
  ActionAlertActionType,
  ActionAlertType,
  DEFAULT_TAB_SIZE,
  useApplicationStore,
} from '@finos/legend-application';
import {
  assertErrorThrown,
  guaranteeNonNullable,
  isBoolean,
  type PlainObject,
  prettyDuration,
  filterByType,
  isValidURL,
} from '@finos/legend-shared';
import { forwardRef, useRef, useState } from 'react';
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
import { QUERY_BUILDER_TEST_ID } from '../__lib__/QueryBuilderTesting.js';
import {
  DataGrid,
  type DataGridCellRendererParams,
} from '@finos/legend-lego/data-grid';
import {
  CODE_EDITOR_LANGUAGE,
  CodeEditor,
} from '@finos/legend-lego/code-editor';
import { ExecutionPlanViewer } from './execution-plan/ExecutionPlanViewer.js';
import type {
  QueryBuilderTDSResultCellCoordinate,
  QueryBuilderResultState,
  QueryBuilderTDSResultCellData,
} from '../stores/QueryBuilderResultState.js';
import {
  QueryBuilderPostFilterOperator_IsEmpty,
  QueryBuilderPostFilterOperator_IsNotEmpty,
} from '../stores/fetch-structure/tds/post-filter/operators/QueryBuilderPostFilterOperator_IsEmpty.js';
import { QueryUsageViewer } from './QueryUsageViewer.js';

export const tryToFormatSql = (sql: string): string => {
  try {
    const formattedSql = formatSQL(sql);
    return formattedSql;
  } catch {
    return sql;
  }
};

const QueryBuilderGridResultContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      data: QueryBuilderTDSResultCellData | null;
      tdsState: QueryBuilderTDSState;
    }
  >(function QueryBuilderResultContextMenu(props, ref) {
    const { data, tdsState } = props;

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

    const projectionColumnState = tdsState.projectionColumns
      .filter((c) => c.columnName === data?.columnName)
      .concat(
        tdsState.aggregationState.columns
          .filter((c) => c.columnName === data?.columnName)
          .map((ag) => ag.projectionColumnState),
      )[0];
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
              (projectionColumnName ?? projectionColumnState?.columnName) &&
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
      cellData: QueryBuilderTDSResultCellData,
    ): void => {
      if (cellData.value) {
        instanceValue_setValue(
          conditionValue,
          conditionValue instanceof EnumValueInstanceValue
            ? EnumValueExplicitReference.create(
                guaranteeNonNullable(
                  (
                    conditionValue.genericType?.ownerReference
                      .value as Enumeration
                  ).values.filter((v) => v.name === cellData.value)[0],
                ),
              )
            : cellData.value,
          0,
          tdsState.queryBuilderState.observerContext,
        );
      }
    };

    const generateNewPostFilterConditionNodeData = async (
      operator: QueryBuilderPostFilterOperator,
      cellData: QueryBuilderTDSResultCellData,
    ): Promise<void> => {
      let postFilterConditionState: PostFilterConditionState;
      try {
        const possibleProjectionColumnState = cellData.columnName
          ? tdsState.projectionColumns
              .filter((c) => c.columnName === cellData.columnName)
              .concat(
                tdsState.aggregationState.columns
                  .filter((c) => c.columnName === cellData.columnName)
                  .map((ag) => ag.projectionColumnState),
              )[0]
          : projectionColumnState;

        if (possibleProjectionColumnState) {
          postFilterConditionState = new PostFilterConditionState(
            postFilterState,
            possibleProjectionColumnState,
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
            cellData,
          );
          postFilterState.addNodeFromNode(
            new QueryBuilderPostFilterTreeConditionNodeData(
              undefined,
              postFilterConditionState,
            ),
            undefined,
          );
        }
      } catch (error) {
        assertErrorThrown(error);
        applicationStore.notificationService.notifyWarning(error.message);
        return;
      }
    };

    const updateExistingPostFilterConditionNodeData = (
      existingPostFilterNode: QueryBuilderPostFilterTreeNodeData,
      isFilterBy: boolean,
      cellData: QueryBuilderTDSResultCellData,
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
          ).includes(cellData.value);

        if (!doesValueAlreadyExist) {
          const currentValueSpecificaton = conditionState.value;
          const newValueSpecification =
            conditionState.operator.getDefaultFilterConditionValue(
              conditionState,
            );
          updateFilterConditionValue(
            newValueSpecification as InstanceValue,
            cellData,
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
            .includes(cellData.value ?? data?.value);

        if (!doesValueAlreadyExist) {
          const newValueSpecification = (
            isFilterBy ? postFilterEqualOperator : postFilterNotEqualOperator
          ).getDefaultFilterConditionValue(conditionState);
          updateFilterConditionValue(
            newValueSpecification as InstanceValue,
            cellData,
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
      cellData: QueryBuilderTDSResultCellData,
    ): QueryBuilderPostFilterOperator => {
      if (isFilterBy === true) {
        if (cellData.value === null) {
          return postFilterEmptyOperator;
        } else {
          return postFilterEqualOperator;
        }
      } else {
        if (cellData.value === null) {
          return postFilterNotEmptyOperator;
        } else {
          return postFilterNotEqualOperator;
        }
      }
    };

    const filterByOrOutValue = (
      isFilterBy: boolean,
      cellData: QueryBuilderTDSResultCellData,
    ): void => {
      tdsState.setShowPostFilterPanel(true);

      const operator = getFilterOperator(isFilterBy, cellData);

      const existingPostFilterNode = getExistingPostFilterNode(
        cellData.value === null
          ? [postFilterEmptyOperator, postFilterNotEmptyOperator]
          : isFilterBy
          ? [postFilterEqualOperator, postFilterInOperator]
          : [postFilterNotEqualOperator, postFilterNotInOperator],
        cellData.columnName,
      );

      existingPostFilterNode === undefined
        ? generateNewPostFilterConditionNodeData(operator, cellData).catch(
            applicationStore.alertUnhandledError,
          )
        : updateExistingPostFilterConditionNodeData(
            existingPostFilterNode,
            isFilterBy,
            cellData,
            operator,
          );
    };

    const filterByOrOutValues = (isFilterBy: boolean): void => {
      tdsState.queryBuilderState.resultState.selectedCells.forEach(
        (cellData) => {
          filterByOrOutValue(isFilterBy, cellData);
        },
      );
    };

    const handleCopyCellValue = applicationStore.guardUnhandledError(() =>
      applicationStore.clipboardService.copyTextToClipboard(
        data?.value?.toString() ?? '',
      ),
    );

    const findRowFromRowIndex = (
      rowIndex: number,
    ): (string | number | boolean | null)[] => {
      if (
        !tdsState.queryBuilderState.resultState.executionResult ||
        !(
          tdsState.queryBuilderState.resultState.executionResult instanceof
          TDSExecutionResult
        )
      ) {
        return [''];
      }
      return (
        tdsState.queryBuilderState.resultState.executionResult.result.rows[
          rowIndex
        ]?.values ?? ['']
      );
    };

    const handleCopyRowValue = applicationStore.guardUnhandledError(() =>
      applicationStore.clipboardService.copyTextToClipboard(
        findRowFromRowIndex(
          tdsState.queryBuilderState.resultState.selectedCells[0]?.coordinates
            .rowIndex ?? 0,
        ).toString(),
      ),
    );

    return (
      <MenuContent ref={ref}>
        <MenuContentItem
          disabled={!projectionColumnState}
          onClick={(): void => {
            filterByOrOutValues(true);
          }}
        >
          Filter By
        </MenuContentItem>
        <MenuContentItem
          disabled={!projectionColumnState}
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

type IQueryRendererParamsWithGridType = DataGridCellRendererParams & {
  resultState: QueryBuilderResultState;
  tdsExecutionResult: TDSExecutionResult;
};

const QueryResultCellRenderer = observer(
  (params: IQueryRendererParamsWithGridType) => {
    const resultState = params.resultState;
    const tdsExecutionResult = params.tdsExecutionResult;

    const cellValue = params.value as string;
    const columnName = params.column?.getColId() ?? '';

    const findCoordinatesFromResultValue = (
      colId: string,
      rowNumber: number,
    ): QueryBuilderTDSResultCellCoordinate => {
      const colIndex = tdsExecutionResult.result.columns.findIndex(
        (col) => col === colId,
      );

      return { rowIndex: rowNumber, colIndex: colIndex };
    };

    const currentCellCoordinates = findCoordinatesFromResultValue(
      columnName,
      params.rowIndex,
    );

    const cellInFilteredResults = resultState.selectedCells.some(
      (result) =>
        result.coordinates.colIndex === currentCellCoordinates.colIndex &&
        result.coordinates.rowIndex === currentCellCoordinates.rowIndex,
    );

    const findColumnFromCoordinates = (
      colIndex: number,
    ): string | number | boolean | null | undefined => {
      if (
        !resultState.executionResult ||
        !(resultState.executionResult instanceof TDSExecutionResult)
      ) {
        return undefined;
      }
      return resultState.executionResult.result.columns[colIndex];
    };

    const findResultValueFromCoordinates = (
      resultCoordinate: [number, number],
    ): string | number | boolean | null | undefined => {
      const rowIndex = resultCoordinate[0];
      const colIndex = resultCoordinate[1];

      if (
        !resultState.executionResult ||
        !(resultState.executionResult instanceof TDSExecutionResult)
      ) {
        return undefined;
      }

      return resultState.executionResult.result.rows[rowIndex]?.values[
        colIndex
      ];
    };

    const isCoordinatesSelected = (
      resultCoordinate: QueryBuilderTDSResultCellCoordinate,
    ): boolean =>
      resultState.selectedCells.some(
        (cell) =>
          cell.coordinates.rowIndex === resultCoordinate.rowIndex &&
          cell.coordinates.colIndex === resultCoordinate.colIndex,
      );

    const mouseDown: React.MouseEventHandler = (event) => {
      event.preventDefault();

      if (event.shiftKey) {
        const coordinates = findCoordinatesFromResultValue(
          columnName,
          params.rowIndex,
        );
        const actualValue = findResultValueFromCoordinates([
          coordinates.rowIndex,
          coordinates.colIndex,
        ]);
        resultState.addCellData({
          value: actualValue,
          columnName: columnName,
          coordinates: coordinates,
        });
        return;
      }

      if (event.button === 0) {
        resultState.setIsSelectingCells(true);
        resultState.setSelectedCells([]);
        const coordinates = findCoordinatesFromResultValue(
          columnName,
          params.rowIndex,
        );
        const actualValue = findResultValueFromCoordinates([
          coordinates.rowIndex,
          coordinates.colIndex,
        ]);

        const rowNode = params.api.getRowNode(params.rowIndex.toString());

        resultState.setSelectedCells([
          {
            value: actualValue,
            columnName: columnName,
            coordinates: coordinates,
          },
        ]);

        if (rowNode) {
          params.api.refreshCells({
            force: true,
            columns: [columnName],
            rowNodes: [rowNode],
          });
        }

        resultState.setMouseOverCell(resultState.selectedCells[0] ?? null);
      }

      if (event.button === 2) {
        const coordinates = findCoordinatesFromResultValue(
          columnName,
          params.rowIndex,
        );
        const isInSelected = isCoordinatesSelected(coordinates);
        if (!isInSelected) {
          const actualValue = findResultValueFromCoordinates([
            coordinates.rowIndex,
            coordinates.colIndex,
          ]);

          resultState.setSelectedCells([
            {
              value: actualValue,
              columnName: columnName,
              coordinates: coordinates,
            },
          ]);
          const rowNode = params.api.getRowNode(params.rowIndex.toString());

          if (rowNode) {
            params.api.refreshCells({
              force: true,
              columns: [columnName],
              rowNodes: [rowNode],
            });
          }
          resultState.setMouseOverCell(resultState.selectedCells[0] ?? null);
        }
      }
    };
    const mouseUp: React.MouseEventHandler = (event) => {
      resultState.setIsSelectingCells(false);
    };

    const mouseOver: React.MouseEventHandler = (event) => {
      if (resultState.isSelectingCells) {
        if (resultState.selectedCells.length < 1) {
          return;
        }
        const results = resultState.selectedCells[0];
        if (!results) {
          return;
        }

        const firstCorner = results.coordinates;
        const secondCorner = findCoordinatesFromResultValue(
          columnName,
          params.rowIndex,
        );

        resultState.setSelectedCells([results]);

        const minRow = Math.min(firstCorner.rowIndex, secondCorner.rowIndex);
        const minCol = Math.min(firstCorner.colIndex, secondCorner.colIndex);
        const maxRow = Math.max(firstCorner.rowIndex, secondCorner.rowIndex);
        const maxCol = Math.max(firstCorner.colIndex, secondCorner.colIndex);

        for (let x = minRow; x <= maxRow; x++) {
          for (let y = minCol; y <= maxCol; y++) {
            const actualValue = findResultValueFromCoordinates([x, y]);

            const valueAndColumnId = {
              value: actualValue,
              columnName: findColumnFromCoordinates(y),
              coordinates: {
                rowIndex: x,
                colIndex: y,
              },
            } as QueryBuilderTDSResultCellData;

            if (
              !resultState.selectedCells.find(
                (result) =>
                  result.coordinates.colIndex === y &&
                  result.coordinates.rowIndex === x,
              )
            ) {
              resultState.addCellData(valueAndColumnId);
            }
          }
        }
      }

      resultState.setMouseOverCell(resultState.selectedCells[0] ?? null);
    };

    const fetchStructureImplementation =
      resultState.queryBuilderState.fetchStructureState.implementation;

    return (
      <ContextMenu
        content={
          // NOTE: we only support this functionality for grid result with a projection fetch-structure
          fetchStructureImplementation instanceof QueryBuilderTDSState ? (
            <QueryBuilderGridResultContextMenu
              data={resultState.mousedOverCell}
              tdsState={fetchStructureImplementation}
            />
          ) : null
        }
        disabled={
          !(
            resultState.queryBuilderState.fetchStructureState
              .implementation instanceof QueryBuilderTDSState
          ) ||
          !resultState.queryBuilderState.isQuerySupported ||
          !resultState.mousedOverCell
        }
        menuProps={{ elevation: 7 }}
        key={params.value as string}
        className={clsx('ag-theme-balham-dark query-builder__result__tds-grid')}
      >
        <div
          className={clsx('query-builder__result__values__table__cell', {
            'query-builder__result__values__table__cell--active':
              cellInFilteredResults,
          })}
          onMouseDown={(event) => mouseDown(event)}
          onMouseUp={(event) => mouseUp(event)}
          onMouseOver={(event) => mouseOver(event)}
        >
          {isValidURL(cellValue) ? (
            <a href={cellValue} target="_blank" rel="noreferrer">
              {cellValue}
            </a>
          ) : (
            <span>{cellValue}</span>
          )}
        </div>
      </ContextMenu>
    );
  },
);

const QueryBuilderGridResult = observer(
  (props: {
    executionResult: TDSExecutionResult;
    queryBuilderState: QueryBuilderState;
  }) => {
    const { executionResult, queryBuilderState } = props;

    const resultState = queryBuilderState.resultState;

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

    return (
      <div className="query-builder__result__values__table">
        <div
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
            }}
            suppressFieldDotNotation={true}
            columnDefs={executionResult.result.columns.map((colName) => ({
              minWidth: 50,
              sortable: true,
              resizable: true,
              field: colName,
              flex: 1,
              cellRenderer: QueryResultCellRenderer,
              cellRendererParams: {
                resultState: resultState,
                tdsExecutionResult: executionResult,
              },
            }))}
          />
        </div>
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
      const inputValue =
        executionResult.value === null
          ? 'null'
          : executionResult.value.toString();
      return (
        <CodeEditor
          language={CODE_EDITOR_LANGUAGE.TEXT}
          inputValue={inputValue}
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
          DEFAULT_TAB_SIZE,
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
    const [showSqlModal, setShowSqlModal] = useState(false);
    const relationalActivities = executionResult?.activities;
    const executedSqls = relationalActivities
      ?.filter(filterByType(RelationalExecutionActivities))
      .map((relationalActivity) => relationalActivity.sql);

    let executedSql = '';
    if (executedSqls?.length && executedSqls.length > 1) {
      for (let i = 0; i < executedSqls.length; i++) {
        executedSql += `\n--QUERY #${i + 1}\n`;
        executedSql += `${executedSqls[i]}\n`;
      }
    } else {
      executedSql += executedSqls?.[0];
    }

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

    const allValidationIssues = queryBuilderState.allValidationIssues;

    const isSupportedQueryValid = allValidationIssues.length === 0;

    const isQueryValid =
      !queryBuilderState.isQuerySupported || isSupportedQueryValid;

    const runQuery = (): void => {
      resultState.setSelectedCells([]);
      resultState.pressedRunQuery.inProgress();
      if (queryParametersState.parameterStates.length) {
        queryParametersState.parameterValuesEditorState.open(
          (): Promise<void> =>
            flowResult(resultState.runQuery()).catch(
              applicationStore.alertUnhandledError,
            ),
          PARAMETER_SUBMIT_ACTION.RUN,
        );
      } else {
        flowResult(resultState.runQuery()).catch(
          applicationStore.alertUnhandledError,
        );
      }
      resultState.pressedRunQuery.complete();
    };
    const cancelQuery = applicationStore.guardUnhandledError(() =>
      flowResult(resultState.cancelQuery()),
    );

    const generatePlan = applicationStore.guardUnhandledError(() =>
      flowResult(resultState.generatePlan(false)),
    );
    const debugPlanGeneration = applicationStore.guardUnhandledError(() =>
      flowResult(resultState.generatePlan(true)),
    );

    const allowSettingPreviewLimit = queryBuilderState.isQuerySupported;

    const copyExpression = (value: string): void => {
      applicationStore.clipboardService
        .copyTextToClipboard(value)
        .then(() =>
          applicationStore.notificationService.notifySuccess(
            'SQL Query copied',
            undefined,
            2500,
          ),
        )
        .catch(applicationStore.alertUnhandledError);
    };

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
        queryBuilderState.resultState.setPreviewLimit(1);
      } else {
        queryBuilderState.resultState.setPreviewLimit(previewLimitValue);
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

    return (
      <div
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_PANEL}
        className="panel query-builder__result"
      >
        {showSqlModal && executedSqls && (
          <Dialog
            open={Boolean(showSqlModal)}
            onClose={() => setShowSqlModal(false)}
          >
            <Modal className="editor-modal" darkMode={true}>
              <ModalHeader title="Executed SQL Query" />
              <ModalBody className="query-builder__sql__modal">
                <>
                  <CodeEditor
                    inputValue={tryToFormatSql(executedSql)}
                    isReadOnly={true}
                    language={CODE_EDITOR_LANGUAGE.SQL}
                    hideMinimap={true}
                  />

                  <PanelDivider />
                </>
              </ModalBody>
              <ModalFooter>
                <ModalFooterButton
                  formatText={false}
                  onClick={() => copyExpression(executedSql)}
                  text="Copy SQL to Clipboard"
                />

                <ModalFooterButton
                  onClick={() => setShowSqlModal(false)}
                  text="Close"
                />
              </ModalFooter>
            </Modal>
          </Dialog>
        )}

        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">result</div>
            {executedSqls && (
              <Button
                onClick={() => setShowSqlModal(true)}
                title="Executed SQL"
                className="query-builder__result__sql__actions"
              >
                <SQLIcon />
              </Button>
            )}
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
                  ref={inputRef}
                  className="input--dark query-builder__result__limit__input"
                  spellCheck={false}
                  type="number"
                  value={previewLimitValue}
                  onChange={changePreviewLimit}
                  onBlur={getPreviewLimit}
                  onKeyDown={onKeyDown}
                  disabled={!isQueryValid}
                />
              </div>
            )}

            <div className="query-builder__result__execute-btn btn__dropdown-combo btn__dropdown-combo--primary">
              {resultState.isRunningQuery ? (
                <button
                  className="btn__dropdown-combo__canceler"
                  onClick={cancelQuery}
                  tabIndex={-1}
                  disabled={!isQueryValid}
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
                    onClick={runQuery}
                    tabIndex={-1}
                    title={
                      allValidationIssues.length
                        ? `Query is not valid:\n${allValidationIssues
                            .map((issue) => `\u2022 ${issue}`)
                            .join('\n')}`
                        : undefined
                    }
                    disabled={isRunQueryDisabled}
                  >
                    <PlayIcon className="btn__dropdown-combo__label__icon" />
                    <div className="btn__dropdown-combo__label__title">
                      Run Query
                    </div>
                  </button>
                  <DropdownMenu
                    className="btn__dropdown-combo__dropdown-btn"
                    disabled={isRunQueryDisabled}
                    content={
                      <MenuContent>
                        <MenuContentItem
                          className="btn__dropdown-combo__option"
                          onClick={generatePlan}
                          disabled={isRunQueryDisabled}
                        >
                          Generate Plan
                        </MenuContentItem>
                        <MenuContentItem
                          className="btn__dropdown-combo__option"
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
                </>
              )}
            </div>
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
                      {format}
                    </MenuContentItem>
                  ))}
                  <MenuContentItem
                    className="query-builder__result__export__dropdown__menu__item"
                    onClick={(): void =>
                      resultState.setIsQueryUsageViewerOpened(true)
                    }
                    disabled={queryBuilderState.changeDetectionState.hasChanged}
                  >
                    View Query Usage...
                  </MenuContentItem>
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
            {resultState.isQueryUsageViewerOpened && (
              <QueryUsageViewer resultState={resultState} />
            )}
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
