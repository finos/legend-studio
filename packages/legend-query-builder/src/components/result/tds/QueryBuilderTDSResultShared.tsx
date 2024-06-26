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
  MenuContentDivider,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { flowResult } from 'mobx';
import {
  type TDSExecutionResult,
  type Enumeration,
  InstanceValue,
  EnumValueInstanceValue,
  EnumValueExplicitReference,
  type ExecutionResult,
  RelationalExecutionActivities,
} from '@finos/legend-graph';
import { format as formatSQL } from 'sql-formatter';
import {
  type ApplicationStore,
  type LegendApplicationConfig,
  type LegendApplicationPlugin,
  type LegendApplicationPluginManager,
  useApplicationStore,
} from '@finos/legend-application';
import {
  assertErrorThrown,
  guaranteeNonNullable,
  filterByType,
} from '@finos/legend-shared';
import { forwardRef } from 'react';
import {
  QueryBuilderDerivationProjectionColumnState,
  QueryBuilderProjectionColumnState,
} from '../../../stores/fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import {
  type QueryBuilderPostFilterTreeNodeData,
  type QueryBuilderPostFilterState,
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
import type { QueryBuilderTDSState } from '../../../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import {
  instanceValue_setValue,
  instanceValue_setValues,
} from '../../../stores/shared/ValueSpecificationModifierHelper.js';
import { type DataGridCellRendererParams } from '@finos/legend-lego/data-grid';
import type {
  QueryBuilderResultState,
  QueryBuilderTDSResultCellData,
  QueryBuilderTDSRowDataType,
} from '../../../stores/QueryBuilderResultState.js';
import {
  QueryBuilderPostFilterOperator_IsEmpty,
  QueryBuilderPostFilterOperator_IsNotEmpty,
} from '../../../stores/fetch-structure/tds/post-filter/operators/QueryBuilderPostFilterOperator_IsEmpty.js';
import { getTDSColumnState } from '../../../stores/fetch-structure/tds/QueryBuilderTDSHelper.js';
import type { QueryBuilderTDSColumnState } from '../../../stores/fetch-structure/tds/QueryBuilderTDSColumnState.js';

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
  pretty?: boolean,
): string | undefined => {
  const executedSqls = execResult.activities
    ?.filter(filterByType(RelationalExecutionActivities))
    .map((relationalActivity) => relationalActivity.sql)
    .map((sql) => (pretty ? tryToFormatSql(sql) : sql));
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

export const getRowDataFromExecutionResult = (
  executionResult: TDSExecutionResult,
): QueryBuilderTDSRowDataType[] => {
  const rowData = executionResult.result.rows.map((_row, rowIdx) => {
    const row: QueryBuilderTDSRowDataType = {};
    const cols = executionResult.result.columns;
    _row.values.forEach((value, colIdx) => {
      row[cols[colIdx] as string] = value;
    });
    row.rowNumber = rowIdx;
    return row;
  });
  return rowData;
};

export type IQueryRendererParamsWithGridType = DataGridCellRendererParams & {
  resultState: QueryBuilderResultState;
  tdsExecutionResult: TDSExecutionResult;
};

const postFilterEqualOperator = new QueryBuilderPostFilterOperator_Equal();
const postFilterInOperator = new QueryBuilderPostFilterOperator_In();
const postFilterEmptyOperator = new QueryBuilderPostFilterOperator_IsEmpty();
const postFilterNotEmptyOperator =
  new QueryBuilderPostFilterOperator_IsNotEmpty();
const postFilterNotEqualOperator =
  new QueryBuilderPostFilterOperator_NotEqual();
const postFilterNotInOperator = new QueryBuilderPostFilterOperator_NotIn();

const getExistingPostFilterNode = (
  operators: QueryBuilderPostFilterOperator[],
  projectionColumnName: string | undefined,
  postFilterState: QueryBuilderPostFilterState,
  tdsColState: QueryBuilderTDSColumnState | undefined,
): QueryBuilderPostFilterTreeNodeData | undefined =>
  Array.from(postFilterState.nodes.values())
    .filter(filterByType(QueryBuilderPostFilterTreeConditionNodeData))
    .filter(
      (node) =>
        node.condition.leftConditionValue instanceof
        QueryBuilderProjectionColumnState,
    )
    .filter(
      (node) =>
        node.condition.leftConditionValue.columnName ===
          (projectionColumnName ?? tdsColState?.columnName) &&
        operators
          .map((op) => op.getLabel())
          .includes(node.condition.operator.getLabel()),
    )[0];

const updateFilterConditionValue = (
  conditionValue: InstanceValue,
  _cellData: QueryBuilderTDSResultCellData,
  tdsState: QueryBuilderTDSState,
): void => {
  if (_cellData.value) {
    instanceValue_setValue(
      conditionValue,
      conditionValue instanceof EnumValueInstanceValue
        ? EnumValueExplicitReference.create(
            guaranteeNonNullable(
              (
                conditionValue.genericType?.ownerReference.value as Enumeration
              ).values.filter((v) => v.name === _cellData.value)[0],
            ),
          )
        : _cellData.value,
      0,
      tdsState.queryBuilderState.observerContext,
    );
  }
};

const generateNewPostFilterConditionNodeData = async (
  applicationStore: ApplicationStore<
    LegendApplicationConfig,
    LegendApplicationPluginManager<LegendApplicationPlugin>
  >,
  operator: QueryBuilderPostFilterOperator,
  _cellData: QueryBuilderTDSResultCellData,
  tdsState: QueryBuilderTDSState,
  tdsColState: QueryBuilderTDSColumnState | undefined,
): Promise<void> => {
  let postFilterConditionState: PostFilterConditionState;
  try {
    const possibleProjectionColumnState = _cellData.columnName
      ? tdsState.projectionColumns
          .filter((c) => c.columnName === _cellData.columnName)
          .concat(
            tdsState.aggregationState.columns
              .filter((c) => c.columnName === _cellData.columnName)
              .map((ag) => ag.projectionColumnState),
          )[0]
      : tdsColState;

    if (possibleProjectionColumnState) {
      postFilterConditionState = new PostFilterConditionState(
        tdsState.postFilterState,
        possibleProjectionColumnState,
        operator,
      );

      if (tdsColState instanceof QueryBuilderDerivationProjectionColumnState) {
        await flowResult(tdsColState.fetchDerivationLambdaReturnType());
      }

      const defaultFilterConditionValue =
        postFilterConditionState.operator.getDefaultFilterConditionValue(
          postFilterConditionState,
        );

      postFilterConditionState.buildFromValueSpec(defaultFilterConditionValue);
      updateFilterConditionValue(
        defaultFilterConditionValue as InstanceValue,
        _cellData,
        tdsState,
      );
      tdsState.postFilterState.addNodeFromNode(
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
  _cellData: QueryBuilderTDSResultCellData,
  operator: QueryBuilderPostFilterOperator,
  data: QueryBuilderTDSResultCellData | null,
  tdsState: QueryBuilderTDSState,
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
        ).includes(_cellData.value);

      if (!doesValueAlreadyExist) {
        const currentValueSpecificaton = rightSide.value;
        const newValueSpecification =
          conditionState.operator.getDefaultFilterConditionValue(
            conditionState,
          );
        updateFilterConditionValue(
          newValueSpecification as InstanceValue,
          _cellData,
          tdsState,
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
              : v.values,
          )
          .flat()
          .includes(_cellData.value ?? data?.value);

      if (!doesValueAlreadyExist) {
        const newValueSpecification = (
          isFilterBy ? postFilterEqualOperator : postFilterNotEqualOperator
        ).getDefaultFilterConditionValue(conditionState);
        updateFilterConditionValue(
          newValueSpecification as InstanceValue,
          _cellData,
          tdsState,
        );
        instanceValue_setValues(
          rightSide.value as InstanceValue,
          [...(rightSide.value as InstanceValue).values, newValueSpecification],
          tdsState.queryBuilderState.observerContext,
        );
      }
    }
  }
};

const getFilterOperator = (
  isFilterBy: boolean,
  _cellData: QueryBuilderTDSResultCellData,
): QueryBuilderPostFilterOperator => {
  if (isFilterBy) {
    if (_cellData.value === null) {
      return postFilterEmptyOperator;
    } else {
      return postFilterEqualOperator;
    }
  } else {
    if (_cellData.value === null) {
      return postFilterNotEmptyOperator;
    } else {
      return postFilterNotEqualOperator;
    }
  }
};

const filterByOrOutValue = (
  applicationStore: ApplicationStore<
    LegendApplicationConfig,
    LegendApplicationPluginManager<LegendApplicationPlugin>
  >,
  isFilterBy: boolean,
  _cellData: QueryBuilderTDSResultCellData,
  data: QueryBuilderTDSResultCellData | null,
  tdsState: QueryBuilderTDSState,
): void => {
  tdsState.setShowPostFilterPanel(true);
  const operator = getFilterOperator(isFilterBy, _cellData);
  const tdsColState = data?.columnName
    ? getTDSColumnState(tdsState, data.columnName)
    : undefined;
  const existingPostFilterNode = getExistingPostFilterNode(
    _cellData.value === null
      ? [postFilterEmptyOperator, postFilterNotEmptyOperator]
      : isFilterBy
        ? [postFilterEqualOperator, postFilterInOperator]
        : [postFilterNotEqualOperator, postFilterNotInOperator],
    _cellData.columnName,
    tdsState.postFilterState,
    tdsColState,
  );
  existingPostFilterNode === undefined
    ? generateNewPostFilterConditionNodeData(
        applicationStore,
        operator,
        _cellData,
        tdsState,
        tdsColState,
      ).catch(applicationStore.alertUnhandledError)
    : updateExistingPostFilterConditionNodeData(
        existingPostFilterNode,
        isFilterBy,
        _cellData,
        operator,
        data,
        tdsState,
      );
};

export const filterByOrOutValues = (
  applicationStore: ApplicationStore<
    LegendApplicationConfig,
    LegendApplicationPluginManager<LegendApplicationPlugin>
  >,
  data: QueryBuilderTDSResultCellData | null,
  isFilterBy: boolean,
  tdsState: QueryBuilderTDSState,
): void => {
  tdsState.queryBuilderState.resultState.selectedCells.forEach((_cellData) => {
    filterByOrOutValue(applicationStore, isFilterBy, _cellData, data, tdsState);
  });
};

export const QueryBuilderGridResultContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      data: QueryBuilderTDSResultCellData | null;
      tdsState: QueryBuilderTDSState;
      copyCellValueFunc: () => void;
      copyCellRowValueFunc: () => void;
    }
  >(function QueryBuilderResultContextMenu(props, ref) {
    const { data, tdsState, copyCellValueFunc, copyCellRowValueFunc } = props;
    const applicationStore = useApplicationStore();

    const tdsColState = data?.columnName
      ? getTDSColumnState(tdsState, data.columnName)
      : undefined;

    return (
      <MenuContent ref={ref}>
        <MenuContentItem
          disabled={!tdsColState}
          onClick={(): void => {
            filterByOrOutValues(applicationStore, data, true, tdsState);
          }}
        >
          Filter By
        </MenuContentItem>
        <MenuContentItem
          disabled={!tdsColState}
          onClick={(): void => {
            filterByOrOutValues(applicationStore, data, false, tdsState);
          }}
        >
          Filter Out
        </MenuContentItem>
        <MenuContentDivider />
        <MenuContentItem onClick={copyCellValueFunc}>
          Copy Cell Value
        </MenuContentItem>
        <MenuContentItem onClick={copyCellRowValueFunc}>
          Copy Row Value
        </MenuContentItem>
      </MenuContent>
    );
  }),
);
