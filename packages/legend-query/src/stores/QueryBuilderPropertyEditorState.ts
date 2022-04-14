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
  guaranteeNonNullable,
  guaranteeType,
  isCamelCase,
  prettyCamelCase,
  prettyCONSTName,
} from '@finos/legend-shared';
import {
  type AbstractProperty,
  type Enum,
  type ValueSpecification,
  TYPICAL_MULTIPLICITY_TYPE,
  CollectionInstanceValue,
  AbstractPropertyExpression,
  DerivedProperty,
  Enumeration,
  EnumValueExplicitReference,
  EnumValueInstanceValue,
  InstanceValue,
  PrimitiveInstanceValue,
  PRIMITIVE_TYPE,
  VariableExpression,
  SimpleFunctionExpression,
  matchFunctionName,
  TYPE_CAST_TOKEN,
  observe_AbstractPropertyExpression,
} from '@finos/legend-graph';
import { generateDefaultValueForPrimitiveType } from './QueryBuilderValueSpecificationBuilderHelper';
import type { QueryBuilderState } from './QueryBuilderState';
import { SUPPORTED_FUNCTIONS } from '../QueryBuilder_Const';
import { functionExpression_setParametersValues } from './QueryBuilderValueSpecificationModifierHelper';

export const prettyPropertyName = (value: string): string =>
  isCamelCase(value) ? prettyCamelCase(value) : prettyCONSTName(value);

export const getPropertyChainName = (
  propertyExpression: AbstractPropertyExpression,
  humanizePropertyName: boolean,
): string => {
  const propertyNameDecorator = humanizePropertyName
    ? prettyPropertyName
    : (val: string): string => val;
  const propertyNameChain = [
    propertyNameDecorator(propertyExpression.func.name),
  ];
  let currentExpression: ValueSpecification | undefined = propertyExpression;
  while (currentExpression instanceof AbstractPropertyExpression) {
    currentExpression = getNullableFirstElement(
      currentExpression.parametersValues,
    );
    if (currentExpression instanceof AbstractPropertyExpression) {
      propertyNameChain.unshift(
        propertyNameDecorator(currentExpression.func.name),
      );
    }
    // Take care of chains of subtype (a pattern that is not useful, but we want to support and rectify)
    // $x.employees->subType(@Person)->subType(@Staff)
    while (
      currentExpression instanceof SimpleFunctionExpression &&
      matchFunctionName(
        currentExpression.functionName,
        SUPPORTED_FUNCTIONS.SUBTYPE,
      )
    ) {
      const propertyWithSubtype = `(${TYPE_CAST_TOKEN}${propertyNameDecorator(
        currentExpression.parametersValues.filter(
          (param) => param instanceof InstanceValue,
        )[0]?.genericType?.value.rawType.name ?? '',
      )})${propertyNameDecorator(
        currentExpression.parametersValues[0] instanceof
          AbstractPropertyExpression
          ? currentExpression.parametersValues[0]?.func.name
          : '',
      )}`;
      propertyNameChain.unshift(propertyWithSubtype);
      currentExpression = getNullableFirstElement(
        currentExpression.parametersValues,
      );
    }
  }
  return propertyNameChain.join(humanizePropertyName ? '/' : '.');
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

const fillDerivedPropertyArguments = (
  derivedPropertyExpressionState: QueryBuilderDerivedPropertyExpressionState,
  queryBuilderState: QueryBuilderState,
): void => {
  const propertyArguments: ValueSpecification[] =
    derivedPropertyExpressionState.parameterValues;
  derivedPropertyExpressionState.parameters.forEach((parameter, idx) => {
    if (idx < derivedPropertyExpressionState.parameterValues.length) {
      return;
    }
    let argument: ValueSpecification | undefined;
    const genericType = parameter.genericType;
    if (genericType) {
      const _type = genericType.value.rawType;
      if (
        (
          [
            PRIMITIVE_TYPE.STRING,
            PRIMITIVE_TYPE.BOOLEAN,
            PRIMITIVE_TYPE.NUMBER,
            PRIMITIVE_TYPE.FLOAT,
            PRIMITIVE_TYPE.DECIMAL,
            PRIMITIVE_TYPE.INTEGER,
            PRIMITIVE_TYPE.DATE,
            PRIMITIVE_TYPE.STRICTDATE,
            PRIMITIVE_TYPE.DATETIME,
          ] as string[]
        ).includes(_type.name)
      ) {
        const primitiveInstanceValue = new PrimitiveInstanceValue(
          genericType,
          parameter.multiplicity,
        );
        primitiveInstanceValue.values = [
          generateDefaultValueForPrimitiveType(_type.name as PRIMITIVE_TYPE),
        ];
        argument = primitiveInstanceValue;
      } else if (_type instanceof Enumeration) {
        const enumValueInstanceValue = new EnumValueInstanceValue(
          genericType,
          parameter.multiplicity,
        );
        if (_type.values.length) {
          const enumValueRef = EnumValueExplicitReference.create(
            _type.values[0] as Enum,
          );
          enumValueInstanceValue.values = [enumValueRef];
        }
        argument = enumValueInstanceValue;
      }
    }
    // for arguments of types we don't support, we will fill them with `[]`
    // which in Pure is equivalent to `null` in other languages
    propertyArguments.push(
      argument ??
        new CollectionInstanceValue(
          queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
            TYPICAL_MULTIPLICITY_TYPE.ZERO,
          ),
        ),
    );
  });
  functionExpression_setParametersValues(
    derivedPropertyExpressionState.propertyExpression,
    [
      guaranteeNonNullable(
        derivedPropertyExpressionState.propertyExpression.parametersValues[0],
      ),
      ...propertyArguments,
    ],
    queryBuilderState.observableContext,
  );
};

