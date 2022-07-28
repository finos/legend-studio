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

import { CORE_HASH_STRUCTURE } from '../../../../../graph/Core_HashUtils.js';
import { hashArray, uuid, type Hashable } from '@finos/legend-shared';
import type { RawLambda } from '../../rawValueSpecification/RawLambda.js';
import type { Class } from './Class.js';

export class Constraint implements Hashable {
  readonly _UUID = uuid();
  readonly _OWNER: Class;

  name: string;
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  functionDefinition: RawLambda;
  externalId?: string | undefined;
  enforcementLevel?: string | undefined;
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  messageFunction?: RawLambda | undefined;

  constructor(name: string, owner: Class, functionDefinition: RawLambda) {
    this.name = name;
    this._OWNER = owner;
    this.functionDefinition = functionDefinition;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.CONSTRAINT,
      this.name,
      this.functionDefinition,
      this.externalId ?? '',
      this.enforcementLevel ?? '',
      this.messageFunction ?? '',
    ]);
  }
}
