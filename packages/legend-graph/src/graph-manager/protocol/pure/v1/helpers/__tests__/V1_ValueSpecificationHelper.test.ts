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

import { test, expect } from '@jest/globals';
import { V1_Variable } from '../../model/valueSpecification/V1_Variable.js';
import { V1_Multiplicity } from '../../model/packageableElements/domain/V1_Multiplicity.js';
import { V1_GenericType } from '../../model/packageableElements/type/V1_GenericType.js';
import {
  V1_createValueSpecificationFromVariable,
  V1_createValueSpecificationFromGenericType,
} from '../V1_ValueSpecificationHelper.js';
import { V1_GenericTypeInstance } from '../../model/valueSpecification/raw/V1_GenericTypeInstance.js';
import { V1_PackageableType } from '../../model/packageableElements/type/V1_PackageableType.js';

test('V1_createValueSpecificationFromVariable', () => {
  const variable = new V1_Variable();
  variable.name = 'testVar';
  
  const multiplicity = new V1_Multiplicity(1, 1);
  variable.multiplicity = multiplicity;
  
  const genericType = new V1_GenericType();
  const packageableType = new V1_PackageableType();
  packageableType.fullPath = 'String';
  genericType.rawType = packageableType;
  variable.genericType = genericType;

  const result = V1_createValueSpecificationFromVariable(variable);
  
  expect(result).toBeInstanceOf(V1_Variable);
  expect(result.accept_ValueSpecificationVisitor).toBeDefined();
  
  const resultVar = result as V1_Variable;
  expect(resultVar.name).toBe('testVar');
  expect(resultVar.multiplicity).toEqual(multiplicity);
  expect(resultVar.genericType).toEqual(genericType);
  // Verify we created a new instance and not just returned the original
  expect(resultVar).not.toBe(variable);
});

test('V1_createValueSpecificationFromGenericType', () => {
  const genericType = new V1_GenericType();
  const packageableType = new V1_PackageableType();
  packageableType.fullPath = 'String';
  genericType.rawType = packageableType;
  
  const result = V1_createValueSpecificationFromGenericType(genericType);
  
  expect(result).toBeInstanceOf(V1_GenericTypeInstance);
  expect(result.accept_ValueSpecificationVisitor).toBeDefined();
  
  const resultInstance = result as V1_GenericTypeInstance;
  expect(resultInstance.genericType).toEqual(genericType);
});
