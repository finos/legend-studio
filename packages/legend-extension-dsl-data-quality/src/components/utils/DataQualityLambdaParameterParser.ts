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
import { UnsupportedOperationError } from '@finos/legend-shared';
import { SUPPORTED_TYPES } from '../constants/DataQualityConstants.js';
import {
  AbstractPropertyExpression,
  ColSpec,
  ColSpecArray,
  ColSpecArrayInstance,
  ColSpecInstanceValue,
  Multiplicity,
  observe_ColSpecArrayInstance,
  observe_ColSpecInstance,
  type ObserverContext,
  PRIMITIVE_TYPE,
  PropertyExplicitReference,
  type PureModel,
  type V1_ColSpec,
  VariableExpression,
  type AbstractProperty,
  observe_AbstractPropertyExpression,
  SimpleFunctionExpression,
  observe_SimpleFunctionExpression,
  type ValueSpecification,
  observe_VariableExpression,
} from '@finos/legend-graph';
import {
  buildPrimitiveCollectionInstanceValue,
  buildPrimitiveInstanceValue,
} from '@finos/legend-query-builder';

export type LambdaBody = {
  function?: string;
  name?: string;
  parameters: LambdaBody[];
  _type: string;
  type?: string;
  value?: string | number | boolean | ColSpec | ColSpecArray;
  values?: LambdaBody[];
  body?: LambdaBody[];
  property?: string;
};

export class DataQualityLambdaParameterParser {
  static processPrimitiveParameter(
    param: LambdaBody,
    graph: PureModel,
    observerContext: ObserverContext,
  ) {
    const { _type, value } = param;

    if (!DataQualityLambdaParameterParser.isSupportedPrimitive(_type)) {
      throw new UnsupportedOperationError(
        `Unsupported primitive type: ${_type}`,
      );
    }

    const primitiveType =
      DataQualityLambdaParameterParser.getPrimitiveType(_type);

    return buildPrimitiveInstanceValue(
      graph,
      primitiveType,
      value,
      observerContext,
    );
  }

  static processVariableDeclaration(param: { name?: string }) {
    const { name = '' } = param;
    return observe_VariableExpression(
      new VariableExpression(name, Multiplicity.ZERO),
    );
  }

  static processColSpecArray(
    param: LambdaBody,
    observerContext: ObserverContext,
  ) {
    const { value } = param;

    const colSpecArray = new ColSpecArray();
    colSpecArray.colSpecs = (value as ColSpecArray).colSpecs.map((colSpec) => {
      const colSpecValue = new ColSpec();
      colSpecValue.name = colSpec.name;
      return colSpecValue;
    });

    const colSpecArrayInstance = new ColSpecArrayInstance(
      Multiplicity.ZERO_MANY,
    );
    colSpecArrayInstance.values = [colSpecArray];

    observe_ColSpecArrayInstance(colSpecArrayInstance, observerContext);

    return colSpecArrayInstance;
  }

  static processColSpec(param: LambdaBody, observerContext: ObserverContext) {
    const { value } = param;

    const colSpecValue = new ColSpec();
    colSpecValue.name = (value as V1_ColSpec).name;

    const colSpecInstance = new ColSpecInstanceValue(Multiplicity.ZERO_MANY);
    colSpecInstance.values = [colSpecValue];

    observe_ColSpecInstance(colSpecInstance, observerContext);

    return colSpecInstance;
  }

  static processPropertyParameter(
    { property, parameters = [] }: LambdaBody,
    observerContext: ObserverContext,
  ) {
    const error = new UnsupportedOperationError(
      'Property source is not supported',
    );

    if (parameters.length > 1) {
      throw error;
    }

    const processedProperty = new AbstractPropertyExpression('');

    processedProperty.func = PropertyExplicitReference.create({
      name: property,
    } as AbstractProperty);
    processedProperty.parametersValues = parameters.map((parameter) => {
      if (parameter._type === SUPPORTED_TYPES.VAR) {
        return DataQualityLambdaParameterParser.processVariableDeclaration(
          parameter,
        );
      }

      throw error;
    });

    observe_AbstractPropertyExpression(processedProperty, observerContext);

    return processedProperty;
  }

