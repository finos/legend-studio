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

import type { DataCubeQuerySnapshotColumn } from '../DataCubeQuerySnapshot.js';
import { PRIMITIVE_TYPE } from '@finos/legend-graph';
import { DataCubeQueryAggregateOperation } from './DataCubeQueryAggregateOperation.js';
import {
  DataCubeQueryAggregateOperator,
  DataCubeColumnDataType,
  DataCubeFunction,
  ofDataType,
} from '../DataCubeQueryEngine.js';
import {
  _colSpec,
  _function,
  _functionName,
  _lambda,
  _primitiveValue,
  _property,
  _var,
} from '../DataCubeQueryBuilderUtils.js';
import type { DataCubeColumnConfiguration } from '../DataCubeConfiguration.js';

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

  isCompatibleWithColumn(column: DataCubeQuerySnapshotColumn) {
    return ofDataType(column.type, [
      // NOTE: technically all data types should be suported,
      // i.e. we can use meta::pure::functions::string::makeString
      // instead, but we can't because must preserve the type of
      // the original column
      DataCubeColumnDataType.TEXT,
    ]);
  }

  buildAggregateColumn(column: DataCubeColumnConfiguration) {
    const variable = _var();
    return _colSpec(
      column.name,
      _lambda([variable], [_property(column.name, variable)]),
      _lambda(
        [variable],
        [
          _function(_functionName(DataCubeFunction.JOIN_STRINGS), [
            variable,
            // TODO: we might want to support customizing the delimiter in this case
            _primitiveValue(PRIMITIVE_TYPE.STRING, ','),
          ]),
        ],
      ),
    );
  }
}
