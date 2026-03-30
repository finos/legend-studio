/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  DataQualityValidationFilterFunction,
  DataQualityValidationCustomHelperFunction,
  type DataQualityValidationFunctionVisitor,
  DataQualityValidationFilterCondition,
  type DataQualityValidationLogicalGroupFunction,
  DataQualityValidationPropertyGuarantee,
} from '../utils/DataQualityValidationFunction.js';
import { assertType, UnsupportedOperationError } from '@finos/legend-shared';
import type { DataQualityValidationFunctionFactory } from './DataQualityValidationFunctionFactory.js';
import {
  AbstractPropertyExpression,
  ColSpec,
  type ColSpecInstanceValue,
  matchFunctionName,
  observe_AbstractPropertyExpression,
  type ObserverContext,
  PropertyExplicitReference,
  VariableExpression,
  type AbstractProperty,
  Multiplicity,
} from '@finos/legend-graph';
import {
  DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS,
  DATA_QUALITY_VALIDATION_PROPERTY_GUARANTEE_FUNCTIONS,
} from '../constants/DataQualityConstants.js';
import {
  cloneValueSpecification,
  instanceValue_setValues,
} from '@finos/legend-query-builder';
import {
  observe_DataQualityValidationCustomHelperFunction,
  observe_DataQualityValidationFilterCondition,
  observe_DataQualityValidationFilterFunction,
  observe_DataQualityValidationPropertyGuarantee,
} from './DataQualityValidationFunctionObserver.js';
import { dataQualityValidationLogicalGroupFunction_setParametersValues } from './DataQualityValidationFunctionModifier.js';
import { DataQualityFunctionDefaults } from './DataQualityFunctionDefaults.js';

const VISITOR_ERROR = new UnsupportedOperationError('Visitor not implemented');

export type DataQualityValidationFilterFunctions =
  | DataQualityValidationFilterCondition
  | DataQualityValidationLogicalGroupFunction;

export class DataQualityValidationFilterFunctionsCloningVisitor
  implements
    DataQualityValidationFunctionVisitor<DataQualityValidationFilterFunctions>
{
  private newName: string;
  private cloneFactory: DataQualityValidationFunctionFactory;
  private observerContext: ObserverContext;
  private readonly isCurrentColOptional: boolean;

  constructor(
    newName: string,
    cloneFactory: DataQualityValidationFunctionFactory,
    observerContext: ObserverContext,
    isCurrentColOptional: boolean,
  ) {
    this.newName = newName;
    this.cloneFactory = cloneFactory;
    this.observerContext = observerContext;
    this.isCurrentColOptional = isCurrentColOptional;
  }

  visitAssertion(): DataQualityValidationFilterFunctions {
    throw VISITOR_ERROR;
  }

  visitCustomHelper(): DataQualityValidationFilterFunctions {
    throw VISITOR_ERROR;
  }

  visitFilter(): DataQualityValidationFilterFunctions {
    throw VISITOR_ERROR;
  }

  visitFilterCondition(func: DataQualityValidationFilterCondition) {
    const currentColumn =
      func.parameters.property instanceof AbstractPropertyExpression
        ? func.parameters.property
        : func.parameters.property.parameters.property;
    const clone = this.cloneFactory.createFilterConditionFunction(
      this.newName,
      currentColumn.func.value.name,
    );

    const isPureFunctionColumnRequired =
      DataQualityFunctionDefaults.getIsPureFunctionColumnRequired(this.newName);

    if (isPureFunctionColumnRequired && this.isCurrentColOptional) {
      clone.parameters.property =
        this.cloneFactory.createPropertyGuaranteeFunction(
          DATA_QUALITY_VALIDATION_PROPERTY_GUARANTEE_FUNCTIONS.TO_ONE,
          currentColumn.func.value.name,
        );
      dataQualityValidationLogicalGroupFunction_setParametersValues(
        clone.parameters.property.parameters.property,
        currentColumn.parametersValues.map((param) =>
          cloneValueSpecification(param, this.observerContext),
        ),
      );
    } else {
      dataQualityValidationLogicalGroupFunction_setParametersValues(
        clone.parameters.property as AbstractPropertyExpression,
        currentColumn.parametersValues.map((param) =>
          cloneValueSpecification(param, this.observerContext),
        ),
      );
    }

    return observe_DataQualityValidationFilterCondition(clone);
  }

  visitPropertyGuarantee(): DataQualityValidationFilterCondition {
    throw VISITOR_ERROR;
  }

  visitLogicalGroup(func: DataQualityValidationLogicalGroupFunction) {
    return func;
  }
}

type AnyDataQualityValidationFunction =
  | DataQualityValidationFilterFunction
  | DataQualityValidationCustomHelperFunction;

