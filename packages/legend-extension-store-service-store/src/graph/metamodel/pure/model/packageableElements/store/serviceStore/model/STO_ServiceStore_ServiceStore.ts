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

import { hashArray, type Hashable } from '@finos/legend-shared';
import { type PackageableElementVisitor, Store } from '@finos/legend-graph';
import type { ServiceStoreElement } from './STO_ServiceStore_ServiceStoreElement.js';
import { SERVICE_STORE_HASH_STRUCTURE } from '../../../../../../../STO_ServiceStore_HashUtils.js';

export class ServiceStore extends Store implements Hashable {
  description?: string | undefined;
  elements: ServiceStoreElement[] = [];

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
