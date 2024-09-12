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
  DataCubeQuerySnapshotAggregateColumn,
  DataCubeQuerySnapshotColumn,
} from '../DataCubeQuerySnapshot.js';
import { type V1_ColSpec } from '@finos/legend-graph';
import { DataCubeQueryAggregateOperation } from './DataCubeQueryAggregateOperation.js';
import {
  DataCubeAggregateOperator,
  DataCubeColumnDataType,
  DataCubeFunction,
  ofDataType,
} from '../DataCubeQueryEngine.js';
import { _aggCol_basic } from '../DataCubeQueryBuilderUtils.js';

export class DataCubeQueryAggregateOperation__StdDevSample extends DataCubeQueryAggregateOperation {
  override get label() {
    return 'std (sample)';
  }

  override get textLabel() {
    return 'standard deviation (sample)';
  }

  override get description() {
    return 'standard deviation (sample)';
  }

  override get operator(): string {
    return DataCubeAggregateOperator.STANDARD_DEVIATION_SAMPLE;
  }

  isCompatibleWithColumn(column: DataCubeQuerySnapshotColumn) {
    return ofDataType(column.type, [DataCubeColumnDataType.NUMBER]);
  }

  buildAggregateColumnSnapshot(aggColSpec: V1_ColSpec) {
    // TODO: @akphi - implement this for roundtrip testing
    return undefined;
  }

  buildAggregateColumn(aggCol: DataCubeQuerySnapshotAggregateColumn) {
    return _aggCol_basic(aggCol, DataCubeFunction.STANDARD_DEVIATION_SAMPLE);
  }
}
