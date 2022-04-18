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

import type { Pair } from '@finos/legend-shared';
import {
  type ValueSpecificationVisitor,
  ValueSpecification,
} from './ValueSpecification';
import type { Multiplicity } from '../packageableElements/domain/Multiplicity';
import type { GenericTypeReference } from '../packageableElements/domain/GenericTypeReference';
import type { EnumValueReference } from '../packageableElements/domain/EnumValueReference';
import type { PackageableElementReference } from '../packageableElements/PackageableElementReference';
import type { EngineRuntime } from '../packageableElements/runtime/Runtime';
import type { Mapping } from '../packageableElements/mapping/Mapping';

/**
 * NOTE: {@link InstanceValue} is the only metamodel available in Pure.
 * Its subtypes are created in Studio so that we can narrow down the types of `values`.
 * Also, right now, we haven't done the full build/transform flow for value specification
 * we use the subtypes to make it easier to transform metamodel back into protocol.
 */
export class InstanceValue extends ValueSpecification {
  values: unknown[] = [];

  accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_InstanceValue(this);
  }
}

export class PrimitiveInstanceValue extends InstanceValue {
  override genericType: GenericTypeReference;

  constructor(genericType: GenericTypeReference, multiplicity: Multiplicity) {
    super(multiplicity, genericType);
    this.genericType = genericType;
  }

  override accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_PrimitiveInstanceValue(this);
  }
}

export class EnumValueInstanceValue extends InstanceValue {
  override values: EnumValueReference[] = [];

  constructor(genericType: GenericTypeReference, multiplicity: Multiplicity) {
    super(multiplicity, genericType);
  }

  override accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_EnumValueInstanceValue(this);
  }
}

export class RuntimeInstanceValue extends InstanceValue {
  override values: EngineRuntime[] = [];

  override accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_RuntimeInstanceValue(this);
  }
}

export class PairInstanceValue extends InstanceValue {
  override values: Pair<unknown, unknown>[] = []; // TODO: both of these entries might be ValueSpecification

  override accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_PairInstanceValue(this);
  }
}

export class MappingInstanceValue extends InstanceValue {
  override values: PackageableElementReference<Mapping>[] = [];

  override accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_MappingInstanceValue(this);
  }
}

export class PureListInstanceValue extends InstanceValue {
  override values: ValueSpecification[] = [];

  override accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_PureListInstanceValue(this);
  }
}

export class CollectionInstanceValue extends InstanceValue {
  override values: ValueSpecification[] = [];

  override accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_CollectionInstanceValue(this);
  }
}
