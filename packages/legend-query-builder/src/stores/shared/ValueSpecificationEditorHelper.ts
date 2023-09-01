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
  type PureModel,
  type GraphManagerState,
  type ValueSpecification,
  type Type,
  type Enum,
  type ObserverContext,
  type RawLambda,
  type RelationalDataType,
  VariableExpression,
  CollectionInstanceValue,
  Enumeration,
  EnumValueExplicitReference,
  EnumValueInstanceValue,
  GenericType,
  GenericTypeExplicitReference,
  getEnumValue,
  PrimitiveInstanceValue,
  PrimitiveType,
  PRIMITIVE_TYPE,
  INTERNAL__PropagatedValue,
  SimpleFunctionExpression,
  LambdaFunction,
  FunctionType,
  PackageableElementExplicitReference,
  Multiplicity,
  CORE_PURE_PATH,
  buildRawLambdaFromLambdaFunction,
  getValueSpecificationReturnType,
  Timestamp as RelationalDateTypeTimestamp,
  Date as RelationalDateTypeDate,
  BigInt as RelationalDateTypeBigInt,
  SmallInt as RelationalDateTypeSmallInt,
  TinyInt as RelationalDateTypeTinyInt,
  Integer as RelationalDateTypeInteger,
  Float as RelationalDateTypeFloat,
  Double as RelationalDateTypeDouble,
  Decimal as RelationalDateTypeDecimal,
  Float as RelationalDateTypeNumeric,
  VarChar as RelationalDateTypeVarChar,
  Char as RelationalDateTypeChar,
} from '@finos/legend-graph';
import {
  Randomizer,
  UnsupportedOperationError,
  returnUndefOnError,
} from '@finos/legend-shared';
import { generateDefaultValueForPrimitiveType } from '../QueryBuilderValueSpecificationHelper.js';
import {
  instanceValue_setValues,
  valueSpecification_setGenericType,
} from './ValueSpecificationModifierHelper.js';
import {
  QUERY_BUILDER_PURE_PATH,
  QUERY_BUILDER_SUPPORTED_FUNCTIONS,
} from '../../graph/QueryBuilderMetaModelConst.js';

export const createSupportedFunctionExpression = (
  supportedFuncName: string,
  expectedReturnType: Type,
): SimpleFunctionExpression => {
  const funcExpression = new SimpleFunctionExpression(supportedFuncName);
  valueSpecification_setGenericType(
    funcExpression,
    GenericTypeExplicitReference.create(new GenericType(expectedReturnType)),
  );
  return funcExpression;
};
export const buildPrimitiveInstanceValue = (
  graph: PureModel,
  type: PRIMITIVE_TYPE,
  value: unknown,
  observerContext: ObserverContext,
): PrimitiveInstanceValue => {
  const instance = new PrimitiveInstanceValue(
    GenericTypeExplicitReference.create(
      new GenericType(graph.getPrimitiveType(type)),
    ),
  );
  instanceValue_setValues(instance, [value], observerContext);
  return instance;
};

const createMockPrimitiveValueSpecificationHelper = (
  primitiveTypeName: string,
  graph: PureModel,
  observerContext: ObserverContext,
  options?: {
    useCurrentDateDependentFunctions?: boolean;
  },
): ValueSpecification => {
  if (options?.useCurrentDateDependentFunctions) {
    if (
      primitiveTypeName === PRIMITIVE_TYPE.DATE ||
      primitiveTypeName === PRIMITIVE_TYPE.DATETIME
    ) {
      return createSupportedFunctionExpression(
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.NOW,
        PrimitiveType.DATETIME,
      );
    } else if (primitiveTypeName === PRIMITIVE_TYPE.STRICTDATE) {
      return createSupportedFunctionExpression(
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TODAY,
        PrimitiveType.STRICTDATE,
      );
    }
  }
  if (primitiveTypeName === PRIMITIVE_TYPE.DATE) {
    return buildPrimitiveInstanceValue(
      graph,
      PRIMITIVE_TYPE.STRICTDATE,
      generateDefaultValueForPrimitiveType(primitiveTypeName),
      observerContext,
    );
  }
  return buildPrimitiveInstanceValue(
    graph,
    primitiveTypeName as PRIMITIVE_TYPE,
    generateDefaultValueForPrimitiveType(primitiveTypeName as PRIMITIVE_TYPE),
    observerContext,
  );
};

