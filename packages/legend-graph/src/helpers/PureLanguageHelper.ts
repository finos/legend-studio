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

import { PRIMITIVE_TYPE } from '../MetaModelConst';
import type { ConcreteFunctionDefinition } from '../models/metamodels/pure/packageableElements/domain/ConcreteFunctionDefinition';
import type { Type } from '../models/metamodels/pure/packageableElements/domain/Type';
import { PrimitiveType } from '../models/metamodels/pure/packageableElements/domain/PrimitiveType';
import { Enumeration } from '../models/metamodels/pure/packageableElements/domain/Enumeration';
import format from 'date-fns/format';

export enum PURE_ELEMENT_NAME {
  PROFILE = 'Profile',
  CLASS = 'Class',
  ENUMERATION = 'Enum',
  MEASURE = 'Measure',
  ASSOCIATION = 'Association',
  FLAT_DATA = 'FlatData',
  MAPPING = 'Mapping',
  DATABASE = 'Database',
  FUNCTION = 'function',
  SERVICE = 'Service',
  RUNTIME = 'Runtime',
  CONNECTION = 'Connection',
  FILE_GENERATION = 'FileGeneration',
  GENERATION_SPECIFICATION = 'GenerationSpecification',
  DATA_ELEMENT = 'Data',
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
  FILE_GENERATION = 'FileGeneration',
  DATA = 'Data',
}

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
        return `%${format(new Date(), 'yyyy-MM-dd')}`;
      case PRIMITIVE_TYPE.DATETIME:
        return `%${format(new Date(), 'yyyy-MM-dd')}T00:00:00`;
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
): string => {
  let lambdaString = '';
  if (element.parameters.length > 0) {
    for (let i = 0; i < element.parameters.length; i++) {
      const paramType = element.parameters[i]?.type.value;
      const separator = i !== element.parameters.length - 1 ? ', ' : '';
      lambdaString =
        lambdaString +
        generateDefaultParameterValueForType(paramType, i) +
        separator;
    }
  }
  return `${element.path}(${lambdaString})`;
};

export const generateFunctionSignature = (
  element: ConcreteFunctionDefinition,
  fullPath: boolean,
): string =>
  `${fullPath ? element.path : element.name}(${element.parameters
    .map((p) => `${p.name}: ${p.type.value.name}[${p.multiplicity.str}]`)
    .join(', ')})` +
  `: ${element.returnType.value.name}[${element.returnMultiplicity.str}]`;
