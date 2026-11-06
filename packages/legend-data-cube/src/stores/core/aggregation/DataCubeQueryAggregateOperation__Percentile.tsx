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
import { PRIMITIVE_TYPE, type V1_ColSpec } from '@finos/legend-graph';
import { DataCubeQueryAggregateOperation } from './DataCubeQueryAggregateOperation.js';
import {
  DataCubeQueryAggregateOperator,
  DataCubeColumnDataType,
  DataCubeFunction,
  ofDataType,
  type DataCubeOperationValue,
} from '../DataCubeQueryEngine.js';
import type { DataCubeColumnConfiguration } from '../model/DataCubeConfiguration.js';
import { _aggCol_base } from '../DataCubeQueryBuilderUtils.js';
import { _agg_base } from '../DataCubeSnapshotBuilderUtils.js';
import { isNumber } from '@finos/legend-shared';

const DEFAULT_PERCENTILE = 0.5;

export class DataCubeQueryAggregateOperation__Percentile extends DataCubeQueryAggregateOperation {
  override get label() {
    return 'percentile';
  }

  override get textLabel() {
    return 'percentile';
  }

  override get description() {
    return 'percentile (continuous), e.g. 0.9 for the 90th percentile';
  }

  override get operator() {
    return DataCubeQueryAggregateOperator.PERCENTILE;
  }

  override supportsReaggregation(
    parameterValues: DataCubeOperationValue[],
    getAggregateOperator: (columnName: string) => string | undefined,
  ) {
    return false;
  }

  override get hasFractionalResult() {
    return true;
  }

  override isCompatibleWithColumn(column: DataCubeColumn) {
    return ofDataType(column.type, [DataCubeColumnDataType.NUMBER]);
  }

  override getParameterLabel(index: number) {
    return index === 0 ? 'percentile (0 to 1)' : undefined;
  }

  override isCompatibleWithParameterValues(values: DataCubeOperationValue[]) {
    // NOTE: the engine requires the percentile to be a float value, see
    // meta::pure::functions::math::percentile(Number[*], Float[1])
    return (
      values.length === 1 &&
      values[0] !== undefined &&
      values[0].type === PRIMITIVE_TYPE.FLOAT &&
      isNumber(values[0].value) &&
      values[0].value >= 0 &&
      values[0].value <= 1
    );
  }

  override generateDefaultParameterValues(
    column: DataCubeColumn,
  ): DataCubeOperationValue[] {
    return [
      {
        type: PRIMITIVE_TYPE.FLOAT,
        value: DEFAULT_PERCENTILE,
      },
    ];
  }

  override buildAggregateColumnSnapshot(
    colSpec: V1_ColSpec,
    columnGetter: (name: string) => DataCubeColumn,
  ) {
    return this._finalizeAggregateColumnSnapshot(
      _agg_base(colSpec, DataCubeFunction.PERCENTILE, columnGetter),
    );
  }

  override buildAggregateColumnExpression(column: DataCubeColumnConfiguration) {
    return _aggCol_base(
      column,
      DataCubeFunction.PERCENTILE,
      column.aggregationParameters,
    );
  }
}
