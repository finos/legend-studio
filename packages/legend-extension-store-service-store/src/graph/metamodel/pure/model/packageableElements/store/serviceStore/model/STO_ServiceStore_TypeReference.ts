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

import { type Hashable, hashArray } from '@finos/legend-shared';
import { SERVICE_STORE_HASH_STRUCTURE } from '../../../../../../../STO_ServiceStore_HashUtils.js';
import type {
  Binding,
  Class,
  PackageableElementReference,
} from '@finos/legend-graph';

export abstract class TypeReference implements Hashable {
  list!: boolean;

  abstract get hashCode(): string;
}

export class BooleanTypeReference extends TypeReference implements Hashable {
  override get hashCode(): string {
    return hashArray([
      SERVICE_STORE_HASH_STRUCTURE.BOOLEAN_TYPE_REFERENCE,
      this.list.toString(),
    ]);
  }
}

export class FloatTypeReference extends TypeReference implements Hashable {
  override get hashCode(): string {
    return hashArray([
      SERVICE_STORE_HASH_STRUCTURE.FLOAT_TYPE_REFERENCE,
      this.list.toString(),
    ]);
  }
}

export class IntegerTypeReference extends TypeReference implements Hashable {
  override get hashCode(): string {
    return hashArray([
      SERVICE_STORE_HASH_STRUCTURE.INTEGER_TYPE_REFERENCE,
      this.list.toString(),
    ]);
  }
}

export class StringTypeReference extends TypeReference implements Hashable {
  override get hashCode(): string {
    return hashArray([
      SERVICE_STORE_HASH_STRUCTURE.STRING_TYPE_REFERENCE,
      this.list.toString(),
    ]);
  }
}

export class ComplexTypeReference extends TypeReference implements Hashable {
  type!: PackageableElementReference<Class>;
  binding!: PackageableElementReference<Binding>;

  override get hashCode(): string {
    return hashArray([
      SERVICE_STORE_HASH_STRUCTURE.COMPLEX_TYPE_REFERENCE,
      this.list.toString(),
      this.type.valueForSerialization ?? '',
      this.binding.valueForSerialization ?? '',
    ]);
  }
}