export const relationalDataTypeToPrimitiveType = (
  relationalDataType: RelationalDataType,
): PrimitiveType => {
  if (relationalDataType instanceof RelationalDateTypeDate) {
    return PrimitiveType.STRICTDATE;
  }
  if (relationalDataType instanceof RelationalDateTypeTimestamp) {
    return PrimitiveType.DATETIME;
  }
  if (
    relationalDataType instanceof RelationalDateTypeVarChar ||
    relationalDataType instanceof RelationalDateTypeChar
  ) {
    return PrimitiveType.STRING;
  }
  if (
    relationalDataType instanceof RelationalDateTypeNumeric ||
    relationalDataType instanceof RelationalDateTypeSmallInt ||
    relationalDataType instanceof RelationalDateTypeTinyInt ||
    relationalDataType instanceof RelationalDateTypeDecimal ||
    relationalDataType instanceof RelationalDateTypeBigInt ||
    relationalDataType instanceof RelationalDateTypeFloat ||
    relationalDataType instanceof RelationalDateTypeDouble ||
    relationalDataType instanceof RelationalDateTypeInteger
  ) {
    return PrimitiveType.NUMBER;
  }
  return PrimitiveType.STRING;
};

export const createMockPrimitiveValueSpecificationFromRelationalDataType = (
  relationalDataType: RelationalDataType,
  graph: PureModel,
  observerContext: ObserverContext,
): ValueSpecification => {
  let primitiveTypeName: string = PRIMITIVE_TYPE.STRING;
  if (relationalDataType instanceof RelationalDateTypeDate) {
    primitiveTypeName = PRIMITIVE_TYPE.STRICTDATE;
  }
  if (relationalDataType instanceof RelationalDateTypeTimestamp) {
    primitiveTypeName = PRIMITIVE_TYPE.DATETIME;
  }
  if (
    relationalDataType instanceof RelationalDateTypeVarChar ||
    relationalDataType instanceof RelationalDateTypeChar
  ) {
    primitiveTypeName = PRIMITIVE_TYPE.STRING;
  }
  if (
    relationalDataType instanceof RelationalDateTypeNumeric ||
    relationalDataType instanceof RelationalDateTypeSmallInt ||
    relationalDataType instanceof RelationalDateTypeTinyInt ||
    relationalDataType instanceof RelationalDateTypeDecimal ||
    relationalDataType instanceof RelationalDateTypeBigInt ||
    relationalDataType instanceof RelationalDateTypeFloat ||
    relationalDataType instanceof RelationalDateTypeDouble ||
    relationalDataType instanceof RelationalDateTypeInteger
  ) {
    primitiveTypeName = PRIMITIVE_TYPE.NUMBER;
  }
  return createMockPrimitiveValueSpecificationHelper(
    primitiveTypeName,
    graph,
    observerContext,
  );
};

export const createMockPrimitiveValueSpecification = (
  primitiveType: PrimitiveType,
  graph: PureModel,
  observerContext: ObserverContext,
  options?: {
    useCurrentDateDependentFunctions?: boolean;
  },
): ValueSpecification =>
  createMockPrimitiveValueSpecificationHelper(
    primitiveType.name,
    graph,
    observerContext,
    options,
  );

export const createMockEnumerationProperty = (
  enumeration: Enumeration,
): string =>
  new Randomizer().getRandomItemInCollection(enumeration.values)?.name ?? '';

export const buildDefaultInstanceValue = (
  graph: PureModel,
  type: Type,
  observerContext: ObserverContext,
): ValueSpecification => {
  const path = type.path;
  switch (path) {
    case PRIMITIVE_TYPE.STRING:
    case PRIMITIVE_TYPE.BOOLEAN:
    case PRIMITIVE_TYPE.STRICTDATE:
    case PRIMITIVE_TYPE.DATETIME:
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.DECIMAL:
    case PRIMITIVE_TYPE.FLOAT:
    case PRIMITIVE_TYPE.BINARY:
    case PRIMITIVE_TYPE.BYTE:
    case PRIMITIVE_TYPE.INTEGER: {
      return buildPrimitiveInstanceValue(
        graph,
        path,
        generateDefaultValueForPrimitiveType(path),
        observerContext,
      );
    }
    case PRIMITIVE_TYPE.DATE: {
      return buildPrimitiveInstanceValue(
        graph,
        PRIMITIVE_TYPE.STRICTDATE,
        generateDefaultValueForPrimitiveType(path),
        observerContext,
      );
    }
    default:
      if (type instanceof Enumeration) {
        if (type.values.length > 0) {
          const enumValueInstanceValue = new EnumValueInstanceValue(
            GenericTypeExplicitReference.create(new GenericType(type)),
          );
          instanceValue_setValues(
            enumValueInstanceValue,
            [EnumValueExplicitReference.create(type.values[0] as Enum)],
            observerContext,
          );
          return enumValueInstanceValue;
        }
        throw new UnsupportedOperationError(
          `Can't get default value for enumeration since enumeration '${path}' has no value`,
        );
      }
      throw new UnsupportedOperationError(
        `Can't get default value for type'${path}'`,
      );
  }
};

