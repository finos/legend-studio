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

import { action, makeAutoObservable } from 'mobx';
import {
  getNullableFirstElement,
  guaranteeType,
  isNonNullable,
  prettyCamelCase,
} from '@finos/legend-studio-shared';
import type {
  AbstractProperty,
  EditorStore,
  ValueSpecification,
} from '@finos/legend-studio';
import {
  AbstractPropertyExpression,
  DerivedProperty,
  Enumeration,
  EnumValueExplicitReference,
  EnumValueInstanceValue,
  InstanceValue,
  PrimitiveInstanceValue,
  PRIMITIVE_TYPE,
  VariableExpression,
} from '@finos/legend-studio';

export const getPropertyChainName = (
  propertyExpression: AbstractPropertyExpression,
): string => {
  const propertyNameChain = [propertyExpression.func.name];
  let currentExpression: ValueSpecification | undefined = propertyExpression;
  while (currentExpression instanceof AbstractPropertyExpression) {
    currentExpression = getNullableFirstElement(
      currentExpression.parametersValues,
    );
    if (currentExpression instanceof AbstractPropertyExpression) {
      propertyNameChain.unshift(currentExpression.func.name);
    }
  }
  return propertyNameChain.map(prettyCamelCase).join('/');
};

export const getPropertyPath = (
  propertyExpression: AbstractPropertyExpression,
): string => {
  const propertyNameChain = [propertyExpression.func.name];
  let currentExpression: ValueSpecification | undefined = propertyExpression;
  while (currentExpression instanceof AbstractPropertyExpression) {
    currentExpression = getNullableFirstElement(
      currentExpression.parametersValues,
    );
    if (currentExpression instanceof AbstractPropertyExpression) {
      propertyNameChain.unshift(currentExpression.func.name);
    }
  }
  return propertyNameChain.join('.');
};

const parameterToValueSpecification = (
  variableExpression: VariableExpression,
): ValueSpecification | undefined => {
  const genericType = variableExpression.genericType;
  if (genericType) {
    const _type = genericType.value.rawType;
    if (_type.name === PRIMITIVE_TYPE.STRING) {
      const cString = new PrimitiveInstanceValue(
        genericType,
        variableExpression.multiplicity,
      );
      cString.values = [''];
      return cString;
    } else if (_type.name === PRIMITIVE_TYPE.INTEGER) {
      const cInteger = new PrimitiveInstanceValue(
        genericType,
        variableExpression.multiplicity,
      );
      cInteger.values = [0];
      return cInteger;
    } else if (_type instanceof Enumeration) {
      const enumValueInstanceValue = new EnumValueInstanceValue(
        genericType,
        variableExpression.multiplicity,
      );
      if (_type.values.length) {
        const enumValueRef = EnumValueExplicitReference.create(_type.values[0]);
        enumValueInstanceValue.values = [enumValueRef];
      }
      return enumValueInstanceValue;
    }
  }
  return undefined;
};

export class DerivedPropertyExpressionEditorState {
  editorStore: EditorStore;
  path: string;
  title: string;
  propertyExpression: AbstractPropertyExpression;
  derivedProperty: DerivedProperty;
  parameters: VariableExpression[] = [];

  constructor(
    editorStore: EditorStore,
    propertyExpression: AbstractPropertyExpression,
    parametersBuilt?: boolean,
  ) {
    this.path = getPropertyPath(propertyExpression);
    this.title = getPropertyChainName(propertyExpression);
    this.propertyExpression = propertyExpression;
    this.editorStore = editorStore;
    this.derivedProperty = guaranteeType(
      propertyExpression.func,
      DerivedProperty,
    );
    this.initDerivedParameters();
    if (!parametersBuilt) {
      this.propertyExpression.parametersValues =
        this.propertyExpression.parametersValues.concat(
          this.buildDerivedPropertyParameters(),
        );
    }
  }

  get property(): AbstractProperty {
    return this.propertyExpression.func;
  }
  get parameterValues(): ValueSpecification[] {
    return this.propertyExpression.parametersValues.slice(1);
  }

