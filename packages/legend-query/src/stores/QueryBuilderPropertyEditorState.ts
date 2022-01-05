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
  Class,
  type AbstractProperty,
  type Enum,
  type PureModel,
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
  getMilestoneTemporalStereotype,
  MILESTONING_STEROTYPES,
} from '@finos/legend-graph';
import { generateDefaultValueForPrimitiveType } from './QueryBuilderValueSpecificationBuilderHelper';
import type { QueryBuilderState } from './QueryBuilderState';

export const prettyPropertyName = (value: string): string =>
  isCamelCase(value) ? prettyCamelCase(value) : prettyCONSTName(value);

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
  return propertyNameChain.map(prettyPropertyName).join('/');
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
  graph: PureModel,
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
            PRIMITIVE_TYPE.LATESTDATE,
          ] as string[]
        ).includes(_type.name)
      ) {
        const primitiveInstanceValue = new PrimitiveInstanceValue(
          genericType,
          parameter.multiplicity,
        );
        if (_type.name !== PRIMITIVE_TYPE.LATESTDATE) {
          primitiveInstanceValue.values = [
            generateDefaultValueForPrimitiveType(_type.name as PRIMITIVE_TYPE),
          ];
        }
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
    const querySetupState =
      derivedPropertyExpressionState.queryBuilderState.querySetupState;
    let isMilestonedProperty = false;
    let temporalTarget;
    if (
      derivedPropertyExpressionState.propertyExpression.func.genericType.value
        .rawType instanceof Class &&
      derivedPropertyExpressionState.propertyExpression.func.owner
        ._generatedMilestonedProperties.length !== 0
    ) {
      temporalTarget = getMilestoneTemporalStereotype(
        derivedPropertyExpressionState.propertyExpression.func.genericType.value
          .rawType,
        derivedPropertyExpressionState.queryBuilderState.graphManagerState
          .graph,
      );
      isMilestonedProperty = true;
      const name = derivedPropertyExpressionState.propertyExpression.func.name;
      derivedPropertyExpressionState.propertyExpression.func =
        guaranteeNonNullable(
          derivedPropertyExpressionState.propertyExpression.func.owner._generatedMilestonedProperties.find(
            (e) => e.name === name,
          ),
        );
    } else {
      isMilestonedProperty = false;
    }
    if (isMilestonedProperty) {
      switch (temporalTarget) {
        case MILESTONING_STEROTYPES.BUSINESS_TEMPORAL: {
          let parameter;
          if (querySetupState.classMilestoningTemporalValues.length === 0) {
            derivedPropertyExpressionState.queryBuilderState.buildMilestoningParameter(
              'businessDate',
            );
            parameter = querySetupState.classMilestoningTemporalValues[0];
          } else if (
            querySetupState.classMilestoningTemporalValues.length === 1
          ) {
            if (
              querySetupState.classMilestoningTemporalValues[0] instanceof
                VariableExpression &&
              querySetupState.classMilestoningTemporalValues[0].name ===
                'businessDate'
            ) {
              parameter = querySetupState.classMilestoningTemporalValues[0];
            } else {
              derivedPropertyExpressionState.queryBuilderState.buildMilestoningParameter(
                'businessDate',
              );
              parameter = querySetupState.classMilestoningTemporalValues[1];
            }
          } else {
            parameter = querySetupState.classMilestoningTemporalValues[1];
          }
          propertyArguments.push(guaranteeNonNullable(parameter));
          break;
        }
        case MILESTONING_STEROTYPES.PROCESSING_TEMPORAL: {
          let parameter;
          if (querySetupState.classMilestoningTemporalValues.length === 0) {
            derivedPropertyExpressionState.queryBuilderState.buildMilestoningParameter(
              'processingDate',
            );
            parameter = querySetupState.classMilestoningTemporalValues[0];
          } else if (
            querySetupState.classMilestoningTemporalValues.length === 1
          ) {
            if (
              querySetupState.classMilestoningTemporalValues[0] instanceof
                VariableExpression &&
              querySetupState.classMilestoningTemporalValues[0].name ===
                'processingDate'
            ) {
              parameter = querySetupState.classMilestoningTemporalValues[0];
            } else {
              const businessTemporalMilestoningParameter = guaranteeNonNullable(
                querySetupState.classMilestoningTemporalValues[0],
              );
              querySetupState.setClassMilestoningTemporalValues([]);
              derivedPropertyExpressionState.queryBuilderState.buildMilestoningParameter(
                'processingDate',
              );
              parameter = querySetupState.classMilestoningTemporalValues[0];
              querySetupState.addClassMilestoningTemporalValues(
                businessTemporalMilestoningParameter,
              );
            }
          } else {
            parameter = querySetupState.classMilestoningTemporalValues[0];
          }
          propertyArguments.push(guaranteeNonNullable(parameter));
          break;
        }
        case MILESTONING_STEROTYPES.BITEMPORAL: {
          let parameters;
          if (querySetupState.classMilestoningTemporalValues.length === 0) {
            derivedPropertyExpressionState.queryBuilderState.buildMilestoningParameter(
              'processingDate',
            );
            derivedPropertyExpressionState.queryBuilderState.buildMilestoningParameter(
              'businessDate',
            );
            parameters = querySetupState.classMilestoningTemporalValues;
          } else if (
            querySetupState.classMilestoningTemporalValues.length === 1
          ) {
            if (
              querySetupState.classMilestoningTemporalValues[0] instanceof
                VariableExpression &&
              querySetupState.classMilestoningTemporalValues[0].name ===
                'processingDate'
            ) {
              derivedPropertyExpressionState.queryBuilderState.buildMilestoningParameter(
                'businessDate',
              );
              parameters = querySetupState.classMilestoningTemporalValues;
            } else {
              const businessTemporalMilestoningParameter = guaranteeNonNullable(
                querySetupState.classMilestoningTemporalValues[0],
              );
              querySetupState.setClassMilestoningTemporalValues([]);
              derivedPropertyExpressionState.queryBuilderState.buildMilestoningParameter(
                'processingDate',
              );
              querySetupState.addClassMilestoningTemporalValues(
                businessTemporalMilestoningParameter,
              );
              parameters = querySetupState.classMilestoningTemporalValues;
            }
          } else {
            parameters = querySetupState.classMilestoningTemporalValues;
          }
          propertyArguments.push(guaranteeNonNullable(parameters[0]));
          propertyArguments.push(guaranteeNonNullable(parameters[1]));
          break;
        }
        default:
      }
    } else {
      propertyArguments.push(
        argument ??
          new CollectionInstanceValue(
            graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ZERO),
          ),
      );
    }
  });
  // for arguments of types we don't support, we will fill them with `[]`
  // which in Pure is equivalent to `null` in other languages
  derivedPropertyExpressionState.propertyExpression.setParametersValues([
    guaranteeNonNullable(
      derivedPropertyExpressionState.propertyExpression.parametersValues[0],
    ),
    ...propertyArguments,
  ]);
};

