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

import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Persistence_HashUtils.js';
import type { V1_PersistencePlatform } from './V1_DSL_Persistence_PersistencePlatform.js';
import type { V1_ServiceParameter } from './V1_DSL_Persistence_ServiceParameter.js';
import {
  type V1_Connection,
  V1_PackageableElement,
  type V1_PackageableElementPointer,
  type V1_PackageableElementVisitor,
} from '@finos/legend-graph';
import { type Hashable, hashArray } from '@finos/legend-shared';

export class V1_PersistenceContext
  extends V1_PackageableElement
  implements Hashable
{
  persistence!: V1_PackageableElementPointer;
  platform!: V1_PersistencePlatform;
  serviceParameters: V1_ServiceParameter[] = [];
  sinkConnection?: V1_Connection;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.PERSISTENCE_CONTEXT,
      this.persistence.path,
      this.platform,
      hashArray(this.serviceParameters),
      this.sinkConnection ?? '',
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}
