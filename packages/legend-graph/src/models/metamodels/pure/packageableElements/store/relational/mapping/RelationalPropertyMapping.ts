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

import { observable, computed, makeObservable, action } from 'mobx';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import { hashArray, type Hashable } from '@finos/legend-shared';
import type { EnumerationMapping } from '../../../mapping/EnumerationMapping';
import {
  type PropertyMappingVisitor,
  PropertyMapping,
} from '../../../mapping/PropertyMapping';
import type { PropertyMappingsImplementation } from '../../../mapping/PropertyMappingsImplementation';
import type { PropertyReference } from '../../../domain/PropertyReference';
import type { SetImplementation } from '../../../mapping/SetImplementation';
import { hashObjectWithoutSourceInformation } from '../../../../../../../MetaModelUtils';
import {
  isStubRelationalOperationElement,
  type RawRelationalOperationElement,
} from '../model/RawRelationalOperationElement';

export class RelationalPropertyMapping
  extends PropertyMapping
  implements Hashable
{
  transformer?: EnumerationMapping | undefined;
  relationalOperation!: RawRelationalOperationElement; // @MARKER GENERATED MODEL DISCREPANCY --- Studio does not process relational operation element

  constructor(
    owner: PropertyMappingsImplementation,
    property: PropertyReference,
    source: SetImplementation,
    target?: SetImplementation,
  ) {
    super(owner, property, source, target);

    makeObservable(this, {
      transformer: observable,
      relationalOperation: observable.ref,
      setTransformer: action,
      hashCode: computed,
    });
  }

  setTransformer(value: EnumerationMapping | undefined): void {
    this.transformer = value;
  }

  accept_PropertyMappingVisitor<T>(visitor: PropertyMappingVisitor<T>): T {
    return visitor.visit_RelationalPropertyMapping(this);
  }

  override get isStub(): boolean {
    return isStubRelationalOperationElement(this.relationalOperation);
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.REALTIONAL_PROPERTY_MAPPING,
      super.hashCode,
      this.transformer?.id.value ?? '',
      hashObjectWithoutSourceInformation(this.relationalOperation),
    ]);
  }
}
