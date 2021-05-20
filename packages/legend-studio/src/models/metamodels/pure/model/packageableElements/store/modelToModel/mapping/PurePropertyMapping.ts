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

import { observable, action, computed, makeObservable } from 'mobx';
import { hashArray } from '@finos/legend-studio-shared';
import {
  CORE_HASH_STRUCTURE,
  SOURCR_ID_LABEL,
} from '../../../../../../../MetaModelConst';
import type { Hashable } from '@finos/legend-studio-shared';
import type { PropertyMappingVisitor } from '../../../../../model/packageableElements/mapping/PropertyMapping';
import { PropertyMapping } from '../../../../../model/packageableElements/mapping/PropertyMapping';
import type { EnumerationMapping } from '../../../../../model/packageableElements/mapping/EnumerationMapping';
import type { PropertyReference } from '../../../../../model/packageableElements/domain/PropertyReference';
import type { SetImplementation } from '../../../../../model/packageableElements/mapping/SetImplementation';
import type { PropertyMappingsImplementation } from '../../../../../model/packageableElements/mapping/PropertyMappingsImplementation';
import type { RawLambda } from '../../../../../model/rawValueSpecification/RawLambda';
import type { Stubable } from '../../../../../model/Stubable';

export class PurePropertyMapping
  extends PropertyMapping
  implements Hashable, Stubable
{
  transformer?: EnumerationMapping;
  transform: RawLambda; // @MARKER GENERATED MODEL DISCREPANCY --- Studio does not process lambda
  explodeProperty?: boolean;

  constructor(
    owner: PropertyMappingsImplementation,
    property: PropertyReference,
    transform: RawLambda,
    source: SetImplementation,
    target?: SetImplementation,
    explodeProperty?: boolean,
  ) {
    super(owner, property, source, target);

    makeObservable(this, {
      transformer: observable,
      transform: observable,
      explodeProperty: observable,
      setTransformer: action,
      lambdaId: computed,
      isStub: computed,
      hashCode: computed,
    });

    this.transform = transform;
    this.explodeProperty = explodeProperty;
  }

  setTransformer(value: EnumerationMapping | undefined): void {
    this.transformer = value;
  }

  get lambdaId(): string {
    // NOTE: Added the index here just in case but the order needs to be checked carefully as bugs may result from inaccurate orderings
    return `${this.owner.parent.path}-${
      SOURCR_ID_LABEL.PURE_INSTANCE_CLASS_MAPPING
    }-${this.owner.id.value}-${this.property.value.name}-${
      this.targetSetImplementation
        ? `-${this.targetSetImplementation.id.value}`
        : ''
    }-${this.owner.propertyMappings.indexOf(this)}`;
  }

  get isStub(): boolean {
    return this.transform.isStub;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.PURE_PROPERTY_MAPPING,
      super.hashCode,
      this.transformer?.id.value ?? '',
      this.transform,
      Boolean(this.explodeProperty).toString(),
    ]);
  }

  accept_PropertyMappingVisitor<T>(visitor: PropertyMappingVisitor<T>): T {
    return visitor.visit_PurePropertyMapping(this);
  }
}
