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
  type INTERNAL__UnknownValueSpecification,
  GenericType,
  GenericTypeExplicitReference,
  observe_ValueSpecification,
  VariableExpression,
} from '@finos/legend-graph';
import {
  type Hashable,
  hashArray,
  deleteEntry,
  addUniqueEntry,
  IllegalStateError,
  uuid,
  assertErrorThrown,
} from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from './QueryBuilderStateHashUtils.js';
import type { QueryBuilderState } from './QueryBuilderState.js';
import { buildDefaultInstanceValue } from './shared/ValueSpecificationEditorHelper.js';
import { valueSpecification_setGenericType } from './shared/ValueSpecificationModifierHelper.js';

export abstract class QueryBuilderConstantExpressionState implements Hashable {
  readonly queryBuilderState: QueryBuilderState;
  readonly uuid = uuid();
  variable: VariableExpression;
  value: ValueSpecification;

  constructor(
    queryBuilderState: QueryBuilderState,
    variable: VariableExpression,
    value: ValueSpecification,
  ) {
    this.queryBuilderState = queryBuilderState;
    this.variable = variable;
    this.value = value;
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.CONSTANT_EXPRESSION_STATE,
      this.variable.name,
      this.value,
    ]);
  }
}

export class QueryBuilderSimpleConstantExpressionState
  extends QueryBuilderConstantExpressionState
  implements Hashable
{
  constructor(
    queryBuilderState: QueryBuilderState,
    variable: VariableExpression,
    value: ValueSpecification,
  ) {
    super(queryBuilderState, variable, value);
    makeObservable(this, {
      variable: observable,
      value: observable,
      setValueSpec: action,
      changeValSpecType: action,
    });
    this.value = observe_ValueSpecification(
      value,
      this.queryBuilderState.observerContext,
    );
    observe_ValueSpecification(
      variable,
      this.queryBuilderState.observerContext,
    );
  }

  changeValSpecType(type: Type): void {
    const variableType = this.value.genericType?.value.rawType;
    if (variableType !== type) {
      try {
        const valSpec = buildDefaultInstanceValue(
          this.queryBuilderState.graphManagerState.graph,
          type,
          this.queryBuilderState.observerContext,
        );
        this.setValueSpec(valSpec);
      } catch (error) {
        assertErrorThrown(error);
        this.queryBuilderState.applicationStore.notificationService.notifyError(
          error.message,
        );
      }
    }
  }

  setValueSpec(value: ValueSpecification): void {
    if (value instanceof VariableExpression) {
      throw new IllegalStateError(
        'Can not assign a parameter to another parameter',
      );
    }
    this.value = observe_ValueSpecification(
      value,
      this.queryBuilderState.observerContext,
    );
    const valueSpecType = value.genericType?.value.rawType;
    if (
      valueSpecType &&
      valueSpecType !== this.variable.genericType?.value.rawType
    ) {
      valueSpecification_setGenericType(
        this.variable,
        GenericTypeExplicitReference.create(new GenericType(valueSpecType)),
      );
    }
  }
}

export class QueryBuilderCalculatedConstantExpressionState
  extends QueryBuilderConstantExpressionState
  implements Hashable
{
  declare value: INTERNAL__UnknownValueSpecification;

  constructor(
    queryBuilderState: QueryBuilderState,
    variable: VariableExpression,
    value: INTERNAL__UnknownValueSpecification,
  ) {
    super(queryBuilderState, variable, value);
    makeObservable(this, {
      variable: observable,
      value: observable,
    });
  }
}

export class QueryBuilderConstantsState implements Hashable {
  readonly queryBuilderState: QueryBuilderState;
  showConstantPanel = false;
  constants: QueryBuilderConstantExpressionState[] = [];
  selectedConstant: QueryBuilderConstantExpressionState | undefined;

  constructor(queryBuilderState: QueryBuilderState) {
    this.queryBuilderState = queryBuilderState;

    makeObservable(this, {
      constants: observable,
      showConstantPanel: observable,
      selectedConstant: observable,
      addConstant: action,
      removeConstant: action,
      setShowConstantPanel: action,
      setSelectedConstant: action,
    });
  }

  get isEmpty(): boolean {
    return !this.constants.length;
  }

  setShowConstantPanel(val: boolean): void {
    this.showConstantPanel = val;
  }

  addConstant(val: QueryBuilderConstantExpressionState): void {
    addUniqueEntry(this.constants, val);
  }

  removeConstant(val: QueryBuilderConstantExpressionState): void {
    deleteEntry(this.constants, val);
  }

  setSelectedConstant(
    val: QueryBuilderConstantExpressionState | undefined,
  ): void {
    this.selectedConstant = val;
  }

  isValueSpecConstant(value: ValueSpecification): boolean {
    if (value instanceof VariableExpression) {
      return Boolean(
        this.constants.find((v) => v.variable.name === value.name),
      );
    }
    return false;
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.CONSTANT_STATE,
      hashArray(this.constants),
    ]);
  }
}
