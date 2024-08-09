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
  DATE_FORMAT,
  DATE_TIME_FORMAT,
  matchFunctionName,
  PRIMITIVE_TYPE,
  V1_AppliedFunction,
} from '@finos/legend-graph';
import { DataCubeQueryFilterOperation } from './DataCubeQueryFilterOperation.js';
import {
  assertTrue,
  formatDate,
  guaranteeType,
  returnUndefOnError,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import type {
  DataCubeQuerySnapshotColumn,
  DataCubeQuerySnapshotFilterCondition,
} from '../DataCubeQuerySnapshot.js';
import {
  DataCubeFunction,
  DataCubeQueryFilterOperator,
  type DataCubeOperationValue,
} from '../DataCubeQueryEngine.js';

function generateDefaultFilterConditionPrimitiveTypeValue(
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

function ofType(
  type: string,
  targetTypes: ('string' | 'number' | 'boolean' | 'date')[],
) {
  switch (type) {
    case PRIMITIVE_TYPE.STRING:
      return targetTypes.includes('string');
    case PRIMITIVE_TYPE.BOOLEAN:
      return targetTypes.includes('boolean');
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.DECIMAL:
    case PRIMITIVE_TYPE.FLOAT:
    case PRIMITIVE_TYPE.INTEGER:
      return targetTypes.includes('number');
    case PRIMITIVE_TYPE.DATE:
    case PRIMITIVE_TYPE.STRICTDATE:
    case PRIMITIVE_TYPE.DATETIME:
      return targetTypes.includes('date');
    default:
      return false;
  }
}

function unwrapNotExpression(
  func: V1_AppliedFunction,
): V1_AppliedFunction | undefined {
  return returnUndefOnError(() => {
    assertTrue(matchFunctionName(func.function, DataCubeFunction.NOT));
    return guaranteeType(func.parameters[0], V1_AppliedFunction);
  });
}

// export const buildPostFilterConditionState = (
//   postFilterState: QueryBuilderPostFilterState,
//   expression: FunctionExpression,
//   operatorFunctionFullPath: string | undefined,
//   operator: QueryBuilderPostFilterOperator,
// ): PostFilterConditionState | undefined => {
//   let postConditionState: PostFilterConditionState | undefined;
//   const tdsColumnGetter = operator.getTDSColumnGetter();
//   if (
//     tdsColumnGetter &&
//     expression instanceof AbstractPropertyExpression &&
//     expression.func.value.name === tdsColumnGetter
//   ) {
//     const columnState = findProjectionColumnState(expression, postFilterState);
//     postConditionState = new PostFilterConditionState(
//       postFilterState,
//       columnState,
//       operator,
//     );
//     return postConditionState;
//   } else if (
//     operatorFunctionFullPath &&
//     matchFunctionName(expression.functionName, operatorFunctionFullPath)
//   ) {
//     assertTrue(
//       expression.parametersValues.length === 2,
//       `Can't process ${extractElementNameFromPath(
//         operatorFunctionFullPath,
//       )}() expression: ${extractElementNameFromPath(
//         operatorFunctionFullPath,
//       )}() expects '1 argument'`,
//     );

//     // get projection column
//     const tdsColumnPropertyExpression = guaranteeType(
//       expression.parametersValues[0],
//       AbstractPropertyExpression,
//       `Can't process ${extractElementNameFromPath(
//         operatorFunctionFullPath,
//       )}() expression: expects property expression in lambda body`,
//     );
//     const columnState = findProjectionColumnState(
//       tdsColumnPropertyExpression,
//       postFilterState,
//     );

//     // get operation value specification
//     const rightSide = expression.parametersValues[1];

//     // create state
//     postConditionState = new PostFilterConditionState(
//       postFilterState,
//       columnState,
//       operator,
//     );

//     buildPostFilterConditionValueState(rightSide, postConditionState);

//     //post checks
//     assertTrue(
//       operator.isCompatibleWithPostFilterColumn(postConditionState),
//       `Can't process ${extractElementNameFromPath(
//         operatorFunctionFullPath,
//       )}() expression: property is not compatible with post-filter operator`,
//     );
//     assertTrue(
//       operator.isCompatibleWithConditionValue(postConditionState),
//       `Operator '${operator.getLabel()}' not compatible with value specification ${rightSide?.toString()}`,
//     );
//   }
//   return postConditionState;
// };

export class DataCubeQueryFilterOperation__Equals extends DataCubeQueryFilterOperation {
  override get label() {
    return '=';
  }

  override get description(): string {
    return 'equals';
  }

  override get operator(): string {
    return DataCubeQueryFilterOperator.EQUAL;
  }

  isCompatibleWithColumn(column: DataCubeQuerySnapshotColumn) {
    return ofType(column.type, ['string', 'number', 'date']);
  }

  isCompatibleWithValue(value: DataCubeOperationValue) {
    return (
      ofType(value.type, ['string', 'number', 'date']) &&
      value.value !== undefined &&
      !Array.isArray(value.value)
    );
  }

  generateDefaultValue(column: DataCubeQuerySnapshotColumn) {
    return {
      type: column.type,
      value: generateDefaultFilterConditionPrimitiveTypeValue(column.type),
    };
  }

  buildConditionSnapshot(expression: V1_AppliedFunction) {
    return undefined;
  }

  buildConditionExpression(condition: DataCubeQuerySnapshotFilterCondition) {
    return undefined;
  }
}
