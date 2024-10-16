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

import {
  formatDate,
  guaranteeNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import type { DataCubeOperationValue } from '../DataCubeQueryEngine.js';
import type { DataCubeQuerySnapshotFilterCondition } from '../DataCubeQuerySnapshot.js';
import type { DataCubeColumn } from '../models/DataCubeColumn.js';
import {
  DATE_FORMAT,
  DATE_TIME_FORMAT,
  PRIMITIVE_TYPE,
  type V1_AppliedFunction,
} from '@finos/legend-graph';

// --------------------------------- UTILITIES ---------------------------------

export function generateDefaultFilterConditionPrimitiveTypeValue(
  type: string,
): unknown {
  switch (type) {
    case PRIMITIVE_TYPE.STRING:
      return '';
    case PRIMITIVE_TYPE.BOOLEAN:
      return false;
    case PRIMITIVE_TYPE.BYTE:
      return btoa('');
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.DECIMAL:
    case PRIMITIVE_TYPE.FLOAT:
    case PRIMITIVE_TYPE.INTEGER:
    case PRIMITIVE_TYPE.BINARY:
      return 0;
    case PRIMITIVE_TYPE.DATE:
    case PRIMITIVE_TYPE.STRICTDATE:
      return formatDate(new Date(Date.now()), DATE_FORMAT);
    case PRIMITIVE_TYPE.DATETIME:
      return formatDate(new Date(Date.now()), DATE_TIME_FORMAT);
    default:
      throw new UnsupportedOperationError(
        `Can't generate value for type '${type}'`,
      );
  }
}

export function getFilterOperation(
  operator: string,
  operators: DataCubeQueryFilterOperation[],
) {
  return guaranteeNonNullable(
    operators.find((op) => op.operator === operator),
    `Can't find filter operation '${operator}'`,
  );
}

// --------------------------------- CONTRACT ---------------------------------

export abstract class DataCubeQueryFilterOperation {
  abstract get label(): React.ReactNode;
  abstract get textLabel(): string;
  abstract get description(): string;
  abstract get operator(): string;

  abstract isCompatibleWithColumn(column: DataCubeColumn): boolean;
  abstract isCompatibleWithValue(value: DataCubeOperationValue): boolean;

  abstract generateDefaultValue(
    column: DataCubeColumn,
  ): DataCubeOperationValue | undefined;

  abstract buildConditionSnapshot(
    expression: V1_AppliedFunction,
  ): DataCubeQuerySnapshotFilterCondition | undefined;

  abstract buildConditionExpression(
    condition: DataCubeQuerySnapshotFilterCondition,
  ): V1_AppliedFunction | undefined;
}
