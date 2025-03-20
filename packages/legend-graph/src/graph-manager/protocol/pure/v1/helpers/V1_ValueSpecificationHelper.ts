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

import { V1_Variable } from '../model/valueSpecification/V1_Variable.js';
import { type V1_ValueSpecification } from '../model/valueSpecification/V1_ValueSpecification.js';
import { type V1_GenericType } from '../model/packageableElements/type/V1_GenericType.js';
import { V1_Multiplicity } from '../model/packageableElements/domain/V1_Multiplicity.js';
import { V1_GenericTypeInstance } from '../model/valueSpecification/raw/V1_GenericTypeInstance.js';

/**
 * Create a V1_ValueSpecification from a V1_Variable
 * 
 * @param variable - The V1_Variable to create a V1_ValueSpecification from
 * @returns The created V1_ValueSpecification
 */
export function V1_createValueSpecificationFromVariable(
  variable: V1_Variable,
): V1_ValueSpecification {
  // Clone the variable to avoid modifying the original
  const newVariable = new V1_Variable();
  newVariable.name = variable.name;
  newVariable.multiplicity = variable.multiplicity ?? V1_Multiplicity.ONE;
  newVariable.genericType = variable.genericType;
  
  return newVariable;
}

/**
 * Create a V1_ValueSpecification from a V1_GenericType
 * 
 * @param genericType - The V1_GenericType to create a V1_ValueSpecification from
 * @returns The created V1_ValueSpecification
 */
export function V1_createValueSpecificationFromGenericType(
  genericType: V1_GenericType,
): V1_ValueSpecification {
  const genericTypeInstance = new V1_GenericTypeInstance();
  genericTypeInstance.genericType = genericType;
  
  return genericTypeInstance;
}
