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
} from '../../../../MetaModelConst.js';
import type { ConcreteFunctionDefinition } from './ConcreteFunctionDefinition.js';

const getMultiplicityString = (
  lowerBound: number,
  upperBound: number | undefined,
): string => {
  if (lowerBound === upperBound) {
    return lowerBound.toString();
  } else if (lowerBound === 0 && upperBound === undefined) {
    return FUNCTION_SIGNATURE_MULTIPLICITY_INFINITE_TOKEN;
  }
  return `$${lowerBound}_${upperBound ?? 'MANY'}$`;
};

export const getFunctionSignature = (
  func: ConcreteFunctionDefinition,
): string =>
  `_${func.parameters
    .map(
      (p) =>
        `${p.type.value.name}_${getMultiplicityString(
          p.multiplicity.lowerBound,
          p.multiplicity.upperBound,
        )}_`,
    )
    .join('_')}_${func.returnType.value.name}_${getMultiplicityString(
    func.returnMultiplicity.lowerBound,
    func.returnMultiplicity.upperBound,
  )}_`;

export const getFunctionName = (
  func: ConcreteFunctionDefinition,
  name: string,
): string => name.substring(0, name.indexOf(getFunctionSignature(func)));

export const getFunctionNameWithPath = (
  func: ConcreteFunctionDefinition,
): string => func.package?.path + ELEMENT_PATH_DELIMITER + func.functionName;
