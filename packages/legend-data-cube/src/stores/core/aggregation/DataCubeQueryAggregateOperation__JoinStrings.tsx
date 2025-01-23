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
import { _agg_base } from '../DataCubeQuerySnapshotBuilderUtils.js';
import { isString } from '@finos/legend-shared';

export class DataCubeQueryAggregateOperation__JoinStrings extends DataCubeQueryAggregateOperation {
  override get label() {
    return 'strjoin';
  }

  override get textLabel() {
    return 'join strings';
  }

  override get description() {
    return 'join strings';
  }

  override get operator() {
    return DataCubeQueryAggregateOperator.JOIN_STRINGS;
  }

  override isCompatibleWithColumn(column: DataCubeColumn) {
    return ofDataType(column.type, [
      // NOTE: technically all data types should be suported,
      // i.e. we can use meta::pure::functions::string::makeString
      // instead, but we can't because must preserve the type of
      // the original column
      DataCubeColumnDataType.TEXT,
    ]);
  }

  override isCompatibleWithParameterValues(values: DataCubeOperationValue[]) {
    return (
      values.length === 1 &&
      values[0] !== undefined &&
      ofDataType(values[0].type, [DataCubeColumnDataType.TEXT]) &&
      !Array.isArray(values[0].value) &&
      isString(values[0].value)
    );
  }

  override generateDefaultParameterValues(
    column: DataCubeColumn,
  ): DataCubeOperationValue[] {
    return [
      {
        type: PRIMITIVE_TYPE.STRING,
        value: '',
      },
    ];
  }

  override buildAggregateColumnSnapshot(
    colSpec: V1_ColSpec,
    columnGetter: (name: string) => DataCubeColumn,
  ) {
    return this._finalizeAggregateColumnSnapshot(
      _agg_base(colSpec, DataCubeFunction.JOIN_STRINGS, columnGetter),
    );
  }

  override buildAggregateColumnExpression(column: DataCubeColumnConfiguration) {
    return _aggCol_base(
      column,
      DataCubeFunction.JOIN_STRINGS,
      column.aggregationParameters,
    );
  }
}
