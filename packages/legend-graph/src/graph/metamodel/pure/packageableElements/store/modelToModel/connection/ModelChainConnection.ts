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

import { hashArray } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import {
  type ConnectionVisitor,
  Connection,
} from '../../../connection/Connection.js';
import type { Mapping } from '../../../mapping/Mapping.js';
import type { PackageableElementReference } from '../../../PackageableElementReference.js';
import type { ModelStore } from '../model/ModelStore.js';

export class ModelChainConnection extends Connection {
  declare store: PackageableElementReference<ModelStore>;
  mappings: PackageableElementReference<Mapping>[] = [];

  constructor(store: PackageableElementReference<ModelStore>) {
    super(store);
    this.store = store;
  }

  accept_ConnectionVisitor<T>(visitor: ConnectionVisitor<T>): T {
    return visitor.visit_ModelChainConnection(this);
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MODEL_CHAIN_CONNECTION,
      hashArray(this.mappings.map((m) => m.valueForSerialization ?? '')),
    ]);
  }
}
