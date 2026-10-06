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

import { Type } from '../domain/Type.js';
import type { PackageableElementVisitor } from '../PackageableElement.js';
import { Function } from '../domain/Function.js';
import { Multiplicity } from '../domain/Multiplicity.js';
import type { GenericTypeReference } from '../domain/GenericTypeReference.js';
import { hashArray, type Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../Core_HashUtils.js';

export class RelationColumn extends Function implements Hashable {
  genericType: GenericTypeReference;
  multiplicity: Multiplicity = Multiplicity.ONE;

  constructor(name: string, type: GenericTypeReference) {
    super(name);
    this.genericType = type;
  }

  override accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    throw new Error('Method not implemented.');
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATION_TYPE,
      this.name,
      this.genericType.value,
    ]);
  }
}

export class RelationType extends Type implements Hashable {
  static ID = 'RelationType';
  columns: RelationColumn[] = [];

  override accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    throw new Error('Method not implemented.');
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATION_TYPE,
      hashArray(this.columns),
    ]);
  }
}
