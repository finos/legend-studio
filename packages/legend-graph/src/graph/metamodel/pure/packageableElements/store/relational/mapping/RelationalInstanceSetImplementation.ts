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

import { type Hashable, hashArray, isEmpty } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import { InstanceSetImplementation } from '../../../mapping/InstanceSetImplementation.js';
import type { SetImplementationVisitor } from '../../../mapping/SetImplementation.js';
import type { RelationalOperationElement } from '../model/RelationalOperationElement.js';
import { RelationalPropertyMapping } from './RelationalPropertyMapping.js';

export class RelationalInstanceSetImplementation
  extends InstanceSetImplementation
  implements Hashable
{
  primaryKey: RelationalOperationElement[] = [];

  accept_SetImplementationVisitor<T>(visitor: SetImplementationVisitor<T>): T {
    return visitor.visit_RelationalInstanceSetImplementation(this);
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_INSTANCE_SET_IMPLEMENTATION,
      super.hashCode,
      hashArray(this.primaryKey),
      hashArray(
        this.propertyMappings.filter(
          // TODO: we should also handle of other property mapping types
          // using some form of extension mechanism
          // This is a rather optimistic check as we make assumption on the type of property mapping included here
          (propertyMapping) => {
            if (propertyMapping instanceof RelationalPropertyMapping) {
              // TODO: use `isStubbed_RawRelationalOperationElement` when we move this out of the metamodel
              return !isEmpty(propertyMapping.relationalOperation);
            }
            return true;
          },
        ),
      ),
    ]);
  }
}
