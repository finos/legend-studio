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

import { observable, computed, makeObservable } from 'mobx';
import { guaranteeType, hashArray } from '@finos/legend-shared';
import type { Hashable } from '@finos/legend-shared';
import { SERVICE_STORE_HASH_STRUCTURE } from '../../../../../../../DSLServiceStore_ModelUtils';
import { ServiceStoreElement } from './ServiceStoreElement';
import type { ServiceStore } from './ServiceStore';
import { Service } from './Service';

export class ServiceGroup extends ServiceStoreElement implements Hashable {
  elements: ServiceStoreElement[] = [];

  constructor(
    id: string,
    path: string,
    owner: ServiceStore,
    parent: ServiceGroup | undefined,
  ) {
    super(id, path, owner, parent);

    makeObservable(this, {
      elements: observable,
      hashCode: computed,
    });
  }

  getService = (value: string): Service =>
    guaranteeType(
      this.elements.find(
        (element: ServiceStoreElement): Service | undefined => {
          if (element instanceof Service && element.id === value) {
            return element;
          }
          return undefined;
        },
      ),
      Service,
      `Can't find service '${value}'`,
    );

  override get hashCode(): string {
    return hashArray([
      SERVICE_STORE_HASH_STRUCTURE.SERVICE_GROUP,
      super.hashCode,
      hashArray(this.elements),
    ]);
  }
}
