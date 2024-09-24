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
  DATE_FORMAT,
  ELEMENT_PATH_DELIMITER,
  MULTIPLICITY_INFINITE,
  MULTIPLICITY_RANGE_OPERATOR,
  PRIMITIVE_TYPE,
} from '../MetaModelConst.js';
import type { ConcreteFunctionDefinition } from '../metamodel/pure/packageableElements/function/ConcreteFunctionDefinition.js';
import type { Type } from '../metamodel/pure/packageableElements/domain/Type.js';
import { PrimitiveType } from '../metamodel/pure/packageableElements/domain/PrimitiveType.js';
import { Enumeration } from '../metamodel/pure/packageableElements/domain/Enumeration.js';
import { formatDate } from '@finos/legend-shared';
import type { PureModel } from '../PureModel.js';
import type { FunctionAnalysisInfo } from './FunctionAnalysis.js';

export enum PURE_ELEMENT_NAME {
  PROFILE = 'Profile',
  CLASS = 'Class',
  ENUMERATION = 'Enum',
  MEASURE = 'Measure',
  ASSOCIATION = 'Association',
  FUNCTION = 'function',
  MAPPING = 'Mapping',
  FLAT_DATA = 'FlatData',
  DATABASE = 'Database',
  SERVICE = 'Service',
  RUNTIME = 'Runtime',
  CONNECTION = 'Connection',
  FILE_GENERATION = 'FileGeneration',
  GENERATION_SPECIFICATION = 'GenerationSpecification',
  DATA_ELEMENT = 'Data',
  EXECUTION_ENVIRONMENT = 'ExecutionEnvironment',
}

export enum PURE_CONNECTION_NAME {
  JSON_MODEL_CONNECTION = 'JsonModelConnection',
  XML_MODEL_CONNECTION = 'XmlModelConnection',
  MODEL_CHAIN_CONNECTION = 'ModelChainConnection',
  RELATIONAL_DATABASE_CONNECTION = 'RelationalDatabaseConnection',
  FLAT_DATA_CONNECTION = 'FlatDataConnection',
}

export enum PURE_PARSER {
  PURE = 'Pure',
  CONNECTION = 'Connection',
  RUNTIME = 'Runtime',
  MAPPING = 'Mapping',
  SERVICE = 'Service',
  FLATDATA = 'FlatData',
  RELATIONAL = 'Relational',
  GENERATION_SPECIFICATION = 'GenerationSpecification',
  FILE_GENERATION_SPECIFICATION = 'FileGeneration',
  DATA = 'Data',
}

export const generateMultiplicityString = (
  lowerBound: number,
  upperBound: number | undefined,
): string => {
  if (lowerBound === upperBound) {
    return lowerBound.toString();
  } else if (lowerBound === 0 && upperBound === undefined) {
    return MULTIPLICITY_INFINITE;
  }
  return `${lowerBound}${MULTIPLICITY_RANGE_OPERATOR}${
    upperBound ?? MULTIPLICITY_INFINITE
  }`;
};

export const generateDefaultParameterValueForType = (
  type: Type | undefined,
  index: number,
): string | number | boolean => {
  if (!type) {
    return `param${index}`;
  }
  if (type instanceof Enumeration) {
    return type.values.length !== 0
      ? `${type.path}.${type.values[0]?.name}`
      : `param${index}`;
  } else if (type instanceof PrimitiveType) {
    switch (type.name) {
      case PRIMITIVE_TYPE.BOOLEAN:
        return true;
      case PRIMITIVE_TYPE.FLOAT:
      case PRIMITIVE_TYPE.DECIMAL:
        return 0.0;
      case PRIMITIVE_TYPE.NUMBER:
      case PRIMITIVE_TYPE.INTEGER:
        return 0;
      case PRIMITIVE_TYPE.DATE:
      case PRIMITIVE_TYPE.STRICTDATE:
        return `%${formatDate(new Date(), DATE_FORMAT)}`;
      case PRIMITIVE_TYPE.DATETIME:
        return `%${formatDate(new Date(), DATE_FORMAT)}T00:00:00`;
      case PRIMITIVE_TYPE.STRICTTIME:
        return `%00:00:00`;
      case PRIMITIVE_TYPE.STRING:
        return "''";
      default:
        return `param${index}`;
    }
  }
  // Other non-primitive types, e.g. Class
  return `param${index}`;
};

export const generateFunctionCallString = (
  element: ConcreteFunctionDefinition,
  options?: {
    graph: PureModel;
    functionInfo: FunctionAnalysisInfo | undefined;
  },
): string => {
  let lambdaString = '';
  const funcionInfo = options?.functionInfo;
  const parameterLength = funcionInfo
    ? funcionInfo.parameterInfoList.length
    : element.parameters.length;
  const functionName = funcionInfo?.functionName ?? element.functionName;
  if (parameterLength > 0) {
    for (let i = 0; i < parameterLength; i++) {
      let paramType;
      if (funcionInfo?.parameterInfoList[i] !== undefined) {
        paramType = options?.graph.getType(
          funcionInfo.parameterInfoList[i]!.type,
        );
      } else {
        paramType = element.parameters[i]?.type.value;
      }
      const separator = i !== parameterLength - 1 ? ', ' : '';
      lambdaString =
        lambdaString +
        generateDefaultParameterValueForType(paramType, i) +
        separator;
    }
  }
  return `${element.package?.path}${ELEMENT_PATH_DELIMITER}${functionName}(${lambdaString})`;
};

export const generateFunctionPrettyName = (
  element: ConcreteFunctionDefinition,
  options?: {
    fullPath?: boolean;
    spacing?: boolean;
    notIncludeParamName?: boolean;
  },
): string =>
  `${
    options?.fullPath ? `${element.package?.path}${ELEMENT_PATH_DELIMITER}` : ''
  }${element.functionName}(${element.parameters
    .map((p) =>
      !options?.notIncludeParamName
        ? `${p.name}: ${p.type.value.name}[${generateMultiplicityString(
            p.multiplicity.lowerBound,
            p.multiplicity.upperBound,
          )}]`
        : `${p.type.value.name}[${generateMultiplicityString(
            p.multiplicity.lowerBound,
            p.multiplicity.upperBound,
          )}]`,
    )
    .join(', ')}): ${
    element.returnType.value.name
  }[${generateMultiplicityString(
    element.returnMultiplicity.lowerBound,
    element.returnMultiplicity.upperBound,
  )}]`.replaceAll(/\s*/gu, (val) => {
    if (options?.spacing) {
      return val;
    }
    return '';
  });
