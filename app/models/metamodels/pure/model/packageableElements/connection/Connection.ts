/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { computed } from 'mobx';
import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { uuid } from 'Utilities/GeneralUtil';
import { Store } from 'MM/model/packageableElements/store/Store';
import { JsonModelConnection } from 'MM/model/packageableElements/store/modelToModel/connection/JsonModelConnection';
import { XmlModelConnection } from 'MM/model/packageableElements/store/modelToModel/connection/XmlModelConnection';
import { PackageableConnection } from './PackageableConnection';
import { PackageableElementReference } from 'MM/model/packageableElements/PackageableElementReference';

export interface ConnectionVisitor<T> {
  visit_ConnectionPointer(connection: ConnectionPointer): T;
  visit_JsonModelConnection(connection: JsonModelConnection): T;
  visit_XmlModelConnection(connection: XmlModelConnection): T;
}

export abstract class Connection implements Hashable {
  uuid = uuid();
  // in Pure right now, this is of type Any[1], but technically it should be a store
  store: PackageableElementReference<Store>;

  constructor(store: PackageableElementReference<Store>) {
    this.store = store;
  }

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.CONNECTION,
      this.store.valueForSerialization,
    ]);
  }

  abstract accept_ConnectionVisitor<T>(visitor: ConnectionVisitor<T>): T
}

export class ConnectionPointer extends Connection implements Hashable {
  packageableConnection: PackageableElementReference<PackageableConnection>;

  constructor(packageableConnection: PackageableElementReference<PackageableConnection>) {
    super(packageableConnection.value.connectionValue.store);
    this.packageableConnection = packageableConnection;
  }

  setPackageableConnection(value: PackageableConnection): void { this.packageableConnection.setValue(value) }

  @computed get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.CONNECTION_POINTER,
      this.packageableConnection.valueForSerialization,
    ]);
  }

  accept_ConnectionVisitor<T>(visitor: ConnectionVisitor<T>): T {
    return visitor.visit_ConnectionPointer(this);
  }
}
