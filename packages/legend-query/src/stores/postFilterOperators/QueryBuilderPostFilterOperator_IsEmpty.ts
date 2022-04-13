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
  Enumeration,
  PRIMITIVE_TYPE,
  type SimpleFunctionExpression,
  type Type,
  type ValueSpecification,
} from '@finos/legend-graph';
import { returnUndefOnError } from '@finos/legend-shared';
import type { SUPPORTED_FUNCTIONS } from '../../QueryBuilder_Const';
import { QueryBuilderPostFilterOperator } from '../QueryBuilderPostFilterOperator';
import { buildPostFilterConditionState } from '../QueryBuilderPostFilterProcessor';
import {
  type PostFilterConditionState,
  type QueryBuilderPostFilterState,
  TDS_COLUMN_GETTERS,
} from '../QueryBuilderPostFilterState';
import { getColumnMultiplicity } from './QueryBuilderPostFilterOperatorHelper';

export class QueryBuilderPostFilterOperator_IsEmpty extends QueryBuilderPostFilterOperator {
  getLabel(): string {
    return 'is empty';
  }
  getPureFunction(): SUPPORTED_FUNCTIONS | undefined {
    return undefined;
  }

  override getTdsColumnGetter(): TDS_COLUMN_GETTERS | undefined {
    return TDS_COLUMN_GETTERS.IS_NULL;
  }

  isCompatibleWithType(type: Type): boolean {
    return (
      Object.values(PRIMITIVE_TYPE).includes(type.path as PRIMITIVE_TYPE) ||
      type instanceof Enumeration
    );
  }

  isCompatibleWithConditionValue(
    postFilterConditionState: PostFilterConditionState,
  ): boolean {
    return postFilterConditionState.value === undefined;
  }

  override isCompatibleWithPostFilterColumn(
    postFilterState: PostFilterConditionState,
  ): boolean {
    const columnType = postFilterState.columnState.getReturnType();
    if (columnType && this.isCompatibleWithType(columnType)) {
      const multiplicity = returnUndefOnError(() =>
        getColumnMultiplicity(postFilterState.columnState),
      );
      // only take multiplicity into account if its known
      if (multiplicity && multiplicity.lowerBound === 1) {
        return false;
      }
      return true;
    }
    return false;
  }

  protected getUnobservedDefaultFilterConditionValue(
    postFilterConditionState: PostFilterConditionState,
  ): ValueSpecification | undefined {
    return undefined;
  }

  override buildPostFilterConditionState(
    postFilterState: QueryBuilderPostFilterState,
    expression: SimpleFunctionExpression,
  ): PostFilterConditionState | undefined {
    return buildPostFilterConditionState(
      postFilterState,
      expression,
      this.getPureFunction(),
      this,
    );
  }
}

export class QueryBuilderPostFilterOperator_IsNotEmpty extends QueryBuilderPostFilterOperator_IsEmpty {
  override getLabel(): string {
    return `is not empty`;
  }

  override getTdsColumnGetter(): TDS_COLUMN_GETTERS | undefined {
    return TDS_COLUMN_GETTERS.IS_NOT_NULL;
  }
}
