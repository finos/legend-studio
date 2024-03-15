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

import { hashArray, type Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../graph/Core_HashUtils.js';
import type { RawLambda } from '../../rawValueSpecification/RawLambda.js';

export class PostValidationViolationsResultRow {
  values!: [];
}

class PostValidationViolationsResult {
  rows!: PostValidationViolationsResultRow[];
  columns!: [];
}

class PostValidationAssertionViolations {
  result!: PostValidationViolationsResult;
}

//TODO check if violations may need to be ExecutionResult
export class PostValidationAssertionResult {
  id!: string;
  message!: string;
  violations!: PostValidationAssertionViolations;
}

export class PostValidationAssertion implements Hashable {
  id!: string;
  assertion!: RawLambda;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_POST_VALIDATION_ASSERTION,
      this.id,
      this.assertion,
    ]);
  }
}
