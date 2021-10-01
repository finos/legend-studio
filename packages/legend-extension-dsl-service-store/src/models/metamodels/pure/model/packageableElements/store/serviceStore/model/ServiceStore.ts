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

import { observable, action, makeObservable, override } from 'mobx';
import {
  hashArray,
  addUniqueEntry,
  deleteEntry,
  guaranteeType,
} from '@finos/legend-shared';
import type { Hashable } from '@finos/legend-shared';
import type { PackageableElementVisitor } from '@finos/legend-graph';
import { Store } from '@finos/legend-graph';
import type { ServiceStoreElement } from './ServiceStoreElement';
import { SERVICE_STORE_HASH_STRUCTURE } from '../../../../../../../DSLServiceStore_ModelUtils';
import { ServiceGroup } from './ServiceGroup';
import { Service } from './Service';

export class ServiceStore extends Store implements Hashable {
  description?: string | undefined;
  elements: ServiceStoreElement[] = [];

  constructor(name: string) {
    super(name);

    makeObservable<ServiceStore, '_elementHashCode'>(this, {
      description: observable,
      elements: observable,
      setDescription: action,
      addElement: action,
      deleteElement: action,
      _elementHashCode: override,
    });
  }

  setDescription(value: string): void {
    this.description = value;
  }

  addElement(value: ServiceStoreElement): void {
    addUniqueEntry(this.elements, value);
  }

  deleteElement(value: ServiceStoreElement): void {
    deleteEntry(this.elements, value);
  }

  findService = (
    value: string,
    serviceGroup: ServiceGroup,
  ): ServiceStoreElement | undefined =>
    serviceGroup.elements.find(
      (element: ServiceStoreElement): Service | undefined => {
        if (element instanceof Service && element.id === value) {
          return element;
        } else if (element instanceof ServiceGroup) {
          this.findService(value, element);
        }
        return undefined;
      },
    );

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

  getServiceGroup = (value: string): ServiceGroup =>
    guaranteeType(
      this.elements.find(
        (element: ServiceStoreElement): ServiceGroup | undefined => {
          if (element instanceof ServiceGroup && element.id === value) {
            return element;
          }
          return undefined;
        },
      ),
      ServiceGroup,
      `Can't find service group '${value}'`,
    );

  protected override get _elementHashCode(): string {
    return hashArray([
      SERVICE_STORE_HASH_STRUCTURE.SERVICE_STORE,
      this.path,
      this.description ?? '',
      hashArray(this.elements),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}
