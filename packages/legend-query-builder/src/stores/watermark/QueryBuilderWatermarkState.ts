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
  observe_ValueSpecification,
  GenericTypeExplicitReference,
  GenericType,
  PRIMITIVE_TYPE,
  PrimitiveInstanceValue,
  TYPICAL_MULTIPLICITY_TYPE,
  multiplicityComparator,
  type VariableExpression,
} from '@finos/legend-graph';
import { type Hashable, hashArray } from '@finos/legend-shared';
import { makeObservable, observable, action, computed } from 'mobx';
import { QUERY_BUILDER_HASH_STRUCTURE } from '../../graphManager/QueryBuilderHashUtils.js';
import type { QueryBuilderState } from '../QueryBuilderState.js';

export class QueryBuilderWatermarkState implements Hashable {
  queryBuilderState: QueryBuilderState;
  value?: ValueSpecification | undefined;

  constructor(queryBuilderState: QueryBuilderState) {
    makeObservable(this, {
      value: observable,
      setValue: action,
      resetValue: action,
      enableWatermark: action,
      hashCode: computed,
    });

    this.queryBuilderState = queryBuilderState;
  }

  isParamaterCompatibleWithWaterMark = (
    parameter: VariableExpression,
  ): boolean => {
    const isString =
      this.queryBuilderState.graphManagerState.graph.getPrimitiveType(
        PRIMITIVE_TYPE.STRING,
      ) === parameter.genericType?.value.rawType;

    const isMultiplictyOne = multiplicityComparator(
      parameter.multiplicity,
      this.queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
        TYPICAL_MULTIPLICITY_TYPE.ONE,
      ),
    );
    return isString && isMultiplictyOne;
  };

  resetValue(): void {
    const watermarkConstant = new PrimitiveInstanceValue(
      GenericTypeExplicitReference.create(
        new GenericType(
          this.queryBuilderState.graphManagerState.graph.getPrimitiveType(
            PRIMITIVE_TYPE.STRING,
          ),
        ),
      ),
      this.queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
        TYPICAL_MULTIPLICITY_TYPE.ONE,
      ),
    );

    watermarkConstant.values = ['watermarkValue'];
    this.setValue(watermarkConstant);
  }

  enableWatermark(): void {
    if (this.value) {
      this.setValue(undefined);
    } else {
      this.resetValue();
    }
  }

  setValue(val: ValueSpecification | undefined): void {
    this.value = val
      ? observe_ValueSpecification(
          val,
          this.queryBuilderState.observableContext,
        )
      : undefined;
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_HASH_STRUCTURE.WATERMARK_STATE,
      this.value ?? '',
    ]);
  }
}
