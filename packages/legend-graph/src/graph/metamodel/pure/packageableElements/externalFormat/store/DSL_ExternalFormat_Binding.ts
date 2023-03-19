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
import type { SchemaSet } from '../schemaSet/DSL_ExternalFormat_SchemaSet.js';
import { Store } from '../../store/Store.js';
import type { ModelUnit } from './DSL_ExternalFormat_ModelUnit.js';
import type { PackageableElementVisitor } from '../../PackageableElement.js';
import { CORE_HASH_STRUCTURE } from '../../../../../Core_HashUtils.js';
import type { PackageableElementReference } from '../../PackageableElementReference.js';

// NOTE: in the metamodel, `Binding` extends `ModelStore`, we could consider doing the same
// although this might not be trivial as we have a fair amount of logic around the special
// handling of `ModelStore`
export class Binding extends Store implements Hashable {
  schemaSet?: PackageableElementReference<SchemaSet> | undefined;
  schemaId?: string | undefined;
  contentType!: string;
  modelUnit!: ModelUnit;

  protected override get _elementHashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.BINDING,
      this.path,
      this.schemaSet?.valueForSerialization ?? '',
      this.schemaId ?? '',
      this.contentType,
      this.modelUnit,
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}
