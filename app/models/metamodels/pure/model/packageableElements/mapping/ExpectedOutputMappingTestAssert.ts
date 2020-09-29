/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { observable, computed } from 'mobx';
import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { isValidJSONString } from 'Utilities/ValidatorUtil';
import { fromGrammarString } from 'Utilities/FormatterUtil';
import { MappingTestAssert } from './MappingTestAssert';
import { ValidationIssue, createValidationError } from 'MM/validator/ValidationResult';

export class ExpectedOutputMappingTestAssert extends MappingTestAssert implements Hashable {
  @observable expectedOutput: string;

  constructor(expectedOutput: string) {
    super();
    this.expectedOutput = expectedOutput;
  }

  @computed get validationResult(): ValidationIssue | undefined {
    return !isValidJSONString(fromGrammarString(this.expectedOutput)) ? createValidationError(['Mapping test expected output assertion data is not a valid JSON string']) : undefined;
  }

  @computed get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.EXPECTED_OUTPUT_MAPPING_TEST_ASSERT,
      this.expectedOutput,
    ]);
  }
}