export const buildDefaultEmptyStringLambda = (
  graph: PureModel,
  observerContext: ObserverContext,
): LambdaFunction => {
  const lambdaFunction = new LambdaFunction(
    new FunctionType(
      PackageableElementExplicitReference.create(
        graph.getType(CORE_PURE_PATH.ANY),
      ),
      Multiplicity.ONE,
    ),
  );
  lambdaFunction.expressionSequence[0] = buildDefaultInstanceValue(
    graph,
    PrimitiveType.STRING,
    observerContext,
  );
  return lambdaFunction;
};

export const buildDefaultEmptyStringRawLambda = (
  graphState: GraphManagerState,
  observerContext: ObserverContext,
): RawLambda =>
  buildRawLambdaFromLambdaFunction(
    buildDefaultEmptyStringLambda(graphState.graph, observerContext),
    graphState,
  );

export const generateVariableExpressionMockValue = (
  parameter: VariableExpression,
  graph: PureModel,
  observerContext: ObserverContext,
  options?: {
    useCurrentDateDependentFunctions?: boolean;
  },
): ValueSpecification | undefined => {
  const varType = parameter.genericType?.value.rawType;
  const multiplicity = parameter.multiplicity;
  /**
   *  Studio doesn't handle byte[*] as a CollectionInstanceValue but as a
   *  PrimitiveValueSpecification of type PrimitiveType.BYTE.
   *  Engine sends a Base64String transformed from byte[] by Jackson to Studio, then
   *  Studio stores this Base64String as the value of V1_CByteArray.
   */
  if (
    (!multiplicity.upperBound || multiplicity.upperBound > 1) &&
    varType &&
    varType !== PrimitiveType.BYTE
  ) {
    return new CollectionInstanceValue(
      multiplicity,
      GenericTypeExplicitReference.create(new GenericType(varType)),
    );
  }
  if (varType instanceof PrimitiveType) {
    return createMockPrimitiveValueSpecification(
      varType,
      graph,
      observerContext,
      options,
    );
  } else if (varType instanceof Enumeration) {
    const enumValueInstance = new EnumValueInstanceValue(
      GenericTypeExplicitReference.create(new GenericType(varType)),
    );
    const mock = createMockEnumerationProperty(varType);
    if (mock !== '') {
      instanceValue_setValues(
        enumValueInstance,
        [EnumValueExplicitReference.create(getEnumValue(varType, mock))],
        observerContext,
      );
    }
    return enumValueInstance;
  }
  return undefined;
};

export const getValueSpecificationStringValue = (
  valueSpecification: ValueSpecification,
): string | undefined => {
  if (valueSpecification instanceof PrimitiveInstanceValue) {
    return valueSpecification.values[0]?.toString();
  } else if (valueSpecification instanceof EnumValueInstanceValue) {
    const _enum = valueSpecification.values[0];
    return `${_enum?.ownerReference.value.name}.${_enum?.value.name}`;
  } else if (valueSpecification instanceof VariableExpression) {
    return valueSpecification.name;
  } else if (valueSpecification instanceof INTERNAL__PropagatedValue) {
    return getValueSpecificationStringValue(valueSpecification.getValue());
  } else if (valueSpecification instanceof SimpleFunctionExpression) {
    return valueSpecification.functionName;
  } else if (valueSpecification instanceof CollectionInstanceValue) {
    return valueSpecification.values
      .map(getValueSpecificationStringValue)
      .join(',');
  }
  return undefined;
};

export const valueSpecReturnTDS = (
  val: ValueSpecification,
  graph: PureModel,
): boolean => {
  const retunType = returnUndefOnError(() =>
    getValueSpecificationReturnType(val),
  );
  const tdsType = returnUndefOnError(() =>
    graph.getClass(QUERY_BUILDER_PURE_PATH.TDS_TABULAR_DATASET),
  );
  const tdsRowType = returnUndefOnError(() =>
    graph.getClass(QUERY_BUILDER_PURE_PATH.TDS_ROW),
  );
  // FIXME: we sometimes return tds row when tds is the return type of the lambda. We do this to properly build post filters.
  // We should fix this to properly build filter functions after a tds function
  return Boolean(
    retunType && tdsType && (retunType === tdsType || retunType === tdsRowType),
  );
};
