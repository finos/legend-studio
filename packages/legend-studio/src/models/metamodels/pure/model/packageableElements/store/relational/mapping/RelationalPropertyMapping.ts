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
import { hashArray } from '@finos/legend-studio-shared';
import {
  CORE_HASH_STRUCTURE,
  SOURCR_ID_LABEL,
} from '../../../../../../../MetaModelConst';
import type { Hashable } from '@finos/legend-studio-shared';
import type { EnumerationMapping } from '../../../../../model/packageableElements/mapping/EnumerationMapping';
import type { PropertyMappingVisitor } from '../../../../../model/packageableElements/mapping/PropertyMapping';
import { PropertyMapping } from '../../../../../model/packageableElements/mapping/PropertyMapping';
import type { PropertyMappingsImplementation } from '../../../../../model/packageableElements/mapping/PropertyMappingsImplementation';
import type { PropertyReference } from '../../../../../model/packageableElements/domain/PropertyReference';
import type { SetImplementation } from '../../../../../model/packageableElements/mapping/SetImplementation';
import { hashObjectWithoutSourceInformation } from '../../../../../../../MetaModelUtility';
import { isStubRelationalOperationElement } from '../model/RawRelationalOperationElement';
import type { RawRelationalOperationElement } from '../model/RawRelationalOperationElement';

export class RelationalPropertyMapping
  extends PropertyMapping
  implements Hashable
{
  transformer?: EnumerationMapping;
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
      relationalOperation: observable,
      setTransformer: action,
      lambdaId: computed,
      hashCode: computed,
    });
  }

  // `operationId` is properly the more appropriate term to use, but we are just following what we
  // do for other property mapping for consistency
  get lambdaId(): string {
    // NOTE: Added the index here just in case but the order needs to be checked carefully as bugs may result from inaccurate orderings
    return `${this.owner.parent.path}-${
      SOURCR_ID_LABEL.RELATIONAL_CLASS_MAPPING
    }-${this.owner.id.value}-${this.property.value.name}-${
      this.targetSetImplementation
        ? `-${this.targetSetImplementation.id.value}`
        : ''
    }-${this.owner.propertyMappings.indexOf(this)}`;
  }

  setTransformer(value: EnumerationMapping | undefined): void {
    this.transformer = value;
  }

  accept_PropertyMappingVisitor<T>(visitor: PropertyMappingVisitor<T>): T {
    return visitor.visit_RelationalPropertyMapping(this);
  }

  get isStub(): boolean {
    return isStubRelationalOperationElement(this.relationalOperation);
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.REALTIONAL_PROPERTY_MAPPPING,
      super.hashCode,
      this.transformer?.id.value ?? '',
      hashObjectWithoutSourceInformation(this.relationalOperation),
    ]);
  }
}
