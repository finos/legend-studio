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

import { action, computed, makeObservable, observable } from 'mobx';
import {
  getNullableFirstElement,
  guaranteeNonNullable,
  guaranteeType,
  type Hashable,
  hashArray,
  prettyCONSTName,
} from '@finos/legend-shared';
import {
  Class,
  type AbstractProperty,
  type Enum,
  type ValueSpecification,
  type PureModel,
  AbstractPropertyExpression,
  DerivedProperty,
  Enumeration,
  EnumValueExplicitReference,
  EnumValueInstanceValue,
  InstanceValue,
  PrimitiveInstanceValue,
  type PRIMITIVE_TYPE,
  VariableExpression,
  SimpleFunctionExpression,
  matchFunctionName,
  TYPE_CAST_TOKEN,
  observe_AbstractPropertyExpression,
  GenericTypeExplicitReference,
  GenericType,
  PropertyExplicitReference,
  PrimitiveType,
} from '@finos/legend-graph';
import {
  createNullishValue,
  generateDefaultValueForPrimitiveType,
} from './QueryBuilderValueSpecificationHelper.js';
import type { QueryBuilderState } from './QueryBuilderState.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../graphManager/QueryBuilderSupportedFunctions.js';
import { QUERY_BUILDER_HASH_STRUCTURE } from '../graphManager/QueryBuilderHashUtils.js';
import {
  propertyExpression_setFunc,
  functionExpression_setParametersValues,
  instanceValue_setValues,
} from './shared/ValueSpecificationModifierHelper.js';
import { generateMilestonedPropertyParameterValue } from './milestoning/QueryBuilderMilestoningHelper.js';

export const getPropertyChainName = (
  propertyExpression: AbstractPropertyExpression,
  humanizePropertyName: boolean,
): string => {
  const propertyNameDecorator = humanizePropertyName
    ? prettyCONSTName
    : (val: string): string => val;
  const chunks = [propertyNameDecorator(propertyExpression.func.value.name)];
  let currentExpression: ValueSpecification | undefined = propertyExpression;
  while (currentExpression instanceof AbstractPropertyExpression) {
    currentExpression = getNullableFirstElement(
      currentExpression.parametersValues,
    );
    // Take care of chain of subtypes (a pattern that is not useful, but we want to support and potentially rectify)
    // $x.employees->subType(@Person)->subType(@Staff).department
    while (
      currentExpression instanceof SimpleFunctionExpression &&
      matchFunctionName(
        currentExpression.functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.SUBTYPE,
      )
    ) {
      const subtypeChunk = `${TYPE_CAST_TOKEN}(${propertyNameDecorator(
        currentExpression.parametersValues.filter(
          (param) => param instanceof InstanceValue,
        )[0]?.genericType?.value.rawType.name ?? '',
      )})`;
      chunks.unshift(subtypeChunk);
      currentExpression = getNullableFirstElement(
        currentExpression.parametersValues,
      );
    }
    if (currentExpression instanceof AbstractPropertyExpression) {
      chunks.unshift(propertyNameDecorator(currentExpression.func.value.name));
    }
  }
  const processedChunks: string[] = [];
  for (const chunk of chunks) {
    if (!processedChunks.length) {
      processedChunks.push(chunk);
    } else {
      const latestProcessedChunk = guaranteeNonNullable(
        processedChunks[processedChunks.length - 1],
      );
      if (latestProcessedChunk.startsWith(TYPE_CAST_TOKEN)) {
        processedChunks[
          processedChunks.length - 1
        ] = `${latestProcessedChunk}${chunk}`;
      } else {
        processedChunks.push(chunk);
      }
    }
  }
  return processedChunks.join(humanizePropertyName ? '/' : '.');
};

export const getPropertyPath = (
  propertyExpression: AbstractPropertyExpression,
): string => {
  const propertyNameChain = [propertyExpression.func.value.name];
  let currentExpression: ValueSpecification | undefined = propertyExpression;
  while (currentExpression instanceof AbstractPropertyExpression) {
    currentExpression = getNullableFirstElement(
      currentExpression.parametersValues,
    );
    if (currentExpression instanceof AbstractPropertyExpression) {
      propertyNameChain.unshift(currentExpression.func.value.name);
    }
  }
  return propertyNameChain.join('.');
};

/**
 * TODO: this currently ignores the multiplicity of the parameters
 * we should check for the multiplicity and adaptively produce
 * either simple primitive/enum instance value or collection
 */
export const generateValueSpecificationForParameter = (
  parameter: VariableExpression,
  graph: PureModel,
): ValueSpecification => {
  if (parameter.genericType) {
    const type = parameter.genericType.value.rawType;
    if (type instanceof PrimitiveType) {
      const primitiveInstanceValue = new PrimitiveInstanceValue(
        GenericTypeExplicitReference.create(
          new GenericType(
            // NOTE: since the default generated value for type Date is a StrictDate
            // we need to adjust the generic type accordingly
            // See https://github.com/finos/legend-studio/issues/1391
            type === PrimitiveType.DATE ? PrimitiveType.STRICTDATE : type,
          ),
        ),
      );
      if (type !== PrimitiveType.LATESTDATE) {
        instanceValue_setValues(primitiveInstanceValue, [
          generateDefaultValueForPrimitiveType(type.name as PRIMITIVE_TYPE),
        ]);
      }
      return primitiveInstanceValue;
    } else if (type instanceof Enumeration) {
      const enumValueInstanceValue = new EnumValueInstanceValue(
        GenericTypeExplicitReference.create(new GenericType(type)),
      );
      if (type.values.length) {
        const enumValueRef = EnumValueExplicitReference.create(
          type.values[0] as Enum,
        );
        instanceValue_setValues(enumValueInstanceValue, [enumValueRef]);
      }
      return enumValueInstanceValue;
    }
  }
  // for arguments of types we don't support, we will fill them with `[]`
  // which in Pure is equivalent to `null` in other languages
  return createNullishValue(graph);
};

