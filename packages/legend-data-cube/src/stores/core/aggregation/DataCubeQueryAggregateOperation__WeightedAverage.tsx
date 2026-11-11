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
  type DataCubeOperationValue,
} from '../DataCubeQueryEngine.js';
import { isString } from '@finos/legend-shared';

export class DataCubeQueryAggregateOperation__WeightedAverage extends DataCubeQueryTwoColumnAggregateOperation {
  override get label() {
    return 'wavg';
  }

  override get textLabel() {
    return 'weighted average';
  }

  override get description() {
    return 'average weighted by the values of another column';
  }

  override get operator() {
    return DataCubeQueryAggregateOperator.WEIGHTED_AVERAGE;
  }

  override get hasFractionalResult() {
    return true;
  }

  override supportsReaggregation(
    parameterValues: DataCubeOperationValue[],
    getAggregateOperator: (columnName: string) => string | undefined,
  ) {
    // the weighted average of weighted averages, weighted by the sums of the weights,
    // is the weighted average
    const weightColumnName = parameterValues[0]?.value;
    return (
      isString(weightColumnName) &&
      getAggregateOperator(weightColumnName) ===
        DataCubeQueryAggregateOperator.SUM
    );
  }

  protected override get aggregateFunction() {
    return DataCubeFunction.WEIGHTED_AVERAGE;
  }

  protected override get parameterLabel() {
    return 'weight';
  }

  override isCompatibleWithColumn(column: DataCubeColumn) {
    return ofDataType(column.type, [DataCubeColumnDataType.NUMBER]);
  }
}
