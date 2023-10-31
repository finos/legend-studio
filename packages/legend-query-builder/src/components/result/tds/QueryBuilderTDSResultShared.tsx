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
  MenuContent,
  MenuContentItem,
  ContextMenu,
  clsx,
  MenuContentDivider,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { flowResult } from 'mobx';
import {
  type Enumeration,
  InstanceValue,
  TDSExecutionResult,
  EnumValueInstanceValue,
  EnumValueExplicitReference,
  getTDSRowRankByColumnInAsc,
  PRIMITIVE_TYPE,
  type ExecutionResult,
  RelationalExecutionActivities,
} from '@finos/legend-graph';
import { format as formatSQL } from 'sql-formatter';
import { useApplicationStore } from '@finos/legend-application';
import {
  assertErrorThrown,
  guaranteeNonNullable,
  isValidURL,
  isString,
  isNumber,
  filterByType,
} from '@finos/legend-shared';
import { forwardRef } from 'react';

import {
  QueryBuilderDerivationProjectionColumnState,
  QueryBuilderProjectionColumnState,
} from '../../../stores/fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import {
  type QueryBuilderPostFilterTreeNodeData,
  PostFilterConditionState,
  QueryBuilderPostFilterTreeConditionNodeData,
  PostFilterValueSpecConditionValueState,
} from '../../../stores/fetch-structure/tds/post-filter/QueryBuilderPostFilterState.js';
import {
  QueryBuilderPostFilterOperator_Equal,
  QueryBuilderPostFilterOperator_NotEqual,
} from '../../../stores/fetch-structure/tds/post-filter/operators/QueryBuilderPostFilterOperator_Equal.js';
import {
  QueryBuilderPostFilterOperator_In,
  QueryBuilderPostFilterOperator_NotIn,
} from '../../../stores/fetch-structure/tds/post-filter/operators/QueryBuilderPostFilterOperator_In.js';
import type { QueryBuilderPostFilterOperator } from '../../../stores/fetch-structure/tds/post-filter/QueryBuilderPostFilterOperator.js';
import { QueryBuilderTDSState } from '../../../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import {
  instanceValue_setValue,
  instanceValue_setValues,
} from '../../../stores/shared/ValueSpecificationModifierHelper.js';
import { type DataGridCellRendererParams } from '@finos/legend-lego/data-grid';
import type {
  QueryBuilderTDSResultCellCoordinate,
  QueryBuilderResultState,
  QueryBuilderTDSResultCellData,
} from '../../../stores/QueryBuilderResultState.js';
import {
  QueryBuilderPostFilterOperator_IsEmpty,
  QueryBuilderPostFilterOperator_IsNotEmpty,
} from '../../../stores/fetch-structure/tds/post-filter/operators/QueryBuilderPostFilterOperator_IsEmpty.js';
import { DEFAULT_LOCALE } from '../../../graph-manager/QueryBuilderConst.js';

export const tryToFormatSql = (sql: string): string => {
  try {
    const formattedSql = formatSQL(sql, { language: 'mysql' });
    return formattedSql;
  } catch {
    try {
      const formattedSql = formatSQL(sql);
      return formattedSql;
    } catch {
      return sql;
    }
  }
};

export const getExecutedSqlFromExecutionResult = (
  execResult: ExecutionResult,
): string | undefined => {
  const executedSqls = execResult.activities
    ?.filter(filterByType(RelationalExecutionActivities))
    .map((relationalActivity) => relationalActivity.sql);
  if (executedSqls?.length) {
    let executedSql = '';
    if (executedSqls.length > 1) {
      for (let i = 0; i < executedSqls.length; i++) {
        executedSql += `\n--QUERY #${i + 1}\n`;
        executedSql += `${executedSqls[i]}\n`;
      }
    } else {
      executedSql += executedSqls[0];
    }
    return executedSql;
  }
  return undefined;
};

