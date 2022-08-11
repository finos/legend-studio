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
import { guaranteeNonNullable } from '@finos/legend-shared';
import { QueryBuilderAggregateOperator_Average } from './aggregateOperators/QueryBuilderAggregateOperator_Average.js';
import { QueryBuilderAggregateOperator_Count } from './aggregateOperators/QueryBuilderAggregateOperator_Count.js';
import { QueryBuilderAggregateOperator_DistinctCount } from './aggregateOperators/QueryBuilderAggregateOperator_DistinctCount.js';
import { QueryBuilderAggregateOperator_Max } from './aggregateOperators/QueryBuilderAggregateOperator_Max.js';
import { QueryBuilderAggregateOperator_Min } from './aggregateOperators/QueryBuilderAggregateOperator_Min.js';
import { QueryBuilderAggregateOperator_StdDev_Population } from './aggregateOperators/QueryBuilderAggregateOperator_StdDev_Population.js';
import { QueryBuilderAggregateOperator_StdDev_Sample } from './aggregateOperators/QueryBuilderAggregateOperator_StdDev_Sample.js';
import { QueryBuilderAggregateOperator_Sum } from './aggregateOperators/QueryBuilderAggregateOperator_Sum.js';
import type { QueryBuilderAggregateOperator } from './QueryBuilderAggregationState.js';
import { QueryBuilderSimpleProjectionColumnState } from './QueryBuilderProjectionState.js';
import { QueryBuilderState } from './QueryBuilderState.js';
import {
  COLUMN_SORT_TYPE,
  SortColumnState,
} from './QueryResultSetModifierState.js';

export type QueryBuilderPreviewData = {
  columns: string[];
  rows: { values: (string | number)[] }[];
};

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

const createProjectionColumn = (
  queryBuilderState: QueryBuilderState,
  propertyExpression: AbstractPropertyExpression,
  columnName: string,
): QueryBuilderSimpleProjectionColumnState => {
  const col = new QueryBuilderSimpleProjectionColumnState(
    queryBuilderState.fetchStructureState.projectionState,
    propertyExpression,
    false,
  );
  col.setColumnName(columnName);
  return col;
};

const createQueryBuilderState = (
  queryBuilderState: QueryBuilderState,
): QueryBuilderState => {
  const builderState = new QueryBuilderState(
    queryBuilderState.applicationStore,
    queryBuilderState.graphManagerState,
    queryBuilderState.mode,
  );
  builderState.querySetupState = queryBuilderState.querySetupState;
  return builderState;
};

export const buildNumericPreviewDataQuery = (
  queryBuilderState: QueryBuilderState,
  propertyExpression: AbstractPropertyExpression,
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
  const builderState = createQueryBuilderState(queryBuilderState);
  const projectionState = builderState.fetchStructureState.projectionState;
  const aggregationState = projectionState.aggregationState;
  NUMERIC_AGG_FUNC_TO_AGG_OP.forEach((val) => {
    const colState = createProjectionColumn(
      builderState,
      propertyExpression,
      val[0],
    );
    projectionState.columns.push(colState);
    const valAggOp = guaranteeNonNullable(
      aggregationState.operators.find((t) => t instanceof val[1]),
    );
    aggregationState.changeColumnAggregateOperator(valAggOp, colState);
  });

  return builderState.resultState.buildExecutionRawLambda();
};

export const buildNonNumericPreviewDataQuery = (
  queryBuilderState: QueryBuilderState,
  propertyExpression: AbstractPropertyExpression,
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
  const builderState = createQueryBuilderState(queryBuilderState);
  const valueProjectionColState = createProjectionColumn(
    builderState,
    propertyExpression,
    PREVIEW_DATA_NON_NUMERIC_VALUE_COLUMN_NAME,
  );
  const valueCountProjectionState = createProjectionColumn(
    builderState,
    propertyExpression,
    PREVIEW_DATA_NON_NUMERIC_COUNT_COLUMN_NAME,
  );
  builderState.fetchStructureState.projectionState.columns = [
    valueProjectionColState,
    valueCountProjectionState,
  ];
  const distinctCountOp = guaranteeNonNullable(
    builderState.fetchStructureState.projectionState.aggregationState.operators.find(
      (t) => t instanceof QueryBuilderAggregateOperator_Count,
    ),
  );
  builderState.fetchStructureState.projectionState.aggregationState.changeColumnAggregateOperator(
    distinctCountOp,
    valueCountProjectionState,
  );
  // result set
  builderState.resultSetModifierState.limit = PREVIEW_DATA_TAKE_LIMIT;
  const sortValueCount = new SortColumnState(
    builderState,
    valueCountProjectionState,
  );
  sortValueCount.sortType = COLUMN_SORT_TYPE.DESC;
  builderState.resultSetModifierState.sortColumns = [
    sortValueCount,
    new SortColumnState(builderState, valueProjectionColState),
  ];
  return builderState.resultState.buildExecutionRawLambda();
};
