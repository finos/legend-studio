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

import { UnsupportedOperationError } from '@finos/legend-shared';
import { generateMultiplicityString } from '../../../../../graph/helpers/PureLanguageHelper.js';
import {
  ELEMENT_PATH_DELIMITER,
  FUNCTION_SIGNATURE_MULTIPLICITY_INFINITE_TOKEN,
} from '../../../../../graph/MetaModelConst.js';
import { V1_Multiplicity } from '../model/packageableElements/domain/V1_Multiplicity.js';
import type { V1_ConcreteFunctionDefinition } from '../model/packageableElements/function/V1_ConcreteFunctionDefinition.js';
import { V1_GenericType } from '../model/packageableElements/type/V1_GenericType.js';
import type { V1_RawVariable } from '../model/rawValueSpecification/V1_RawVariable.js';
import { V1_PackageableType } from '../model/packageableElements/type/V1_PackageableType.js';
import {
  V1_RelationType,
  V1_RelationTypeColumn,
} from '../model/packageableElements/type/V1_RelationType.js';
import type { V1_Type } from '../model/packageableElements/type/V1_Type.js';
import { V1_transformMultiplicity } from '../transformation/pureGraph/from/V1_CoreTransformerHelper.js';
import type { Multiplicity } from '../../../../../graph/metamodel/pure/packageableElements/domain/Multiplicity.js';

export const V1_getGenericTypeFullPath = (val: V1_GenericType): string => {
  if (val.rawType instanceof V1_PackageableType) {
    return val.rawType.fullPath;
  } else if (val.rawType instanceof V1_RelationType) {
    return V1_RelationType.NAME;
  }
  throw new UnsupportedOperationError(
    `Can't extract type path from generic type`,
  );
};

const V1_buildFunctionMultiplicitySignature = (
  multiplicity: V1_Multiplicity,
): string => {
  if (multiplicity.lowerBound === multiplicity.upperBound) {
    return multiplicity.lowerBound.toString();
  } else if (
    multiplicity.lowerBound === 0 &&
    multiplicity.upperBound === undefined
  ) {
    return FUNCTION_SIGNATURE_MULTIPLICITY_INFINITE_TOKEN;
  }
  return `$${multiplicity.lowerBound}_${
    multiplicity.upperBound ?? FUNCTION_SIGNATURE_MULTIPLICITY_INFINITE_TOKEN
  }$`;
};

const V1_buildFunctionParameterSignature = (variable: V1_RawVariable): string =>
  `${variable.genericType.rawType.fullPath
    .split(ELEMENT_PATH_DELIMITER)
    .pop()}_${V1_buildFunctionMultiplicitySignature(variable.multiplicity)}_`;

export const V1_buildFunctionSignatureSuffix = (
  func: V1_ConcreteFunctionDefinition,
): string =>
  `_${func.parameters
    .map((p) => V1_buildFunctionParameterSignature(p))
    .join('_')}_${V1_getGenericTypeFullPath(func.returnGenericType)
    .split(ELEMENT_PATH_DELIMITER)
    .pop()}_${V1_buildFunctionMultiplicitySignature(func.returnMultiplicity)}_`;

export const V1_buildFunctionSignature = (
  func: V1_ConcreteFunctionDefinition,
): string => {
  const functionSignature = V1_buildFunctionSignatureSuffix(func);
  return func.name.endsWith(functionSignature)
    ? func.name
    : func.name + functionSignature;
};

export const V1_getFunctionNameWithoutSignature = (
  func: V1_ConcreteFunctionDefinition,
): string => {
  const signatureSuffix = V1_buildFunctionSignatureSuffix(func);
  return func.name.endsWith(signatureSuffix)
    ? func.name.substring(0, func.name.length - signatureSuffix.length)
    : func.name;
};

export const V1_buildFunctionPrettyName = (
  element: V1_ConcreteFunctionDefinition,
  options?: {
    fullPath?: boolean;
    spacing?: boolean;
    notIncludeParamName?: boolean;
  },
): string =>
  `${
    options?.fullPath ? `${element.package}${ELEMENT_PATH_DELIMITER}` : ''
  }${element.name.substring(0, element.name.indexOf(V1_buildFunctionSignatureSuffix(element)))}(${element.parameters
    .map((p) =>
      !options?.notIncludeParamName
        ? `${p.name}: ${p.genericType.rawType.fullPath}[${generateMultiplicityString(
            p.multiplicity.lowerBound,
            p.multiplicity.upperBound,
          )}]`
        : `${p.genericType.rawType.fullPath}[${generateMultiplicityString(
            p.multiplicity.lowerBound,
            p.multiplicity.upperBound,
          )}]`,
    )
    .join(
      ', ',
    )}): ${V1_getGenericTypeFullPath(element.returnGenericType)}[${generateMultiplicityString(
    element.returnMultiplicity.lowerBound,
    element.returnMultiplicity.upperBound,
  )}]`.replaceAll(/\s*/gu, (val) => {
    if (options?.spacing) {
      return val;
    }
    return '';
  });

export function V1_createRelationType(
  columns: V1_RelationTypeColumn[],
): V1_RelationType {
  const relationType = new V1_RelationType();
  relationType.columns = columns;
  return relationType;
}

export function V1_createRelationTypeColumn(
  name: string,
  type: string,
): V1_RelationTypeColumn {
  const column = new V1_RelationTypeColumn();
  column.name = name;
  column.genericType = V1_createGenericTypeWithElementPath(type);
  column.multiplicity = V1_Multiplicity.ZERO_ONE;
  return column;
}

export function V1_createRelationTypeColumnWithGenericType(
  name: string,
  type: V1_GenericType,
  multiplicity: Multiplicity,
): V1_RelationTypeColumn {
  const column = new V1_RelationTypeColumn();
  column.name = name;
  column.genericType = type;
  column.multiplicity = V1_transformMultiplicity(multiplicity);
  return column;
}

export function V1_createGenericTypeWithElementPath(
  path: string,
): V1_GenericType {
  const genType = new V1_GenericType();
  const pType = new V1_PackageableType();
  pType.fullPath = path;
  genType.rawType = pType;
  return genType;
}

export function V1_createGenericTypeWithRawType(type: V1_Type): V1_GenericType {
  const genType = new V1_GenericType();
  genType.rawType = type;
  return genType;
}
