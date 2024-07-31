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

import type {
  RawLambda,
  AbstractPropertyExpression,
} from '@finos/legend-graph';
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import { QueryBuilderAggregateOperator_Average } from './fetch-structure/tds/aggregation/operators/QueryBuilderAggregateOperator_Average.js';
import { QueryBuilderAggregateOperator_Count } from './fetch-structure/tds/aggregation/operators/QueryBuilderAggregateOperator_Count.js';
import { QueryBuilderAggregateOperator_DistinctCount } from './fetch-structure/tds/aggregation/operators/QueryBuilderAggregateOperator_DistinctCount.js';
import { QueryBuilderAggregateOperator_Max } from './fetch-structure/tds/aggregation/operators/QueryBuilderAggregateOperator_Max.js';
import { QueryBuilderAggregateOperator_Min } from './fetch-structure/tds/aggregation/operators/QueryBuilderAggregateOperator_Min.js';
import { QueryBuilderAggregateOperator_StdDev_Population } from './fetch-structure/tds/aggregation/operators/QueryBuilderAggregateOperator_StdDev_Population.js';
import { QueryBuilderAggregateOperator_StdDev_Sample } from './fetch-structure/tds/aggregation/operators/QueryBuilderAggregateOperator_StdDev_Sample.js';
import { QueryBuilderAggregateOperator_Sum } from './fetch-structure/tds/aggregation/operators/QueryBuilderAggregateOperator_Sum.js';
import { QueryBuilderSimpleProjectionColumnState } from './fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import type { QueryBuilderState } from './QueryBuilderState.js';
import { SortColumnState } from './fetch-structure/tds/QueryResultSetModifierState.js';
import type { QueryBuilderAggregateOperator } from './fetch-structure/tds/aggregation/QueryBuilderAggregateOperator.js';
import { QueryBuilderTDSState } from './fetch-structure/tds/QueryBuilderTDSState.js';
import { COLUMN_SORT_TYPE } from '../graph/QueryBuilderMetaModelConst.js';

const PREVIEW_DATA_TAKE_LIMIT = 10;
const PREVIEW_DATA_NON_NUMERIC_VALUE_COLUMN_NAME = 'Value';
const PREVIEW_DATA_NON_NUMERIC_COUNT_COLUMN_NAME = 'Count';

enum NUMERIC_AGG_FUNC {
  COUNT = 'Count',
  DISTINCT_COUNT = 'Distinct Count',
  SUM = 'Sum',
  MIN = 'Min',
  MAX = 'Max',
  AVERAGE = 'Average',
  STD_DEV_POPULATION = 'Std Dev (Population)',
  STD_DEV_SAMPLE = 'Std Dev (Sample)',
}

const NUMERIC_AGG_FUNC_TO_AGG_OP: [
  NUMERIC_AGG_FUNC,
  typeof QueryBuilderAggregateOperator,
][] = [
  [NUMERIC_AGG_FUNC.COUNT, QueryBuilderAggregateOperator_Count],
  [
    NUMERIC_AGG_FUNC.DISTINCT_COUNT,
    QueryBuilderAggregateOperator_DistinctCount,
  ],
  [NUMERIC_AGG_FUNC.SUM, QueryBuilderAggregateOperator_Sum],
  [NUMERIC_AGG_FUNC.MIN, QueryBuilderAggregateOperator_Min],
  [NUMERIC_AGG_FUNC.MAX, QueryBuilderAggregateOperator_Max],
  [NUMERIC_AGG_FUNC.AVERAGE, QueryBuilderAggregateOperator_Average],
  [
    NUMERIC_AGG_FUNC.STD_DEV_POPULATION,
    QueryBuilderAggregateOperator_StdDev_Population,
  ],
  [
    NUMERIC_AGG_FUNC.STD_DEV_SAMPLE,
    QueryBuilderAggregateOperator_StdDev_Sample,
  ],
];

const createSimpleProjectionColumn = (
  tdsState: QueryBuilderTDSState,
  propertyExpression: AbstractPropertyExpression,
  columnName: string,
): QueryBuilderSimpleProjectionColumnState => {
  const col = new QueryBuilderSimpleProjectionColumnState(
    tdsState,
    propertyExpression,
    false,
  );
  col.setColumnName(columnName);
  return col;
};

export type QueryBuilderPreviewData = {
  columns: string[];
  rows: { values: (string | number)[] }[];
};

