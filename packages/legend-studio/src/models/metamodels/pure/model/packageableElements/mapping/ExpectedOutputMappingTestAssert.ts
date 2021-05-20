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

import { observable, computed, makeObservable } from 'mobx';
import {
  hashArray,
  isValidJSONString,
  fromGrammarString,
  tryToMinifyLosslessJSONString,
} from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import { MappingTestAssert } from './MappingTestAssert';
import type { ValidationIssue } from '../../../action/validator/ValidationResult';
import { createValidationError } from '../../../action/validator/ValidationResult';

export class ExpectedOutputMappingTestAssert
  extends MappingTestAssert
  implements Hashable
{
  expectedOutput: string;

  constructor(expectedOutput: string) {
    super();

    makeObservable(this, {
      expectedOutput: observable,
      validationResult: computed,
      hashCode: computed,
    });

    /* @MARKER: Workaround for https://github.com/finos/legend-studio/issues/68 */
    this.expectedOutput = tryToMinifyLosslessJSONString(expectedOutput);
  }

  get validationResult(): ValidationIssue | undefined {
    return !isValidJSONString(fromGrammarString(this.expectedOutput))
      ? createValidationError([
          'Mapping test expected output assertion data is not a valid JSON string',
        ])
      : undefined;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.EXPECTED_OUTPUT_MAPPING_TEST_ASSERT,
      this.expectedOutput,
    ]);
  }
}
