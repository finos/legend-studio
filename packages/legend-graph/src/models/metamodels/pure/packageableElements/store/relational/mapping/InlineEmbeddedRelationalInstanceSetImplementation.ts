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

import { observable, makeObservable } from 'mobx';
import { EmbeddedRelationalInstanceSetImplementation } from './EmbeddedRelationalInstanceSetImplementation';
import type { InlineEmbeddedSetImplementation } from '../../../mapping/EmbeddedSetImplementation';
import type {
  SetImplementation,
  SetImplementationVisitor,
} from '../../../mapping/SetImplementation';
import type { PropertyMappingVisitor } from '../../../mapping/PropertyMapping';
import type { PropertyMappingsImplementation } from '../../../mapping/PropertyMappingsImplementation';
import type { PropertyReference } from '../../../domain/PropertyReference';
import type { RootRelationalInstanceSetImplementation } from './RootRelationalInstanceSetImplementation';
import type { PackageableElementReference } from '../../../PackageableElementReference';
import type { Class } from '../../../domain/Class';
import type { InferableMappingElementIdValue } from '../../../mapping/InferableMappingElementId';
import { hashArray, UnsupportedOperationError } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';

export class InlineEmbeddedRelationalInstanceSetImplementation
  extends EmbeddedRelationalInstanceSetImplementation
  implements InlineEmbeddedSetImplementation
{
  inlineSetImplementation!: SetImplementation;

  constructor(
    owner: PropertyMappingsImplementation,
    property: PropertyReference,
    rootInstanceSetImplementation: RootRelationalInstanceSetImplementation,
    source: SetImplementation,
    _class: PackageableElementReference<Class>,
    id: InferableMappingElementIdValue,
    target?: SetImplementation,
  ) {
    super(
      owner,
      property,
      rootInstanceSetImplementation,
      source,
      _class,
      id,
      target,
    );

    makeObservable(this, {
      inlineSetImplementation: observable,
    });
  }

  override accept_PropertyMappingVisitor<T>(
    visitor: PropertyMappingVisitor<T>,
  ): T {
    return visitor.visit_InlineEmbeddedRelationalPropertyMapping(this);
  }

  override accept_SetImplementationVisitor<T>(
    visitor: SetImplementationVisitor<T>,
  ): T {
    throw new UnsupportedOperationError();
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.INLINE_EMBEDDED_REALTIONAL_PROPERTY_MAPPING,
      this.property.pointerHashCode,
      this.inlineSetImplementation.id.valueForSerialization ?? '',
    ]);
  }
}