  get isValid(): boolean {
    // TODO: more type matching logic here (take into account multiplicity, type, etc.)
    return this.parameterValues.every((paramValue) => {
      if (paramValue instanceof InstanceValue) {
        const isRequired = paramValue.multiplicity.lowerBound >= 1;
        // required and no values provided
        if (isRequired && !paramValue.values.length) {
          return false;
        }
        // more values than allowed
        if (
          paramValue.multiplicity.upperBound &&
          paramValue.values.length > paramValue.multiplicity.upperBound
        ) {
          return false;
        }
      }
      return true;
    });
  }

  initDerivedParameters(): void {
    if (Array.isArray(this.derivedProperty.parameters)) {
      const parameters = this.derivedProperty.parameters.map((parameter) =>
        guaranteeType(
          this.editorStore.graphState.graphManager.buildValueSpecificationFromJson(
            parameter,
            this.editorStore.graphState.graph,
          ),
          VariableExpression,
        ),
      );
      this.parameters = parameters;
    }
  }

  buildDerivedPropertyParameters(): ValueSpecification[] {
    return this.parameters
      .map(parameterToValueSpecification)
      .filter(isNonNullable);
  }
}

export class QueryBuilderPropertyEditorState {
  editorStore: EditorStore;
  path: string;
  title: string;
  hasDerivedPropertyInChain = false;
  propertyExpression: AbstractPropertyExpression;
  isEditingDerivedProperty = false;
  propertyExpressionStates: DerivedPropertyExpressionEditorState[] = [];
  /**
   * If at least one property in the chain is of multiplicity greater than 1,
   * the property might have multiple values and can cause row explosions.
   *
   * In other words, saying `$x.b == 1` is not quite accurate if `$x.b` is multi
   * is multi. Instead, we should do something like `$x.b->exists($x1 | $x1 == 1)`
   */
  requiresExistsHandling = false;

  constructor(
    editorStore: EditorStore,
    propertyExpression: AbstractPropertyExpression,
    propertyExpressionProcessed?: boolean,
  ) {
    makeAutoObservable(this, {
      editorStore: false,
      setIsEditingDerivedProperty: action,
      setPropertyExpression: action,
    });

    this.editorStore = editorStore;
    this.propertyExpression = propertyExpression;
    this.path = getPropertyPath(propertyExpression);
    this.title = getPropertyChainName(propertyExpression);
    this.propertyExpressionStates = this.buildPropertyExpressionStates(
      propertyExpressionProcessed,
    );
  }

  get isValid(): boolean {
    return this.propertyExpressionStates.every((e) => e.isValid);
  }

  setPropertyExpression(propertyExpression: AbstractPropertyExpression): void {
    this.propertyExpression = propertyExpression;
    this.path = getPropertyPath(propertyExpression);
    this.title = getPropertyChainName(propertyExpression);
    this.propertyExpressionStates = this.buildPropertyExpressionStates();
  }

  setIsEditingDerivedProperty(val: boolean): void {
    this.isEditingDerivedProperty = val;
  }

  buildPropertyExpressionStates(
    expressionProcessed?: boolean,
  ): DerivedPropertyExpressionEditorState[] {
    let canHaveMultipleValues = false;
    let hasDerivedPropertyInChain = false;
    const result: DerivedPropertyExpressionEditorState[] = [];
    let currentExpression: ValueSpecification | undefined =
      this.propertyExpression;
    while (currentExpression instanceof AbstractPropertyExpression) {
      // Check if the property chain can results in column that have multiple values
      if (
        currentExpression.func.multiplicity.upperBound === undefined ||
        currentExpression.func.multiplicity.upperBound > 1
      ) {
        canHaveMultipleValues = true;
      }
      if (currentExpression.func instanceof DerivedProperty) {
        hasDerivedPropertyInChain = true;
        const derivedPropertyExpressionState =
          new DerivedPropertyExpressionEditorState(
            this.editorStore,
            currentExpression,
            expressionProcessed,
          );
        result.push(derivedPropertyExpressionState);
      }
      currentExpression = getNullableFirstElement(
        currentExpression.parametersValues,
      );
    }
    this.requiresExistsHandling = canHaveMultipleValues;
    this.hasDerivedPropertyInChain = hasDerivedPropertyInChain;
    return result.reverse();
  }
}
