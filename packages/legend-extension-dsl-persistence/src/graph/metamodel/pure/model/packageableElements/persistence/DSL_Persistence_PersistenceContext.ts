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

import type { Persistence } from './DSL_Persistence_Persistence.js';
import type { PersistencePlatform } from './DSL_Persistence_PersistencePlatform.js';
import type { ServiceParameter } from './DSL_Persistence_ServiceParameter.js';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../DSL_Persistence_HashUtils.js';
import {
  type Connection,
  PackageableElement,
  type PackageableElementReference,
  type PackageableElementVisitor,
} from '@finos/legend-graph';
import { type Hashable, hashArray } from '@finos/legend-shared';

export class PersistenceContext extends PackageableElement implements Hashable {
  persistence!: PackageableElementReference<Persistence>;
  platform!: PersistencePlatform;
  serviceParameters: ServiceParameter[] = [];
  sinkConnection?: Connection;

  protected override get _elementHashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.PERSISTENCE_CONTEXT,
      this.persistence.valueForSerialization ?? '',
      this.platform,
      hashArray(this.serviceParameters),
      this.sinkConnection ?? '',
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}