export class DataQualityValidationFunctionCloningVisitor
  implements
    DataQualityValidationFunctionVisitor<AnyDataQualityValidationFunction>
{
  private newName: string;
  private cloneFactory: DataQualityValidationFunctionFactory;
  private observerContext: ObserverContext;
  private readonly isCurrentColOptional: boolean;

  constructor(
    newName: string,
    cloneFactory: DataQualityValidationFunctionFactory,
    observerContext: ObserverContext,
    isCurrentColOptional: boolean,
  ) {
    this.newName = newName;
    this.cloneFactory = cloneFactory;
    this.observerContext = observerContext;
    this.isCurrentColOptional = isCurrentColOptional;
  }

  visitAssertion(): AnyDataQualityValidationFunction {
    throw VISITOR_ERROR;
  }

  visitFilterCondition(): AnyDataQualityValidationFunction {
    throw VISITOR_ERROR;
  }

  visitLogicalGroup(): AnyDataQualityValidationFunction {
    throw VISITOR_ERROR;
  }

  visitPropertyGuarantee(): AnyDataQualityValidationFunction {
    throw VISITOR_ERROR;
  }

  visitFilter(func: DataQualityValidationFilterFunction) {
    const body = func.parameters.lambda.body;
    assertType(body, DataQualityValidationFilterCondition);
    let property = body.parameters.property;
    if (property instanceof DataQualityValidationPropertyGuarantee) {
      property = property.parameters.property;
    }
    const clone = this.createFunctionForCloning();
    clone.id = func.id;

    if (clone instanceof DataQualityValidationCustomHelperFunction) {
      return this.updateCustomHelpFunctionCol(clone, property.func.value.name);
    }

    const visitor = new DataQualityValidationFilterFunctionsCloningVisitor(
      this.newName,
      this.cloneFactory,
      this.observerContext,
      this.isCurrentColOptional,
    );

    clone.parameters.lambda.body = body.accept(visitor);
    return clone;
  }

  visitCustomHelper(func: DataQualityValidationCustomHelperFunction) {
    const clone = this.createFunctionForCloning();
    const { column, variableDeclaration } = func.parameters;

    if (clone instanceof DataQualityValidationFilterFunction) {
      return this.updateFilterFunctionCol(
        clone,
        column.values[0]?.name ?? '',
        variableDeclaration,
      );
    }

    clone.parameters.column = cloneValueSpecification(
      column,
      this.observerContext,
    ) as ColSpecInstanceValue;

    if (variableDeclaration) {
      clone.parameters.variableDeclaration = cloneValueSpecification(
        variableDeclaration,
        this.observerContext,
      ) as VariableExpression;
    }

    return clone;
  }

  private createFunctionForCloning():
    | DataQualityValidationCustomHelperFunction
    | DataQualityValidationFilterFunction {
    if (
      matchFunctionName(
        this.newName,
        Object.values(DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS),
      )
    ) {
      return observe_DataQualityValidationCustomHelperFunction(
        this.cloneFactory.createCustomHelperFunction(this.newName),
      );
    }

    return observe_DataQualityValidationFilterFunction(
      this.cloneFactory.createFilterFunction(),
    );
  }

  private updateCustomHelpFunctionCol(
    clone: DataQualityValidationCustomHelperFunction,
    col: string,
  ) {
    const colSpec = new ColSpec();
    colSpec.name = col;
    instanceValue_setValues(
      clone.parameters.column,
      [colSpec],
      this.observerContext,
    );

    return clone;
  }

  private updateFilterFunctionCol(
    clone: DataQualityValidationFilterFunction,
    col: string,
    variableRef?: VariableExpression,
  ) {
    const property = new AbstractPropertyExpression('');
    property.func = PropertyExplicitReference.create({
      name: col,
    } as AbstractProperty);
    property.parametersValues = [
      cloneValueSpecification(
        variableRef ?? new VariableExpression('row', Multiplicity.ZERO),
        this.observerContext,
      ),
    ];
    observe_AbstractPropertyExpression(property, this.observerContext);

    const body = this.cloneFactory.createFilterChildFunction(this.newName);

    if (
      DataQualityFunctionDefaults.getIsPureFunctionColumnRequired(
        this.newName,
      ) &&
      this.isCurrentColOptional
    ) {
      const guarantee = this.cloneFactory.createPropertyGuaranteeFunction(
        DATA_QUALITY_VALIDATION_PROPERTY_GUARANTEE_FUNCTIONS.TO_ONE,
      );

      guarantee.parameters.property = property;
      body.parameters.property =
        observe_DataQualityValidationPropertyGuarantee(guarantee);
    } else {
      body.parameters.property = property;
    }

    clone.parameters.lambda.body =
      observe_DataQualityValidationFilterCondition(body);

    return clone;
  }
}
