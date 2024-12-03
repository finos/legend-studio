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
import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import type { V1_Property } from '../../../model/packageableElements/domain/V1_Property.js';
import type { V1_StereotypePtr } from '../../../model/packageableElements/domain/V1_StereotypePtr.js';
import {
  type V1_PackageableElementVisitor,
  type V1_PackageableElementPointer,
  V1_PackageableElement,
} from '../../../model/packageableElements/V1_PackageableElement.js';
import type { V1_TaggedValue } from '../../../model/packageableElements/domain/V1_TaggedValue.js';
import type { V1_Constraint } from '../../../model/packageableElements/domain/V1_Constraint.js';
import type { V1_DerivedProperty } from './V1_DerivedProperty.js';

export class V1_Class extends V1_PackageableElement implements Hashable {
  superTypes: V1_PackageableElementPointer[] = [];
  properties: V1_Property[] = [];
  derivedProperties: V1_DerivedProperty[] = [];
  stereotypes: V1_StereotypePtr[] = [];
  taggedValues: V1_TaggedValue[] = [];
  constraints: V1_Constraint[] = [];

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.CLASS,
      this.path,
      hashArray(this.properties),
      hashArray(this.derivedProperties),
      hashArray(this.superTypes.map((e) => e.path)),
      hashArray(this.constraints),
      hashArray(this.stereotypes),
      hashArray(this.taggedValues),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_Class(this);
  }
}
