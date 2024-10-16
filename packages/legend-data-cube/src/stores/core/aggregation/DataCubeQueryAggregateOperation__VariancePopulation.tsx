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

import type { DataCubeColumn } from '../models/DataCubeColumn.js';
import { DataCubeQueryAggregateOperation } from './DataCubeQueryAggregateOperation.js';
import {
  DataCubeQueryAggregateOperator,
  DataCubeColumnDataType,
  DataCubeFunction,
  ofDataType,
} from '../DataCubeQueryEngine.js';
import { _aggCol_basic } from '../DataCubeQueryBuilderUtils.js';
import type { DataCubeColumnConfiguration } from '../models/DataCubeConfiguration.js';

export class DataCubeQueryAggregateOperation__VariancePopulation extends DataCubeQueryAggregateOperation {
  override get label() {
    return 'var';
  }

  override get textLabel() {
    return 'variance (population)';
  }

  override get description() {
    return 'variance (population)';
  }

  override get operator() {
    return DataCubeQueryAggregateOperator.VARIANCE_POPULATION;
  }

  isCompatibleWithColumn(column: DataCubeColumn) {
    return ofDataType(column.type, [DataCubeColumnDataType.NUMBER]);
  }

  buildAggregateColumn(column: DataCubeColumnConfiguration) {
    return _aggCol_basic(column, DataCubeFunction.VARIANCE_POPULATION);
  }
}