const fillDerivedPropertyParameterValues = (
  derivedPropertyExpressionState: QueryBuilderDerivedPropertyExpressionState,
): void => {
  const parameterValues: ValueSpecification[] =
    derivedPropertyExpressionState.parameterValues;
  derivedPropertyExpressionState.parameters.forEach((parameter, idx) => {
    // Check if a value is already provided for a parameter
    if (idx < derivedPropertyExpressionState.parameterValues.length) {
      // Here we check if the parameter value matches with the corresponding `businessDate` or `processingDate`
      // NOTE: This will rewrite provided query since if people explicitly specified the parameter values,
      // we will overwrite them.
      parameterValues[idx] =
        generateMilestonedPropertyParameterValue(
          derivedPropertyExpressionState,
          idx,
        ) ?? guaranteeNonNullable(parameterValues[idx]);

      // Otherwise, we will just skip this parameter as value is already provided
      return;
    }
    parameterValues.push(
      generateMilestonedPropertyParameterValue(
        derivedPropertyExpressionState,
        idx,
      ) ??
        generateValueSpecificationForParameter(
          parameter,
          derivedPropertyExpressionState.queryBuilderState.graphManagerState
            .graph,
        ),
    );
  });
  functionExpression_setParametersValues(
    derivedPropertyExpressionState.propertyExpression,
    [
      guaranteeNonNullable(
        derivedPropertyExpressionState.propertyExpression.parametersValues[0],
      ),
      ...parameterValues,
    ],
    derivedPropertyExpressionState.queryBuilderState.observableContext,
  );
};

export class QueryBuilderDerivedPropertyExpressionState {
  queryBuilderState: QueryBuilderState;
  path: string;
  title: string;
  readonly propertyExpression: AbstractPropertyExpression;
  readonly derivedProperty: DerivedProperty;
  readonly parameters: VariableExpression[] = [];
  readonly propertyExpressionState: QueryBuilderPropertyExpressionState;

  constructor(
    queryBuilderState: QueryBuilderState,
    propertyExpression: AbstractPropertyExpression,
    propertyExpressionState: QueryBuilderPropertyExpressionState,
  ) {
    this.path = getPropertyPath(propertyExpression);
    this.title = getPropertyChainName(propertyExpression, true);
    this.propertyExpression = observe_AbstractPropertyExpression(
      propertyExpression,
      queryBuilderState.observableContext,
    );
    this.queryBuilderState = queryBuilderState;
    this.derivedProperty = guaranteeType(
      propertyExpression.func.value,
      DerivedProperty,
    );
    this.propertyExpressionState = propertyExpressionState;
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
    fillDerivedPropertyParameterValues(this);
  }

  get property(): AbstractProperty {
    return this.propertyExpression.func.value;
  }

  get parameterValues(): ValueSpecification[] {
    return this.propertyExpression.parametersValues.slice(1);
  }

  get isValid(): boolean {
    // TODO: more type matching logic here (take into account multiplicity, type, etc.)
    return this.parameterValues.every((paramValue) => {
      if (paramValue instanceof InstanceValue) {
        const isRequired = paramValue.multiplicity.lowerBound >= 1;
        // required and no values provided. LatestDate doesn't have any values so we skip that check for it.
        if (
          isRequired &&
          paramValue.genericType?.value.rawType !== PrimitiveType.LATESTDATE &&
          !paramValue.values.length
        ) {
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

export class QueryBuilderPropertyExpressionState implements Hashable {
  readonly queryBuilderState: QueryBuilderState;
  readonly propertyExpression: AbstractPropertyExpression;
  path: string;
  title: string;
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
    makeObservable<
      QueryBuilderPropertyExpressionState,
      'initDerivedPropertyExpressionStates'
    >(this, {
      isEditingDerivedPropertyExpression: observable,
      derivedPropertyExpressionStates: observable,
      setIsEditingDerivedProperty: action,
      initDerivedPropertyExpressionStates: action,
      isValid: computed,
      hashCode: computed,
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
        currentExpression.func.value.multiplicity.upperBound === undefined ||
        currentExpression.func.value.multiplicity.upperBound > 1
      ) {
        requiresExistsHandling = true;
      }
      // check if the property is milestoned
      if (
        currentExpression.func.value.genericType.value.rawType instanceof
          Class &&
        currentExpression.func.value._OWNER._generatedMilestonedProperties
          .length !== 0
      ) {
        const name = currentExpression.func.value.name;
        const property =
          currentExpression.func.value._OWNER._generatedMilestonedProperties.find(
            (e) => e.name === name,
          );
        if (property) {
          propertyExpression_setFunc(
            currentExpression,
            PropertyExplicitReference.create(property),
          );
        }
      }

      // Create states to hold derived properties' parameters and arguments for editing
      if (currentExpression.func.value instanceof DerivedProperty) {
        const derivedPropertyExpressionState =
          new QueryBuilderDerivedPropertyExpressionState(
            this.queryBuilderState,
            currentExpression,
            this,
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
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.SUBTYPE,
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

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_HASH_STRUCTURE.PROPERTY_EXPRESSION_STATE,
      this.propertyExpression,
    ]);
  }
}
