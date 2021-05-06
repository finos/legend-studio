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

import { hashArray } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import type { ConnectionVisitor } from '../../../../../model/packageableElements/connection/Connection';
import { Connection } from '../../../../../model/packageableElements/connection/Connection';
import type { Mapping } from '../../../../../model/packageableElements/mapping/Mapping';
import type { PackageableElementReference } from '../../../../../model/packageableElements/PackageableElementReference';

export class ModelChainConnection extends Connection {
  mappings: PackageableElementReference<Mapping>[] = [];

  accept_ConnectionVisitor<T>(visitor: ConnectionVisitor<T>): T {
    return visitor.visit_ModelChainConnection(this);
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MODEL_CHAIN_CONNECTION,
      hashArray(this.mappings.map((m) => m.valueForSerialization)),
    ]);
  }
}
