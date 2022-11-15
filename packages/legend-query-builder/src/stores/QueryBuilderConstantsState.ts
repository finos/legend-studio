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
import { QUERY_BUILDER_HASH_STRUCTURE } from '../graphManager/QueryBuilderHashUtils.js';
import type { QueryBuilderState } from './QueryBuilderState.js';
import { buildDefaultInstanceValue } from './shared/ValueSpecificationEditorHelper.js';
import { valueSpecification_setGenericType } from './shared/ValueSpecificationModifierHelper.js';

export class QueryBuilderConstantExpressionState implements Hashable {
  readonly queryBuilderState: QueryBuilderState;
  readonly uuid = uuid();
  variable: VariableExpression;
  value: ValueSpecification;

  constructor(
    queryBuilderState: QueryBuilderState,
    variable: VariableExpression,
    value: ValueSpecification,
  ) {
    makeObservable(this, {
      variable: observable,
      value: observable,
      setValueSpec: action,
      changeValSpecType: action,
    });
    this.queryBuilderState = queryBuilderState;
    this.value = observe_ValueSpecification(
      value,
      this.queryBuilderState.observableContext,
    );
    observe_ValueSpecification(
      variable,
      this.queryBuilderState.observableContext,
    );
    this.variable = variable;
  }

  changeValSpecType(type: Type): void {
    const variableType = this.value.genericType?.value.rawType;
    if (variableType !== type) {
      try {
        const valSpec = buildDefaultInstanceValue(
          this.queryBuilderState.graphManagerState.graph,
          type,
        );
        this.setValueSpec(valSpec);
      } catch (error) {
        assertErrorThrown(error);
        this.queryBuilderState.applicationStore.notifyError(error.message);
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
      this.queryBuilderState.observableContext,
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

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_HASH_STRUCTURE.CONSTANT_EXPRESSION_STATE,
      this.variable.name,
      this.value,
    ]);
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
      QUERY_BUILDER_HASH_STRUCTURE.CONSTANT_STATE,
      hashArray(this.constants),
    ]);
  }
}
