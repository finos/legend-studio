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

import { hashArray, uuid, type Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../graph/Core_HashUtils.js';
import type { Store } from '../store/Store.js';
import type { JsonModelConnection } from '../store/modelToModel/connection/JsonModelConnection.js';
import type { XmlModelConnection } from '../store/modelToModel/connection/XmlModelConnection.js';
import type { FlatDataConnection } from '../store/flatData/connection/FlatDataConnection.js';
import type { PackageableConnection } from './PackageableConnection.js';
import type { RelationalDatabaseConnection } from '../store/relational/connection/RelationalDatabaseConnection.js';
import type { PackageableElementReference } from '../PackageableElementReference.js';
import type { ModelChainConnection } from '../store/modelToModel/connection/ModelChainConnection.js';
import type { INTERNAL__UnknownConnection } from './INTERNAL__UnknownConnection.js';

export interface ConnectionVisitor<T> {
  visit_Connection(connection: Connection): T;
  visit_INTERNAL__UnknownConnection(connection: INTERNAL__UnknownConnection): T;

  visit_ConnectionPointer(connection: ConnectionPointer): T;
  visit_ModelChainConnection(connection: ModelChainConnection): T;
  visit_JsonModelConnection(connection: JsonModelConnection): T;
  visit_XmlModelConnection(connection: XmlModelConnection): T;
  visit_FlatDataConnection(connection: FlatDataConnection): T;
  visit_RelationalDatabaseConnection(
    connection: RelationalDatabaseConnection,
  ): T;
}

export abstract class Connection implements Hashable {
  readonly _UUID = uuid();

  /**
   * NOTE: in Pure right now, this is of type Any[1], but technically it should be a store
   */
  store: PackageableElementReference<Store> | undefined;

  constructor(store: PackageableElementReference<Store> | undefined) {
    this.store = store;
  }

  abstract get hashCode(): string;

  abstract accept_ConnectionVisitor<T>(visitor: ConnectionVisitor<T>): T;
}

export class ConnectionPointer extends Connection implements Hashable {
  packageableConnection: PackageableElementReference<PackageableConnection>;

  constructor(
    packageableConnection: PackageableElementReference<PackageableConnection>,
  ) {
    super(packageableConnection.value.connectionValue.store);
    this.packageableConnection = packageableConnection;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.CONNECTION_POINTER,
      this.packageableConnection.valueForSerialization ?? '',
    ]);
  }

  accept_ConnectionVisitor<T>(visitor: ConnectionVisitor<T>): T {
    return visitor.visit_ConnectionPointer(this);
  }
}
