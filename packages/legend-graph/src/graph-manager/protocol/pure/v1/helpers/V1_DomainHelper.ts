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
  ELEMENT_PATH_DELIMITER,
  FUNCTION_SIGNATURE_MULTIPLICITY_INFINITE_TOKEN,
} from '../../../../../graph/MetaModelConst.js';
import type { V1_Multiplicity } from '../model/packageableElements/domain/V1_Multiplicity.js';
import type { V1_ConcreteFunctionDefinition } from '../model/packageableElements/function/V1_ConcreteFunctionDefinition.js';
import type { V1_RawVariable } from '../model/rawValueSpecification/V1_RawVariable.js';

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
  `${variable.class
    .split(ELEMENT_PATH_DELIMITER)
    .pop()}_${V1_buildFunctionMultiplicitySignature(variable.multiplicity)}_`;

export const V1_buildFunctionSignature = (
  func: V1_ConcreteFunctionDefinition,
): string => {
  const functionSignature = `_${func.parameters
    .map((p) => V1_buildFunctionParameterSignature(p))
    .join('_')}_${func.returnType
    .split(ELEMENT_PATH_DELIMITER)
    .pop()}_${V1_buildFunctionMultiplicitySignature(func.returnMultiplicity)}_`;
  return func.name.endsWith(functionSignature)
    ? func.name
    : func.name + functionSignature;
};