export class QueryBuilderDerivedPropertyExpressionState {
  queryBuilderState: QueryBuilderState;
  path: string;
  title: string;
  propertyExpression: AbstractPropertyExpression;
  derivedProperty: DerivedProperty;
  parameters: VariableExpression[] = [];

  constructor(
    queryBuilderState: QueryBuilderState,
    propertyExpression: AbstractPropertyExpression,
  ) {
    this.path = getPropertyPath(propertyExpression);
    this.title = getPropertyChainName(propertyExpression);
    this.propertyExpression = propertyExpression;
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
    fillDerivedPropertyArguments(
      this,
      queryBuilderState.graphManagerState.graph,
    );
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
        if (
          isRequired &&
          paramValue.genericType?.value.rawType.name !==
            PRIMITIVE_TYPE.LATESTDATE &&
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

export class QueryBuilderPropertyExpressionState {
  queryBuilderState: QueryBuilderState;
  path: string;
  title: string;
  propertyExpression: AbstractPropertyExpression;

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
    this.propertyExpression = propertyExpression;
    this.path = getPropertyPath(propertyExpression);
    this.title = getPropertyChainName(propertyExpression);
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
      if (
        currentExpression.func.genericType.value.rawType instanceof Class &&
        currentExpression.func.owner._generatedMilestonedProperties.length !== 0
      ) {
        const name = currentExpression.func.name;
        currentExpression.func = guaranteeNonNullable(
          currentExpression.func.owner._generatedMilestonedProperties.find(
            (e) => e.name === name,
          ),
        );
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
    }
    this.requiresExistsHandling = requiresExistsHandling;
    this.derivedPropertyExpressionStates = result.reverse();
  }
}
