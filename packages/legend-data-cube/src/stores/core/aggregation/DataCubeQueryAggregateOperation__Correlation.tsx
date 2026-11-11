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

export class DataCubeQueryAggregateOperation__Correlation extends DataCubeQueryTwoColumnAggregateOperation {
  override get label() {
    return 'corr';
  }

  override get textLabel() {
    return 'correlation';
  }

  override get description() {
    return 'correlation with the values of another column';
  }

  override get operator() {
    return DataCubeQueryAggregateOperator.CORRELATION;
  }

  override get hasFractionalResult() {
    return true;
  }

  protected override get aggregateFunction() {
    return DataCubeFunction.CORRELATION;
  }

  protected override get parameterLabel() {
    return 'with';
  }

  override isCompatibleWithColumn(column: DataCubeColumn) {
    return ofDataType(column.type, [DataCubeColumnDataType.NUMBER]);
  }
}
