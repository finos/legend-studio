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
import { UnsupportedOperationError } from 'Utilities/GeneralUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { object, serializable, list } from 'serializr';
import { PackageableElement, PackageableElementVisitor } from 'V1/model/packageableElements/PackageableElement';
import { Lambda } from 'V1/model/valueSpecification/raw/Lambda';

export class Unit extends PackageableElement implements Hashable {
  @serializable measure!: string;
  @serializable(object(Lambda)) conversionFunction!: Lambda;

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.UNIT,
      this.measure,
      this.conversionFunction,
    ]);
  }

  accept_PackageableElementVisitor<T>(visitor: PackageableElementVisitor<T>): T {
    throw new UnsupportedOperationError();
  }
}

export class Measure extends PackageableElement implements Hashable {
  @serializable(object(Unit)) canonicalUnit!: Unit;
  @serializable(list(object(Unit))) nonCanonicalUnits: Unit[] = [];

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.MEASURE,
      super.hashCode,
      this.canonicalUnit,
      hashArray(this.nonCanonicalUnits),
    ]);
  }

  accept_PackageableElementVisitor<T>(visitor: PackageableElementVisitor<T>): T {
    return visitor.visit_Measure(this);
  }
}
