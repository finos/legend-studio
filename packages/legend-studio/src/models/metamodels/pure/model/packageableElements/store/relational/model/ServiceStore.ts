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

import { hashArray, IllegalStateError } from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import { computed, observable, makeObservable } from 'mobx';
import { Store } from '../../../../../model/packageableElements/store/Store';
import type { PackageableElementVisitor } from '../../../../../model/packageableElements/PackageableElement';

export class ServiceStore extends Store implements Hashable {
  docLink!: string;

  constructor(name: string) {
    super(name);

    makeObservable(this, {
      docLink: observable,
      hashCode: computed({ keepAlive: true }),
    });
  }

  override get hashCode(): string {
    if (this._isDisposed) {
      throw new IllegalStateError(`Element '${this.path}' is already disposed`);
    }
    if (this._isImmutable) {
      throw new IllegalStateError(
        `Readonly element '${this.path}' is modified`,
      );
    }
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_STORE,
      super.hashCode,
      this.docLink,
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_ServiceStore(this);
  }
}
