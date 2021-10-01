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
import type { Hashable } from '@finos/legend-shared';
import type {
  ConnectionVisitor,
  PackageableElementReference,
} from '@finos/legend-graph';
import { Connection } from '@finos/legend-graph';
import { action, computed, makeObservable, observable } from 'mobx';
import { SERVICE_STORE_HASH_STRUCTURE } from '../../../../../../../DSLServiceStore_ModelUtils';
import type { ServiceStore } from '../model/ServiceStore';

export class ServiceStoreConnection extends Connection implements Hashable {
  baseUrl!: string;

  constructor(store: PackageableElementReference<ServiceStore>) {
    super(store);

    makeObservable(this, {
      baseUrl: observable,
      setUrl: action,
      hashCode: computed,
    });
  }

  setUrl(value: string): void {
    this.baseUrl = value;
  }

  get hashCode(): string {
    return hashArray([
      SERVICE_STORE_HASH_STRUCTURE.SERVICE_STORE_CONNECTION,
      this.store.hashValue,
      this.baseUrl,
    ]);
  }

  accept_ConnectionVisitor<T>(visitor: ConnectionVisitor<T>): T {
    return visitor.visit_Connection(this);
  }
}
