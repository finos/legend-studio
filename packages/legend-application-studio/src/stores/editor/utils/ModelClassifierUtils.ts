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
  type Type,
  Class,
  Enumeration,
  Measure,
  PrimitiveType,
  Unit,
} from '@finos/legend-graph';
import { UnsupportedOperationError } from '@finos/legend-shared';

export enum CLASS_PROPERTY_TYPE {
  CLASS = 'CLASS',
  ENUMERATION = 'ENUMERATION',
  MEASURE = 'MEASURE',
  UNIT = 'UNIT',
  PRIMITIVE = 'PRIMITIVE',
}

export const getClassPropertyType = (type: Type): CLASS_PROPERTY_TYPE => {
  if (type instanceof PrimitiveType) {
    return CLASS_PROPERTY_TYPE.PRIMITIVE;
  } else if (type instanceof Enumeration) {
    return CLASS_PROPERTY_TYPE.ENUMERATION;
  } else if (type instanceof Class) {
    return CLASS_PROPERTY_TYPE.CLASS;
  } else if (type instanceof Unit) {
    return CLASS_PROPERTY_TYPE.UNIT;
  } else if (type instanceof Measure) {
    return CLASS_PROPERTY_TYPE.MEASURE;
  }
  throw new UnsupportedOperationError(`Can't classify class property`, type);
};

export enum PACKAGEABLE_ELEMENT_TYPE {
  PRIMITIVE = 'PRIMITIVE',
  PACKAGE = 'PACKAGE',
  PROFILE = 'PROFILE',
  ENUMERATION = 'ENUMERATION',
  CLASS = 'CLASS',
  ASSOCIATION = 'ASSOCIATION',
  FUNCTION = 'FUNCTION',
  MEASURE = 'MEASURE',
  UNIT = 'UNIT',
  FLAT_DATA_STORE = 'FLAT_DATA_STORE',
  DATABASE = 'DATABASE',
  SERVICE_STORE = 'SERVICE_STORE',
  MAPPING = 'MAPPING',
  SERVICE = 'SERVICE',
  EXECUTION_ENVIRONMENT = 'EXECUTION_ENVIRONMENT',
  CONNECTION = 'CONNECTION',
  RUNTIME = 'RUNTIME',
  FILE_GENERATION = 'FILE_GENERATION',
  GENERATION_SPECIFICATION = 'GENERATION_SPECIFICATION',
  SECTION_INDEX = 'SECTION_INDEX',
  DATA = 'DATA',

  UNKNOWN = 'UNKNOWN',
}

export enum BASIC_SET_IMPLEMENTATION_TYPE {
  OPERATION = 'operation',
  INSTANCE = 'instance',
}
