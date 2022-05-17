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
import { ExpectedOutputMappingTestAssert } from '../../../models/metamodels/pure/packageableElements/mapping/ExpectedOutputMappingTestAssert';
import type { InputData } from '../../../models/metamodels/pure/packageableElements/mapping/InputData';
import type { MappingTest } from '../../../models/metamodels/pure/packageableElements/mapping/MappingTest';
import type { MappingTestAssert } from '../../../models/metamodels/pure/packageableElements/mapping/MappingTestAssert';
import { FlatDataInputData } from '../../../models/metamodels/pure/packageableElements/store/flatData/mapping/FlatDataInputData';
import {
  ObjectInputData,
  ObjectInputType,
} from '../../../models/metamodels/pure/packageableElements/store/modelToModel/mapping/ObjectInputData';
import { RelationalInputData } from '../../../models/metamodels/pure/packageableElements/store/relational/mapping/RelationalInputData';
import { isStubbed_PackageableElement } from '../creation/DomainModelCreatorHelper';
import { isStubbed_RawLambda } from '../creation/RawValueSpecificationCreatorHelper';
import { DEPRECATED__validate_FlatDataInputData } from './StoreFlatData_ValidationHelper';
import { DEPRECATED__validation_RelationalInputData } from './StoreRelational_ValidationHelper';
import {
  type ValidationIssue,
  createValidationError,
} from './ValidationHelper';

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
  /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
  // TODO: we might need to modularize this
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
  /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
  // TODO: we might need to modularize this
  return undefined;
};

export const DEPRECATED__validate_MappingTest = (
  metamodel: MappingTest,
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
