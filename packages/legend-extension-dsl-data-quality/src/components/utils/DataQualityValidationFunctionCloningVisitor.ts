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
import { DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS } from '../constants/DataQualityConstants.js';
import {
  cloneAbstractPropertyExpression,
  cloneValueSpecification,
  instanceValue_setValues,
  propertyExpression_setFunc,
} from '@finos/legend-query-builder';
import {
  observe_DataQualityValidationCustomHelperFunction,
  observe_DataQualityValidationFilterCondition,
  observe_DataQualityValidationFilterFunction,
} from './DataQualityValidationFunctionObserver.js';

type AnyDataQualityValidationFunction =
  | DataQualityValidationFilterFunction
  | DataQualityValidationCustomHelperFunction;

const VISITOR_ERROR = new UnsupportedOperationError('Visitor not implemented');

export class DataQualityValidationFunctionCloningVisitor
  implements
    DataQualityValidationFunctionVisitor<AnyDataQualityValidationFunction>
{
  private newName: string;
  private cloneFactory: DataQualityValidationFunctionFactory;
  private observerContext: ObserverContext;

  constructor(
    newName: string,
    cloneFactory: DataQualityValidationFunctionFactory,
    observerContext: ObserverContext,
  ) {
    this.newName = newName;
    this.cloneFactory = cloneFactory;
    this.observerContext = observerContext;
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

  visitFilter(func: DataQualityValidationFilterFunction) {
    const clone = this.createFunctionForCloning();
    const body = func.parameters.lambda.body;
    assertType(body, DataQualityValidationFilterCondition);
    const property = body.parameters.property;
    clone.id = func.id;

    if (clone instanceof DataQualityValidationCustomHelperFunction) {
      return this.updateCustomHelpFunctionCol(clone, property.func.value.name);
    }

    (
      clone.parameters.lambda.body as DataQualityValidationFilterCondition
    ).parameters.property = cloneAbstractPropertyExpression(
      property,
      this.observerContext,
    );

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

    const clone = this.cloneFactory.createFilterFunction();
    clone.parameters.lambda.body = observe_DataQualityValidationFilterCondition(
      this.cloneFactory.createFilterChildFunction(this.newName),
    );

    return observe_DataQualityValidationFilterFunction(clone);
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
    assertType(
      clone.parameters.lambda.body,
      DataQualityValidationFilterCondition,
    );

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
    clone.parameters.lambda.body.parameters.property = property;
    return clone;
  }
}

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

  constructor(
    newName: string,
    cloneFactory: DataQualityValidationFunctionFactory,
    observerContext: ObserverContext,
  ) {
    this.newName = newName;
    this.cloneFactory = cloneFactory;
    this.observerContext = observerContext;
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
    const clone = this.cloneFactory.createFilterConditionFunction(this.newName);
    const currentColumn = func.parameters.property;

    propertyExpression_setFunc(
      clone.parameters.property,
      PropertyExplicitReference.create({
        name: currentColumn.func.value.name,
      } as AbstractProperty),
    );
    clone.parameters.property.parametersValues =
      currentColumn.parametersValues.map((param) =>
        cloneValueSpecification(param, this.observerContext),
      );

    return observe_DataQualityValidationFilterCondition(clone);
  }

  visitLogicalGroup(func: DataQualityValidationLogicalGroupFunction) {
    return func;
  }
}