  static processCollectionParameter(
    { values = [] }: LambdaBody,
    graph: PureModel,
    observerContext: ObserverContext,
  ) {
    const firstElementType = values[0]?._type ?? SUPPORTED_TYPES.STRING;

    if (
      !DataQualityLambdaParameterParser.isSupportedPrimitive(firstElementType)
    ) {
      throw new UnsupportedOperationError(
        `Unsupported primitive type for collection: ${firstElementType}`,
      );
    }

    const hasMultipleTypes = values.some(
      (value) => value._type !== firstElementType,
    );

    if (hasMultipleTypes) {
      throw new UnsupportedOperationError(
        'Multi-type collections are not supported. All elements must be of the same type.',
      );
    }

    return buildPrimitiveCollectionInstanceValue(
      graph,
      this.getPrimitiveType(firstElementType),
      values.map((value) => value.value),
      observerContext,
    );
  }

  static processFunctionParameter(
    { parameters = [], function: name = '' }: LambdaBody,
    graph: PureModel,
    observerContext: ObserverContext,
  ) {
    const processedParameters = parameters.map((parameter) => {
      if (
        DataQualityLambdaParameterParser.isSupportedPrimitive(parameter._type)
      ) {
        return DataQualityLambdaParameterParser.processPrimitiveParameter(
          parameter,
          graph,
          observerContext,
        );
      } else {
        switch (parameter._type) {
          case SUPPORTED_TYPES.PROPERTY:
            return DataQualityLambdaParameterParser.processPropertyParameter(
              parameter,
              observerContext,
            );
          case SUPPORTED_TYPES.COLLECTION:
            return DataQualityLambdaParameterParser.processCollectionParameter(
              parameter,
              graph,
              observerContext,
            );
          default:
            throw new UnsupportedOperationError(
              `Cannot process type: ${parameter._type}`,
            );
        }
      }
    });

    return {
      name,
      processedParameters,
    };
  }

  static createSimpleFunctionExpression(
    name: string,
    parameters: ValueSpecification[],
    observerContext: ObserverContext,
  ) {
    const processedFun = new SimpleFunctionExpression(name);
    processedFun.parametersValues = parameters;

    observe_SimpleFunctionExpression(processedFun, observerContext);
    return processedFun;
  }

  static isSupportedPrimitive(type: string) {
    switch (type) {
      case SUPPORTED_TYPES.NUMBER:
      case SUPPORTED_TYPES.STRING:
      case SUPPORTED_TYPES.FLOAT:
      case SUPPORTED_TYPES.DECIMAL:
      case SUPPORTED_TYPES.INTEGER:
        return true;
      default:
        return false;
    }
  }

  static getPrimitiveType(type: string): PRIMITIVE_TYPE {
    switch (type) {
      case SUPPORTED_TYPES.STRING:
        return PRIMITIVE_TYPE.STRING;
      case SUPPORTED_TYPES.NUMBER:
        return PRIMITIVE_TYPE.NUMBER;
      case SUPPORTED_TYPES.INTEGER:
        return PRIMITIVE_TYPE.INTEGER;
      case SUPPORTED_TYPES.FLOAT:
        return PRIMITIVE_TYPE.FLOAT;
      case SUPPORTED_TYPES.DECIMAL:
        return PRIMITIVE_TYPE.DECIMAL;
      default:
        throw new UnsupportedOperationError(
          `Unsupported primitive type: ${type}`,
        );
    }
  }

  static validateLambdaParameter({ parameters = [], body = [] }: LambdaBody) {
    if (parameters.length === 0) {
      throw new UnsupportedOperationError('Lambda parameters cannot be empty');
    }

    if (parameters.length > 1) {
      throw new UnsupportedOperationError(
        'Only single function in lambda parameters is supported',
      );
    }

    const firstParameter = parameters[0];
    if (firstParameter?._type !== SUPPORTED_TYPES.VAR) {
      throw new UnsupportedOperationError(
        `Unsupported parameter type in lambda parameter: ${firstParameter?._type}`,
      );
    }

    if (body.length === 0) {
      throw new UnsupportedOperationError('Lambda body cannot be empty');
    }

    if (body.length > 1) {
      throw new UnsupportedOperationError(
        'Only single function in lambda body is supported',
      );
    }

    const functionExpression = body[0];

    if (functionExpression?._type !== SUPPORTED_TYPES.FUNCTION) {
      throw new UnsupportedOperationError(
        `Unsupported expression type in lambda body: ${functionExpression?._type}`,
      );
    }
  }
}
