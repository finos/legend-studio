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

import type { DataCubeColumn } from '../model/DataCubeColumn.js';
import { DataCubeQueryAggregateOperation } from './DataCubeQueryAggregateOperation.js';
import {
  DataCubeQueryAggregateOperator,
  DataCubeColumnDataType,
  DataCubeFunction,
  ofDataType,
  type DataCubeOperationValue,
} from '../DataCubeQueryEngine.js';
import { _aggCol_base } from '../DataCubeQueryBuilderUtils.js';
import type { DataCubeColumnConfiguration } from '../model/DataCubeConfiguration.js';
import type { V1_ColSpec } from '@finos/legend-graph';
import { _agg_base } from '../DataCubeSnapshotBuilderUtils.js';

export class DataCubeQueryAggregateOperation__Average extends DataCubeQueryAggregateOperation {
  override get label() {
    return 'avg';
  }

  override get textLabel() {
    return 'average';
  }

  override get description() {
    return 'average';
  }

  override get operator() {
    return DataCubeQueryAggregateOperator.AVERAGE;
  }

  override isCompatibleWithColumn(column: DataCubeColumn) {
    return ofDataType(column.type, [DataCubeColumnDataType.NUMBER]);
  }

  override isCompatibleWithParameterValues(values: DataCubeOperationValue[]) {
    return !values.length;
  }

  override generateDefaultParameterValues(
    column: DataCubeColumn,
  ): DataCubeOperationValue[] {
    return [];
  }

  override buildAggregateColumnSnapshot(
    colSpec: V1_ColSpec,
    columnGetter: (name: string) => DataCubeColumn,
  ) {
    return this._finalizeAggregateColumnSnapshot(
      _agg_base(colSpec, DataCubeFunction.AVERAGE, columnGetter),
    );
  }

  override buildAggregateColumnExpression(column: DataCubeColumnConfiguration) {
    return _aggCol_base(column, DataCubeFunction.AVERAGE);
  }
}
