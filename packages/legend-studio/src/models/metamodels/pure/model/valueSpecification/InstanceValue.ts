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
import {
  deleteEntry,
  addUniqueEntry,
  hashArray,
  isString,
} from '@finos/legend-studio-shared';
import type { Pair } from '@finos/legend-studio-shared';
import type { Type } from '../../model/packageableElements/domain/Type';
import type { ValueSpecificationVisitor } from './ValueSpecification';
import { ValueSpecification } from './ValueSpecification';
import type { Multiplicity } from '../../model/packageableElements/domain/Multiplicity';
import type { GenericTypeReference } from '../../model/packageableElements/domain/GenericTypeReference';
import type { EnumValueReference } from '../../model/packageableElements/domain/EnumValueReference';
import type { PackageableElementReference } from '../../model/packageableElements/PackageableElementReference';
import type { Enumeration } from '../../model/packageableElements/domain/Enumeration';
import type { EngineRuntime } from '../../model/packageableElements/runtime/Runtime';
import type { Mapping } from '../../model/packageableElements/mapping/Mapping';
import {
  CORE_HASH_STRUCTURE,
  PRIMITIVE_TYPE,
} from '../../../../MetaModelConst';

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

const getHashStructure = (val: string): string => {
  switch (val) {
    case PRIMITIVE_TYPE.STRICTDATE:
      return CORE_HASH_STRUCTURE.CSTRICT_DATE;
    case PRIMITIVE_TYPE.LATESTDATE:
      return CORE_HASH_STRUCTURE.CLATEST_DATE;
    case PRIMITIVE_TYPE.DATETIME:
      return CORE_HASH_STRUCTURE.CDATE_TIME;
    case PRIMITIVE_TYPE.STRICTTIME:
      return CORE_HASH_STRUCTURE.CSTRICT_TIME;
    default:
      return val;
  }
};

export class PrimitiveInstanceValue extends InstanceValue {
  genericType: GenericTypeReference;

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

  accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_PrimitiveInstanceValue(this);
  }

  get hashCode(): string {
    const values =
      this.values.length && isString(this.values[0]) ? this.values : [];
    return hashArray([
      getHashStructure(this.genericType.value.rawType.path),
      this.multiplicity,
      hashArray(values as string[]),
    ]);
  }
}

export class ClassInstanceValue extends InstanceValue {
  genericType: GenericTypeReference;
  values: PackageableElementReference<Type>[] = [];

  constructor(genericType: GenericTypeReference, multiplicity: Multiplicity) {
    super(multiplicity, undefined);
    this.genericType = genericType;
  }

  accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_ClassInstanceValue(this);
  }
}

export class EnumerationInstanceValue extends InstanceValue {
  values: PackageableElementReference<Enumeration>[] = [];
  constructor(genericType: GenericTypeReference, multiplicity: Multiplicity) {
    super(multiplicity, undefined);
    this.genericType = genericType;
  }

  accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_EnumerationInstanceValue(this);
  }
}

export class EnumValueInstanceValue extends InstanceValue {
  values: EnumValueReference[] = [];

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

  accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_EnumValueInstanceValue(this);
  }
}

export class RuntimeInstanceValue extends InstanceValue {
  values: EngineRuntime[] = [];

  accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_RuntimeInstanceValue(this);
  }
}

export class PairInstanceValue extends InstanceValue {
  values: Pair<unknown, unknown>[] = [];

  accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_PairInstanceValue(this);
  }
}

export class MappingInstanceValue extends InstanceValue {
  values: PackageableElementReference<Mapping>[] = [];

  accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_MappingInstanceValue(this);
  }
}

export class PureListInstanceValue extends InstanceValue {
  values: ValueSpecification[] = [];

  accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_PureListInsanceValue(this);
  }
}

export class CollectionInstanceValue extends InstanceValue {
  values: ValueSpecification[] = [];

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

  accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_CollectionInstanceValue(this);
  }
}
