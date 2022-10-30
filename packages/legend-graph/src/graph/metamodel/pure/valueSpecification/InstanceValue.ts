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
import {
  type ValueSpecificationVisitor,
  ValueSpecification,
} from './ValueSpecification.js';
import { Multiplicity } from '../packageableElements/domain/Multiplicity.js';
import type { GenericTypeReference } from '../packageableElements/domain/GenericTypeReference.js';
import type { EnumValueReference } from '../packageableElements/domain/EnumValueReference.js';
import {
  CORE_HASH_STRUCTURE,
  hashObjectWithoutSourceInformation,
} from '../../../Core_HashUtils.js';

/**
 * NOTE: Theoretically {@link InstanceValue} is the only metamodel available in Pure.
 * Its subtypes are created in Studio so that we can narrow down the types of `values`
 * since we don't have powerful type matching like in Pure. Also, due to that, these
 * subtypes of {@link InstanceValue}  make it easier to transform metamodel back into protocol.
 * See https://github.com/finos/legend-engine/blob/94cd0aff3b314e568e830773f7200c8245baa09b/legend-engine-pure-code-compiled-core/src/main/resources/core/pure/protocol/vX_X_X/transfers/valueSpecification.pure#L254
 *
 * @discrepancy model
 */
export class InstanceValue extends ValueSpecification implements Hashable {
  values: unknown[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.INSTANCE_VALUE,
      this.genericType?.ownerReference.valueForSerialization ?? '',
      this.multiplicity,
      hashObjectWithoutSourceInformation(this.values),
    ]);
  }

  accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_InstanceValue(this);
  }
}

export class PrimitiveInstanceValue extends InstanceValue implements Hashable {
  override genericType: GenericTypeReference;

  constructor(genericType: GenericTypeReference) {
    super(Multiplicity.ONE, genericType);
    this.genericType = genericType;
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.PRIMITIVE_INSTANCE_VALUE,
      this.genericType.ownerReference.valueForSerialization ?? '',
      this.multiplicity,
      hashObjectWithoutSourceInformation(this.values),
    ]);
  }

  override accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_PrimitiveInstanceValue(this);
  }
}

export class EnumValueInstanceValue extends InstanceValue implements Hashable {
  override values: EnumValueReference[] = [];

  constructor(genericType: GenericTypeReference) {
    super(Multiplicity.ONE, genericType);
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.ENUM_INSTANCE_VALUE,
      this.genericType?.ownerReference.valueForSerialization ?? '',
      this.multiplicity,
      hashArray(
        this.values.map(
          (value) => value.ownerReference.valueForSerialization ?? '',
        ),
      ),
    ]);
  }

  override accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_EnumValueInstanceValue(this);
  }
}

export class CollectionInstanceValue extends InstanceValue implements Hashable {
  override values: ValueSpecification[] = [];

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.COLLECTION_INSTANCE_VALUE,
      this.genericType?.ownerReference.valueForSerialization ?? '',
      this.multiplicity,
      hashArray(this.values),
    ]);
  }

  override accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_CollectionInstanceValue(this);
  }
}