export class QueryBuilderDerivedPropertyExpressionState {
  queryBuilderState: QueryBuilderState;
  path: string;
  title: string;
  readonly derivedProperty: DerivedProperty;
  readonly propertyExpression!: AbstractPropertyExpression;
  readonly parameters: VariableExpression[] = [];

  constructor(
    queryBuilderState: QueryBuilderState,
    propertyExpression: AbstractPropertyExpression,
  ) {
    this.path = getPropertyPath(propertyExpression);
    this.title = getPropertyChainName(propertyExpression, true);
    this.propertyExpression = observe_AbstractPropertyExpression(
      propertyExpression,
      queryBuilderState.observableContext,
    );
    this.queryBuilderState = queryBuilderState;
    this.derivedProperty = guaranteeType(
      propertyExpression.func,
      DerivedProperty,
    );
    // build the parameters of the derived properties
    if (Array.isArray(this.derivedProperty.parameters)) {
      this.parameters = this.derivedProperty.parameters.map((parameter) =>
        guaranteeType(
          this.queryBuilderState.graphManagerState.graphManager.buildValueSpecification(
            parameter,
            this.queryBuilderState.graphManagerState.graph,
          ),
          VariableExpression,
        ),
      );
    }
    fillDerivedPropertyArguments(this, queryBuilderState);
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
}

export class QueryBuilderPropertyExpressionState {
  queryBuilderState: QueryBuilderState;
  path: string;
  title: string;
  readonly propertyExpression: AbstractPropertyExpression;

  isEditingDerivedPropertyExpression = false;
  // Since this property is a chain expression, some link of the chain can be
  // derived property, as such, we need to keep track of the derived properties state in an array
  derivedPropertyExpressionStates: QueryBuilderDerivedPropertyExpressionState[] =
    [];
  /**
   * If at least one property in the chain is of multiplicity greater than 1,
   * the property might have multiple values and can cause row explosions.
   *
   * In other words, saying `$x.b == 1` is not quite accurate if `$x.b` is multi
   * is multi. Instead, we should do something like `$x.b->exists($x1 | $x1 == 1)`
   */
  requiresExistsHandling = false;

  constructor(
    queryBuilderState: QueryBuilderState,
    propertyExpression: AbstractPropertyExpression,
  ) {
    makeAutoObservable<
      QueryBuilderPropertyExpressionState,
      'initDerivedPropertyExpressionStates'
    >(this, {
      queryBuilderState: false,
      setIsEditingDerivedProperty: action,
      initDerivedPropertyExpressionStates: action,
    });

    this.queryBuilderState = queryBuilderState;
    this.propertyExpression = observe_AbstractPropertyExpression(
      propertyExpression,
      queryBuilderState.observableContext,
    );
    this.path = getPropertyPath(propertyExpression);
    this.title = getPropertyChainName(propertyExpression, true);
    this.initDerivedPropertyExpressionStates();
  }

  get isValid(): boolean {
    return this.derivedPropertyExpressionStates.every((e) => e.isValid);
  }

  setIsEditingDerivedProperty(val: boolean): void {
    this.isEditingDerivedPropertyExpression = val;
  }

  private initDerivedPropertyExpressionStates(): void {
    let requiresExistsHandling = false;
    const result: QueryBuilderDerivedPropertyExpressionState[] = [];
    let currentExpression: ValueSpecification | undefined =
      this.propertyExpression;
    while (currentExpression instanceof AbstractPropertyExpression) {
      // Check if the property chain can results in column that have multiple values
      if (
        currentExpression.func.multiplicity.upperBound === undefined ||
        currentExpression.func.multiplicity.upperBound > 1
      ) {
        requiresExistsHandling = true;
      }
      // Create states to hold derived properties' parameters and arguments for editing
      if (currentExpression.func instanceof DerivedProperty) {
        const derivedPropertyExpressionState =
          new QueryBuilderDerivedPropertyExpressionState(
            this.queryBuilderState,
            currentExpression,
          );
        result.push(derivedPropertyExpressionState);
      }
      currentExpression = getNullableFirstElement(
        currentExpression.parametersValues,
      );
      // Take care of chains of subtype (a pattern that is not useful, but we want to support and rectify)
      // $x.employees->subType(@Person)->subType(@Staff)
      while (
        currentExpression instanceof SimpleFunctionExpression &&
        matchFunctionName(
          currentExpression.functionName,
          SUPPORTED_FUNCTIONS.SUBTYPE,
        )
      ) {
        currentExpression = getNullableFirstElement(
          currentExpression.parametersValues,
        );
      }
    }
    this.requiresExistsHandling = requiresExistsHandling;
    this.derivedPropertyExpressionStates = result.slice().reverse();
  }
}
