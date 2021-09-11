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

import { observable, makeObservable, action } from 'mobx';
import { deleteEntry, addUniqueEntry } from '@finos/legend-shared';
import type { Pair } from '@finos/legend-shared';
import type { ValueSpecificationVisitor } from './ValueSpecification';
import { ValueSpecification } from './ValueSpecification';
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

  deleteValue(val: unknown): void {
    deleteEntry(this.values, val);
  }

  addValue(val: unknown): void {
    addUniqueEntry(this.values, val);
  }

  changeValue(val: unknown, idx: number): void {
    this.values[idx] = val;
  }

  changeValues(val: unknown[]): void {
    this.values = val;
  }

  accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_InstanceValue(this);
  }
}

export class PrimitiveInstanceValue extends InstanceValue {
  override genericType: GenericTypeReference;

  // NOTE: when we support editing more types, we should move observability to fields like `values` to parent class
  constructor(genericType: GenericTypeReference, multiplicity: Multiplicity) {
    super(multiplicity, undefined);
    this.genericType = genericType;

    makeObservable<PrimitiveInstanceValue>(this, {
      genericType: observable,
      values: observable,
      deleteValue: action,
      addValue: action,
      changeValue: action,
    });
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
    super(multiplicity, undefined);
    this.genericType = genericType;

    makeObservable<EnumValueInstanceValue>(this, {
      genericType: observable,
      values: observable,
      deleteValue: action,
      addValue: action,
      changeValue: action,
    });
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
  override values: Pair<unknown, unknown>[] = [];

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
    return visitor.visit_PureListInsanceValue(this);
  }
}

export class CollectionInstanceValue extends InstanceValue {
  override values: ValueSpecification[] = [];

  constructor(
    multiplicity: Multiplicity,
    genericTypeReference?: GenericTypeReference,
  ) {
    super(multiplicity, genericTypeReference);

    makeObservable<CollectionInstanceValue>(this, {
      genericType: observable,
      values: observable,
      changeValues: action,
    });
  }

  override accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_CollectionInstanceValue(this);
  }
}
