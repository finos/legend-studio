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
  DataCubeQueryFilterOperation,
  generateDefaultFilterConditionPrimitiveTypeValue,
} from './DataCubeQueryFilterOperation.js';
import type { DataCubeQuerySnapshotFilterCondition } from '../DataCubeQuerySnapshot.js';
import type { DataCubeColumn } from '../models/DataCubeColumn.js';
import {
  DataCubeColumnDataType,
  DataCubeFunction,
  DataCubeQueryFilterOperator,
  ofDataType,
  type DataCubeOperationValue,
} from '../DataCubeQueryEngine.js';
import {
  _function,
  _functionName,
  _property,
  _value,
} from '../DataCubeQueryBuilderUtils.js';
import { guaranteeNonNullable } from '@finos/legend-shared';

export class DataCubeQueryFilterOperation__Equal extends DataCubeQueryFilterOperation {
  override get label() {
    return '=';
  }

  override get textLabel() {
    return '=';
  }

  override get description() {
    return 'equals';
  }

  override get operator() {
    return DataCubeQueryFilterOperator.EQUAL;
  }

  isCompatibleWithColumn(column: DataCubeColumn) {
    return ofDataType(column.type, [
      DataCubeColumnDataType.TEXT,
      DataCubeColumnDataType.NUMBER,
      DataCubeColumnDataType.DATE,
      DataCubeColumnDataType.TIME,
    ]);
  }

  isCompatibleWithValue(value: DataCubeOperationValue) {
    return (
      ofDataType(value.type, [
        DataCubeColumnDataType.TEXT,
        DataCubeColumnDataType.NUMBER,
        DataCubeColumnDataType.DATE,
        DataCubeColumnDataType.TIME,
      ]) &&
      value.value !== undefined &&
      !Array.isArray(value.value)
    );
  }

  generateDefaultValue(column: DataCubeColumn) {
    return {
      type: column.type,
      value: generateDefaultFilterConditionPrimitiveTypeValue(column.type),
    };
  }

  // buildConditionSnapshot(expression: V1_AppliedFunction) {
  /** TODO: @datacube roundtrip */
  // export const buildPostFilterConditionState = (
  //   postFilterState: QueryBuilderPostFilterState,
  //   expression: FunctionExpression,
  //   operatorFunctionFullPath | undefined,
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
  //   return undefined;
  // }

  buildConditionExpression(condition: DataCubeQuerySnapshotFilterCondition) {
    return _function(_functionName(DataCubeFunction.EQUAL), [
      _property(condition.name),
      _value(guaranteeNonNullable(condition.value)),
    ]);
  }
}
