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
import { hashArray } from '@finos/legend-shared';
import type { Hashable } from '@finos/legend-shared';
import { SerializationFormat } from './SerializationFormat';
import type { TypeReference } from './TypeReference';
import { SERVICE_STORE_HASH_STRUCTURE } from '../../../../../../../DSLServiceStore_ModelUtils';
import { StringTypeReference } from './StringTypeReference';

export enum LOCATION {
  PATH = 'PATH',
  QUERY = 'QUERY',
}

export class ServiceParameter implements Hashable {
  name!: string;
  type?: TypeReference | undefined;
  location!: LOCATION;
  enumeration?: string | undefined;
  serializationFormat?: SerializationFormat | undefined;

  constructor() {
    makeObservable(this, {
      name: observable,
      type: observable,
      location: observable,
      enumeration: observable,
      serializationFormat: observable,
      hashCode: computed,
    });
  }

  get hashCode(): string {
    return hashArray([
      SERVICE_STORE_HASH_STRUCTURE.SERVICE_PARAMETER,
      this.name,
      this.type ?? new StringTypeReference(true),
      this.location,
      this.enumeration ?? '',
      this.serializationFormat ?? new SerializationFormat(),
    ]);
  }
}
