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

import { type Hashable, hashArray } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import type { V1_RawLambda } from '../../rawValueSpecification/V1_RawLambda.js';
import type { V1_PostValidationAssertion } from './V1_PostValidationAssertion.js';

export class V1_PostValidation implements Hashable {
  description!: string;
  parameters: V1_RawLambda[] = [];
  assertions: V1_PostValidationAssertion[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_POST_VALIDATION,
      this.description,
      hashArray(this.parameters),
      hashArray(this.assertions),
    ]);
  }
}
