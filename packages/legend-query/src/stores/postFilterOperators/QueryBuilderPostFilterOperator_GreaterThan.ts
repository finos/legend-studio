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
  PRIMITIVE_TYPE,
  type Type,
  type ValueSpecification,
} from '@finos/legend-graph';
import {
  guaranteeNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { SUPPORTED_FUNCTIONS } from '../../QueryBuilder_Const';
import {
  buildPrimitiveInstanceValue,
  getNonCollectionValueSpecificationType,
} from '../QueryBuilderOperatorsHelper';
import { QueryBuilderPostFilterOperator } from '../QueryBuilderPostFilterOperator';
import type { PostFilterConditionState } from '../QueryBuilderPostFilterState';
import { generateDefaultValueForPrimitiveType } from '../QueryBuilderValueSpecificationBuilderHelper';

export class QueryBuilderPostFilterOperator_GreaterThan extends QueryBuilderPostFilterOperator {
  getLabel(): string {
    return '>';
  }
  getPureFunction(): SUPPORTED_FUNCTIONS {
    return SUPPORTED_FUNCTIONS.GREATER_THAN;
  }
  isCompatibleWithType(type: Type): boolean {
    return (
      [
        PRIMITIVE_TYPE.NUMBER,
        PRIMITIVE_TYPE.INTEGER,
        PRIMITIVE_TYPE.DECIMAL,
        PRIMITIVE_TYPE.FLOAT,
        PRIMITIVE_TYPE.DATE,
        PRIMITIVE_TYPE.STRICTDATE,
        PRIMITIVE_TYPE.DATETIME,
      ] as string[]
    ).includes(type.path);
  }

  isCompatibleWithConditionValue(
    postFilterConditionState: PostFilterConditionState,
  ): boolean {
    const lhsType = guaranteeNonNullable(
      postFilterConditionState.columnState.getReturnType(),
    );
    const type = postFilterConditionState.value
      ? getNonCollectionValueSpecificationType(postFilterConditionState.value)
      : undefined;
    const numericPrimitiveTypes = [
      PRIMITIVE_TYPE.NUMBER,
      PRIMITIVE_TYPE.INTEGER,
      PRIMITIVE_TYPE.DECIMAL,
      PRIMITIVE_TYPE.FLOAT,
    ] as string[];

    // When changing the return type for LHS, the RHS value should be adjusted accordingly.
    // Numeric value is handled loosely because execution still works if a float (RHS) is assigned to an Integer property(LHS), etc.
    return (
      type !== undefined &&
      ((numericPrimitiveTypes.includes(type.path) &&
        numericPrimitiveTypes.includes(lhsType.path)) ||
        type === lhsType ||
        lhsType.isSuperType(type))
    );
  }
  getDefaultFilterConditionValue(
    postFilterConditionState: PostFilterConditionState,
  ): ValueSpecification {
    const propertyType = postFilterConditionState.columnState.getReturnType();
    switch (propertyType?.path) {
      case PRIMITIVE_TYPE.NUMBER:
      case PRIMITIVE_TYPE.DECIMAL:
      case PRIMITIVE_TYPE.FLOAT:
      case PRIMITIVE_TYPE.INTEGER:
      case PRIMITIVE_TYPE.DATE:
      case PRIMITIVE_TYPE.STRICTDATE:
      case PRIMITIVE_TYPE.DATETIME: {
        return buildPrimitiveInstanceValue(
          postFilterConditionState.postFilterState.queryBuilderState,
          propertyType.path,
          generateDefaultValueForPrimitiveType(propertyType.path),
        );
      }
      default:
        throw new UnsupportedOperationError(
          `Can't get default value for post-filter operator '${this.getLabel()}' when the LHS property is of type '${
            propertyType?.path
          }'`,
        );
    }
  }
}
