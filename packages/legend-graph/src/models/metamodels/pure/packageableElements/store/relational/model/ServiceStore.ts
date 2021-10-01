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
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import { observable, makeObservable, override } from 'mobx';
import { Store } from '../../Store';
import type { PackageableElementVisitor } from '../../../PackageableElement';

export class ServiceStore extends Store implements Hashable {
  docLink!: string;

  constructor(name: string) {
    super(name);

    makeObservable<ServiceStore, '_elementHashCode'>(this, {
      docLink: observable,
      _elementHashCode: override,
    });
  }

  protected override get _elementHashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_STORE,
      this.path,
      hashArray(this.includes.map((include) => include.hashValue)),
      this.docLink,
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    //return visitor.visit_ServiceStore(this);
    return visitor.visit_PackageableElement(this);
  }
}
