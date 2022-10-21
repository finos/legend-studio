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
  type Multiplicity,
  TYPICAL_MULTIPLICITY_TYPE,
} from '@finos/legend-graph';
import { UnsupportedOperationError } from '@finos/legend-shared';
import { QueryBuilderAggregateColumnState } from '../../aggregation/QueryBuilderAggregationState.js';
import { QueryBuilderOlapGroupByColumnState } from '../../olapGroupBy/QueryBuilderOlapGroupByState.js';
import { QueryBuilderSimpleProjectionColumnState } from '../../projection/QueryBuilderProjectionColumnState.js';
import type { QueryBuilderTDSColumnState } from '../../QueryBuilderTdsColumnState.js';

export const getColumnMultiplicity = (
  columnState: QueryBuilderTDSColumnState | QueryBuilderAggregateColumnState,
): Multiplicity => {
  if (columnState instanceof QueryBuilderAggregateColumnState) {
    return columnState.aggregationState.tdsState.queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    );
  } else if (columnState instanceof QueryBuilderOlapGroupByColumnState) {
    return columnState.olapState.tdsState.queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    );
  } else if (columnState instanceof QueryBuilderSimpleProjectionColumnState) {
    return columnState.propertyExpressionState.propertyExpression.func.value
      .multiplicity;
  }
  throw new UnsupportedOperationError(
    `Can't get multiplicity for column`,
    columnState,
  );
};
