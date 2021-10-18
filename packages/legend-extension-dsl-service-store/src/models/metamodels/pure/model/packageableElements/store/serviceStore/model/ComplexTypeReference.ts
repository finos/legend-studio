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

import { observable, makeObservable, computed } from 'mobx';
import { hashArray } from '@finos/legend-shared';
import type { Hashable } from '@finos/legend-shared';
import { TypeReference } from './TypeReference';
import { SERVICE_STORE_HASH_STRUCTURE } from '../../../../../../../DSLServiceStore_ModelUtils';
import type { Class } from '@finos/legend-graph';
import type { Binding } from '@finos/legend-extension-dsl-serializer';

export class ComplexTypeReference extends TypeReference implements Hashable {
  type!: Class;
  binding!: Binding;

  constructor() {
    super();

    makeObservable(this, {
      type: observable,
      binding: observable,
      hashCode: computed,
    });
  }

  override get hashCode(): string {
    return hashArray([
      SERVICE_STORE_HASH_STRUCTURE.COMPLEX_TYPE_REFERENCE,
      super.hashCode,
      this.type.path,
      this.binding.path,
    ]);
  }
}