export const buildNumericPreviewDataQuery = (
  queryBuilderState: QueryBuilderState,
  propertyExpression: AbstractPropertyExpression,
  options?: {
    skipLimitOverfitting: boolean;
  },
): RawLambda => {
  // Build the following query
  //
  // ClassX.all()->groupBy(
  //   [],
  //   [
  //     agg(x|$x.prop, x|$x->count()),
  //     agg(x|$x.prop, x|$x->distinct()->count()),
  //     agg(x|$x.prop, x|$x->sum()),
  //     agg(x|$x.prop, x|$x->min()),
  //     agg(x|$x.prop, x|$x->max()),
  //     agg(x|$x.prop, x|$x->average()),
  //     agg(x|$x.prop, x|$x->stdDevPopulation()),
  //     agg(x|$x.prop, x|$x->stdDevSample())
  //   ],
  //   [
  //     'Count',
  //     'Distinct Count',
  //     'Sum',
  //     'Min',
  //     'Max',
  //     'Average',
  //     'Std Dev (Population)',
  //     'Std Dev (Sample)'
  //   ]
  // )
  const builderState = queryBuilderState.INTERNAL__toBasicQueryBuilderState();
  const tdsState = guaranteeType(
    builderState.fetchStructureState.implementation,
    QueryBuilderTDSState,
  );
  // result set
  if (options?.skipLimitOverfitting) {
    // To check if data incompleteness, we execute query with ->take(limit + 1)
    // Therefore, to make sure roundtrip tests will pass, we have to set the limit to be (its value - 1)
    builderState.resultState.setPreviewLimit(
      queryBuilderState.resultState.previewLimit - 1,
    );
  }
  const aggregationState = tdsState.aggregationState;
  NUMERIC_AGG_FUNC_TO_AGG_OP.forEach((val) => {
    const colState = createSimpleProjectionColumn(
      tdsState,
      propertyExpression,
      val[0],
    );
    tdsState.projectionColumns.push(colState);
    const valAggOp = guaranteeNonNullable(
      aggregationState.operators.find((t) => t instanceof val[1]),
    );
    aggregationState.changeColumnAggregateOperator(valAggOp, colState, true);
  });

  return builderState.resultState.buildExecutionRawLambda({
    useAllVersionsForMilestoning: true,
  });
};

export const buildNonNumericPreviewDataQuery = (
  queryBuilderState: QueryBuilderState,
  propertyExpression: AbstractPropertyExpression,
  options?: {
    skipLimitOverfitting: boolean;
  },
): RawLambda => {
  // Build the following query
  //
  // ClassX.all()->groupBy(
  //   [
  //     x|$x.prop
  //   ],
  //   [
  //     agg(x|$x.prop, x|$x->count())
  //   ],
  //   [
  //     'Value',
  //     'Count'
  //   ]
  // )->sort([desc('Count'), asc('Value')])->take(10)
  const builderState = queryBuilderState.INTERNAL__toBasicQueryBuilderState();
  const tdsState = guaranteeType(
    builderState.fetchStructureState.implementation,
    QueryBuilderTDSState,
  );
  const valueProjectionColState = createSimpleProjectionColumn(
    tdsState,
    propertyExpression,
    PREVIEW_DATA_NON_NUMERIC_VALUE_COLUMN_NAME,
  );
  const valueCountProjectionState = createSimpleProjectionColumn(
    tdsState,
    propertyExpression,
    PREVIEW_DATA_NON_NUMERIC_COUNT_COLUMN_NAME,
  );
  tdsState.projectionColumns = [
    valueProjectionColState,
    valueCountProjectionState,
  ];
  const distinctCountOp = guaranteeNonNullable(
    tdsState.aggregationState.operators.find(
      (t) => t instanceof QueryBuilderAggregateOperator_Count,
    ),
  );
  tdsState.aggregationState.changeColumnAggregateOperator(
    distinctCountOp,
    valueCountProjectionState,
    true,
  );
  // result set
  if (options?.skipLimitOverfitting) {
    // To check if data incompleteness, we execute query with ->take(limit + 1)
    // Therefore, to make sure roundtrip tests will pass, we have to set the limit to be (its value - 1)
    tdsState.resultSetModifierState.limit = PREVIEW_DATA_TAKE_LIMIT - 1;
  } else {
    tdsState.resultSetModifierState.limit = PREVIEW_DATA_TAKE_LIMIT;
  }

  const sortValueCount = new SortColumnState(valueCountProjectionState);
  sortValueCount.sortType = COLUMN_SORT_TYPE.DESC;
  tdsState.resultSetModifierState.sortColumns = [
    sortValueCount,
    new SortColumnState(valueProjectionColState),
  ];
  return builderState.resultState.buildExecutionRawLambda({
    useAllVersionsForMilestoning: true,
  });
};
