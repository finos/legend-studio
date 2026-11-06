/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import type { DataCubeColumn } from '../model/DataCubeColumn.js';
import { DataCubeQueryTwoColumnAggregateOperation } from './DataCubeQueryTwoColumnAggregateOperation.js';
import {
  DataCubeQueryAggregateOperator,
  DataCubeColumnDataType,
  DataCubeFunction,
  ofDataType,
} from '../DataCubeQueryEngine.js';

// NOTE: the engine only supports finding the maximum by a numeric column, see
// meta::pure::functions::math::maxBy(RowMapper<T, Number>[*])
export class DataCubeQueryAggregateOperation__MaxBy extends DataCubeQueryTwoColumnAggregateOperation {
  override get label() {
    return 'max by';
  }

  override get textLabel() {
    return 'value at maximum';
  }

  override get description() {
    return 'value at the row where another column is at its maximum';
  }

  override get operator() {
    return DataCubeQueryAggregateOperator.MAX_BY;
  }

  protected override get aggregateFunction() {
    return DataCubeFunction.MAX_BY;
  }

  protected override get parameterLabel() {
    return 'by';
  }

  override isCompatibleWithColumn(column: DataCubeColumn) {
    return ofDataType(column.type, [
      DataCubeColumnDataType.TEXT,
      DataCubeColumnDataType.NUMBER,
      DataCubeColumnDataType.DATE,
      DataCubeColumnDataType.TIME,
    ]);
  }
}
