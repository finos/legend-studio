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
import { DataCubeQueryAggregateOperation } from './DataCubeQueryAggregateOperation.js';
import {
  DataCubeQueryAggregateOperator,
  DataCubeFunction,
  type DataCubeOperationValue,
} from '../DataCubeQueryEngine.js';
import { _aggCol_base } from '../DataCubeQueryBuilderUtils.js';
import type { DataCubeColumnConfiguration } from '../model/DataCubeConfiguration.js';
import { PRIMITIVE_TYPE, type V1_ColSpec } from '@finos/legend-graph';
import { _agg_base } from '../DataCubeSnapshotBuilderUtils.js';
import { getLiteralType } from '../DataCubeColumnTypes.js';

export class DataCubeQueryAggregateOperation__Mode extends DataCubeQueryAggregateOperation {
  override get label() {
    return 'mode';
  }

  override get textLabel() {
    return 'mode';
  }

  override get description() {
    return 'most frequent value';
  }

  override get operator() {
    return DataCubeQueryAggregateOperator.MODE;
  }

  override supportsReaggregation(
    parameterValues: DataCubeOperationValue[],
    getAggregateOperator: (columnName: string) => string | undefined,
  ) {
    return false;
  }

  override isCompatibleWithColumn(column: DataCubeColumn) {
    // NOTE: unlike other numeric aggregators, the engine only supports mode() on
    // integer and float values, i.e. not on decimal values, see
    // meta::pure::functions::math::mode(Integer[*]) and mode(Float[*])
    return [PRIMITIVE_TYPE.INTEGER, PRIMITIVE_TYPE.FLOAT].includes(
      getLiteralType(column.type) as PRIMITIVE_TYPE,
    );
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
      _agg_base(colSpec, DataCubeFunction.MODE, columnGetter),
    );
  }

  override buildAggregateColumnExpression(column: DataCubeColumnConfiguration) {
    return _aggCol_base(column, DataCubeFunction.MODE);
  }
}
