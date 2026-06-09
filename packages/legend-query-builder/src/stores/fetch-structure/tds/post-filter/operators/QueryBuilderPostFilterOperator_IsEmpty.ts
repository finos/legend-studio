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
  type Type,
  type ValueSpecification,
  FunctionExpression,
  type LambdaFunction,
  Enumeration,
  PrimitiveType,
  PrecisePrimitiveType,
  SimpleFunctionExpression,
  matchFunctionName,
} from '@finos/legend-graph';
import { QueryBuilderPostFilterOperator } from '../QueryBuilderPostFilterOperator.js';
import { buildPostFilterConditionState } from '../QueryBuilderPostFilterStateBuilder.js';
import {
  type QueryBuilderPostFilterState,
  PostFilterConditionState,
  PostFilterValueSpecConditionValueState,
} from '../QueryBuilderPostFilterState.js';
import {
  QueryBuilderRelationColumnProjectionColumnState,
  QueryBuilderSimpleProjectionColumnState,
} from '../../projection/QueryBuilderProjectionColumnState.js';
import { buildPostFilterConditionExpressionHelper } from './QueryBuilderPostFilterOperatorValueSpecificationBuilder.js';
import { getTDSColumnState } from '../../QueryBuilderTDSHelper.js';
import {
  buildNotExpression,
  isPropertyExpressionChainOptional,
  unwrapNotExpression,
} from '../../../../QueryBuilderValueSpecificationHelper.js';
import { type Hashable, hashArray } from '@finos/legend-shared';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from '../../../../QueryBuilderStateHashUtils.js';
import {
  QUERY_BUILDER_SUPPORTED_FUNCTIONS,
  TDS_COLUMN_GETTER,
} from '../../../../../graph/QueryBuilderMetaModelConst.js';

export class QueryBuilderPostFilterOperator_IsEmpty
  extends QueryBuilderPostFilterOperator
  implements Hashable
{
  getLabel(): string {
    return 'is empty';
  }

  override getTDSColumnGetter(): TDS_COLUMN_GETTER | undefined {
    return TDS_COLUMN_GETTER.IS_NULL;
  }

  isCompatibleWithType(type: Type): boolean {
    return (
      type instanceof PrimitiveType ||
      type instanceof PrecisePrimitiveType ||
      type instanceof Enumeration
    );
  }

  isCompatibleWithConditionValue(
    postFilterConditionState: PostFilterConditionState,
  ): boolean {
    if (
      postFilterConditionState.rightConditionValue instanceof
        PostFilterValueSpecConditionValueState &&
      postFilterConditionState.rightConditionValue.value === undefined
    ) {
      return true;
    }
    return false;
  }

  override isCompatibleWithPostFilterColumn(
    postFilterState: PostFilterConditionState,
  ): boolean {
    const columnType = postFilterState.leftConditionValue.getColumnType();
    if (columnType && this.isCompatibleWithType(columnType)) {
      if (
        postFilterState.leftConditionValue instanceof
        QueryBuilderSimpleProjectionColumnState
      ) {
        return isPropertyExpressionChainOptional(
          postFilterState.leftConditionValue.propertyExpressionState
            .propertyExpression,
        );
      }
      if (
        postFilterState.leftConditionValue instanceof
        QueryBuilderRelationColumnProjectionColumnState
      ) {
        return (
          postFilterState.leftConditionValue.column.multiplicity.lowerBound ===
          0
        );
      }
      return true;
    }
    return false;
  }

  getDefaultFilterConditionValue(
    postFilterConditionState: PostFilterConditionState,
  ): ValueSpecification | undefined {
    return undefined;
  }

  buildPostFilterConditionExpression(
    postFilterConditionState: PostFilterConditionState,
    parentExpression: LambdaFunction | undefined,
  ): ValueSpecification | undefined {
    // For relation-column projections there is no `TDSRow.isNull` derived
    // property to lean on, so wrap the column expression in `isEmpty(...)`
    // (mirrors how the where-filter `is empty` operator builds its lambda).
    const operatorFunctionFullPath =
      postFilterConditionState.leftConditionValue instanceof
      QueryBuilderRelationColumnProjectionColumnState
        ? QUERY_BUILDER_SUPPORTED_FUNCTIONS.IS_EMPTY
        : undefined;
    return buildPostFilterConditionExpressionHelper(
      postFilterConditionState,
      this,
      operatorFunctionFullPath,
      parentExpression,
    );
  }

  buildPostFilterConditionState(
    postFilterState: QueryBuilderPostFilterState,
    expression: FunctionExpression,
  ): PostFilterConditionState | undefined {
    // Round-trip: handle the relation-column variant emitted as
    // `isEmpty($row.<col>)` (no TDSRow getter available).
    if (
      expression instanceof SimpleFunctionExpression &&
      matchFunctionName(
        expression.functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.IS_EMPTY,
      ) &&
      expression.parametersValues.length === 1 &&
      expression.parametersValues[0] instanceof FunctionExpression
    ) {
      const columnFuncExp = expression.parametersValues[0];
      const columnState = getTDSColumnState(
        postFilterState.tdsState,
        columnFuncExp.functionName,
      );
      return new PostFilterConditionState(postFilterState, columnState, this);
    }
    return buildPostFilterConditionState(
      postFilterState,
      expression,
      undefined,
      this,
    );
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.POST_FILTER_OPERATOR_IS_EMPTY,
    ]);
  }
}

export class QueryBuilderPostFilterOperator_IsNotEmpty extends QueryBuilderPostFilterOperator_IsEmpty {
  override getLabel(): string {
    return `is not empty`;
  }

  override getTDSColumnGetter(): TDS_COLUMN_GETTER | undefined {
    return TDS_COLUMN_GETTER.IS_NOT_NULL;
  }

  override buildPostFilterConditionExpression(
    postFilterConditionState: PostFilterConditionState,
    parentExpression: LambdaFunction | undefined,
  ): ValueSpecification | undefined {
    // For relation-column projections, `is not empty` has no TDS column getter
    // shortcut either; build it as `not(isEmpty(...))` instead.
    if (
      postFilterConditionState.leftConditionValue instanceof
      QueryBuilderRelationColumnProjectionColumnState
    ) {
      const inner = super.buildPostFilterConditionExpression(
        postFilterConditionState,
        parentExpression,
      );
      return inner ? buildNotExpression(inner) : undefined;
    }
    return super.buildPostFilterConditionExpression(
      postFilterConditionState,
      parentExpression,
    );
  }

  override buildPostFilterConditionState(
    postFilterState: QueryBuilderPostFilterState,
    expression: FunctionExpression,
  ): PostFilterConditionState | undefined {
    // Round-trip: unwrap a leading `not(...)` (relation-column variant) before
    // delegating to the IsEmpty builder.
    if (expression instanceof SimpleFunctionExpression) {
      const inner = unwrapNotExpression(expression);
      if (inner) {
        return super.buildPostFilterConditionState(postFilterState, inner);
      }
    }
    return super.buildPostFilterConditionState(postFilterState, expression);
  }

  override get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.POST_FILTER_OPERATOR_IS_NOT_EMPTY,
    ]);
  }
}
