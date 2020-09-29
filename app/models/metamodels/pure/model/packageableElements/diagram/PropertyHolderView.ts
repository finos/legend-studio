/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { RelationshipView } from './RelationshipView';
import { ClassView } from './ClassView';
import { PropertyReference } from 'MM/model/packageableElements/domain/PropertyReference';
import { Diagram } from 'MM/model/packageableElements/diagram/Diagram';

export class PropertyHolderView extends RelationshipView implements Hashable {
  property: PropertyReference;

  constructor(owner: Diagram, property: PropertyReference, from: ClassView, to: ClassView) {
    super(owner, from, to);
    this.property = property;
  }

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.PROPERTY_HOLDER_VIEW,
      super.hashCode,
      this.property.pointerHashCode
    ]);
  }
}
