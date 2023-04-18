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

import { fromGrammarString, isValidJSONString } from '@finos/legend-shared';
import { ExpectedOutputMappingTestAssert } from '../../../graph/metamodel/pure/packageableElements/mapping/ExpectedOutputMappingTestAssert.js';
import type { InputData } from '../../../graph/metamodel/pure/packageableElements/mapping/InputData.js';
import type { DEPRECATED__MappingTest } from '../../../graph/metamodel/pure/packageableElements/mapping/DEPRECATED__MappingTest.js';
import type { MappingTestAssert } from '../../../graph/metamodel/pure/packageableElements/mapping/MappingTestAssert.js';
import { FlatDataInputData } from '../../../graph/metamodel/pure/packageableElements/store/flatData/mapping/FlatDataInputData.js';
import {
  ObjectInputData,
  ObjectInputType,
} from '../../../graph/metamodel/pure/packageableElements/store/modelToModel/mapping/ObjectInputData.js';
import { RelationalInputData } from '../../../graph/metamodel/pure/packageableElements/store/relational/mapping/RelationalInputData.js';
import { isStubbed_PackageableElement } from '../../../graph/helpers/creator/DomainModelCreatorHelper.js';
import { isStubbed_RawLambda } from '../../../graph/helpers/creator/RawValueSpecificationCreatorHelper.js';
import { DEPRECATED__validate_FlatDataInputData } from './STO_FlatData_ValidationHelper.js';
import { DEPRECATED__validation_RelationalInputData } from './STO_Relational_ValidationHelper.js';
import {
  type ValidationIssue,
  createValidationError,
} from './ValidationHelper.js';

/**
 * @deprecated
 */
export const DEPRECATED__validate_MappingTestAssert = (
  metamodel: MappingTestAssert,
): ValidationIssue | undefined => {
  if (metamodel instanceof ExpectedOutputMappingTestAssert) {
    return !isValidJSONString(fromGrammarString(metamodel.expectedOutput))
      ? createValidationError([
          'Mapping test expected output assertion data is not a valid JSON string',
        ])
      : undefined;
  }
  // NOTE: technically we need to modularize these, but they are deprecated, so we will leave them alone for now
  return undefined;
};

/**
 * @deprecated
 */
export const DEPRECATED__validate_ObjectInputData = (
  metamodel: ObjectInputData,
): ValidationIssue | undefined => {
  if (isStubbed_PackageableElement(metamodel.sourceClass.value)) {
    return createValidationError(['Object input data source class is missing']);
  }
  if (metamodel.inputType === ObjectInputType.JSON) {
    return !isValidJSONString(metamodel.data)
      ? createValidationError([
          'JSON object input data is not a valid JSON string',
        ])
      : undefined;
  }
  return undefined;
};

/**
 * @deprecated
 */
export const DEPRECATED__validate_InputData = (
  metamodel: InputData,
): ValidationIssue | undefined => {
  if (metamodel instanceof ObjectInputData) {
    return DEPRECATED__validate_ObjectInputData(metamodel);
  } else if (metamodel instanceof RelationalInputData) {
    return DEPRECATED__validation_RelationalInputData(metamodel);
  } else if (metamodel instanceof FlatDataInputData) {
    return DEPRECATED__validate_FlatDataInputData(metamodel);
  }
  // NOTE: technically we need to modularize these, but they are deprecated, so we will leave them alone for now
  return undefined;
};

export const DEPRECATED__validate_MappingTest = (
  metamodel: DEPRECATED__MappingTest,
): ValidationIssue[] | undefined => {
  let problems: ValidationIssue[] = [];
  // query
  if (isStubbed_RawLambda(metamodel.query)) {
    problems.push(
      createValidationError(['Mapping test query cannot be empty']),
    );
  }
  // input data
  problems = problems.concat(
    metamodel.inputData.flatMap((i) => DEPRECATED__validate_InputData(i) ?? []),
  );
  // assertion
  const assertionIssue = DEPRECATED__validate_InputData(metamodel.assert);
  if (assertionIssue) {
    problems.push(assertionIssue);
  }
  return problems.length ? problems : undefined;
};