export const getAggregationTDSColumnCustomizations = (
  result: TDSExecutionResult,
  columnName: string,
): object | undefined => {
  const columnType = result.builder.columns.find(
    (col) => col.name === columnName,
  )?.type;
  switch (columnType) {
    case PRIMITIVE_TYPE.STRING:
      return {
        filter: 'agTextColumnFilter',
        allowedAggFuncs: ['count'],
      };
    case PRIMITIVE_TYPE.DATE:
    case PRIMITIVE_TYPE.DATETIME:
    case PRIMITIVE_TYPE.STRICTDATE:
      return {
        filter: 'agDateColumnFilter',
        allowedAggFuncs: ['count'],
      };
    case PRIMITIVE_TYPE.DECIMAL:
    case PRIMITIVE_TYPE.INTEGER:
    case PRIMITIVE_TYPE.FLOAT:
      return {
        filter: 'agNumberColumnFilter',
        allowedAggFuncs: ['count', 'sum', 'max', 'min', 'avg'],
      };
    default:
      return {
        allowedAggFuncs: ['count'],
      };
  }
};

export type IQueryRendererParamsWithGridType = DataGridCellRendererParams & {
  resultState: QueryBuilderResultState;
  tdsExecutionResult: TDSExecutionResult;
};

export const QueryBuilderGridResultContextMenu = observer(
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
            v.condition.leftConditionValue instanceof
              QueryBuilderProjectionColumnState,
        )
        .filter(
          (n) =>
            (n as QueryBuilderPostFilterTreeConditionNodeData).condition
              .leftConditionValue.columnName ===
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

          postFilterConditionState.buildFromValueSpec(
            defaultFilterConditionValue,
          );
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

      const rightSide = conditionState.rightConditionValue;
      if (rightSide instanceof PostFilterValueSpecConditionValueState) {
        if (conditionState.operator.getLabel() === operator.getLabel()) {
          const doesValueAlreadyExist =
            rightSide.value instanceof InstanceValue &&
            (rightSide.value instanceof EnumValueInstanceValue
              ? rightSide.value.values.map((ef) => ef.value.name)
              : rightSide.value.values
            ).includes(cellData.value);

          if (!doesValueAlreadyExist) {
            const currentValueSpecificaton = rightSide.value;
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
              rightSide.value as InstanceValue,
              [currentValueSpecificaton, newValueSpecification],
              tdsState.queryBuilderState.observerContext,
            );
          }
        } else {
          const doesValueAlreadyExist =
            rightSide.value instanceof InstanceValue &&
            rightSide.value.values
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
              rightSide.value as InstanceValue,
              [
                ...(rightSide.value as InstanceValue).values,
                newValueSpecification,
              ],
              tdsState.queryBuilderState.observerContext,
            );
          }
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

export const QueryResultCellRenderer = observer(
  (params: IQueryRendererParamsWithGridType) => {
    const resultState = params.resultState;
    const tdsExecutionResult = params.tdsExecutionResult;
    const fetchStructureImplementation =
      resultState.queryBuilderState.fetchStructureState.implementation;
    const cellValue = params.value as string | null | number | undefined;
    const formattedCellValue = (): string | null | number | undefined => {
      if (isNumber(cellValue)) {
        return Intl.NumberFormat(DEFAULT_LOCALE, {
          maximumFractionDigits: 4,
        }).format(Number(cellValue));
      }
      return cellValue;
    };
    const cellValueUrlLink =
      isString(cellValue) && isValidURL(cellValue) ? cellValue : undefined;
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
      if (params.columnApi.getColumnState()[colIndex]?.sort === 'asc') {
        resultState.executionResult.result.rows.sort((a, b) =>
          getTDSRowRankByColumnInAsc(a, b, colIndex),
        );
      } else if (params.columnApi.getColumnState()[colIndex]?.sort === 'desc') {
        resultState.executionResult.result.rows.sort((a, b) =>
          getTDSRowRankByColumnInAsc(b, a, colIndex),
        );
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
        resultState.addSelectedCell({
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
        resultState.setSelectedCells([
          {
            value: actualValue,
            columnName: columnName,
            coordinates: coordinates,
          },
        ]);
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
              resultState.addSelectedCell(valueAndColumnId);
            }
          }
        }
      }

      resultState.setMouseOverCell(resultState.selectedCells[0] ?? null);
    };

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
          {cellValueUrlLink ? (
            <a href={cellValueUrlLink} target="_blank" rel="noreferrer">
              {cellValueUrlLink}
            </a>
          ) : (
            <span>{formattedCellValue()}</span>
          )}
        </div>
      </ContextMenu>
    );
  },
);
