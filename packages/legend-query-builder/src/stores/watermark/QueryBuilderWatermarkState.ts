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
  type ValueSpecification,
  type VariableExpression,
  observe_ValueSpecification,
  GenericTypeExplicitReference,
  GenericType,
  PrimitiveInstanceValue,
  PrimitiveType,
} from '@finos/legend-graph';
import { type Hashable, hashArray } from '@finos/legend-shared';
import { makeObservable, observable, action, computed } from 'mobx';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from '../QueryBuilderStateHashUtils.js';
import type { QueryBuilderState } from '../QueryBuilderState.js';
import { isValueExpressionReferencedInValue } from '../QueryBuilderValueSpecificationHelper.js';

export class QueryBuilderWatermarkState implements Hashable {
  readonly queryBuilderState: QueryBuilderState;
  value?: ValueSpecification | undefined;

  constructor(queryBuilderState: QueryBuilderState) {
    makeObservable(this, {
      value: observable,
      setValue: action,
      hashCode: computed,
    });

    this.queryBuilderState = queryBuilderState;
  }

  getDefaultValue(): ValueSpecification {
    const watermarkConstant = new PrimitiveInstanceValue(
      GenericTypeExplicitReference.create(
        new GenericType(PrimitiveType.STRING),
      ),
    );

    return watermarkConstant;
  }

  setValue(val: ValueSpecification | undefined): void {
    this.value = val
      ? observe_ValueSpecification(val, this.queryBuilderState.observerContext)
      : undefined;
  }

  isVariableUsed(variable: VariableExpression): boolean {
    return this.value
      ? isValueExpressionReferencedInValue(variable, this.value)
      : false;
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.WATERMARK_STATE,
      this.value ?? '',
    ]);
  }
}
