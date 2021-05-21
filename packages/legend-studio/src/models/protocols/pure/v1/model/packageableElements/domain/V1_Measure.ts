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

import {
  hashArray,
  UnsupportedOperationError,
} from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../MetaModelConst';
import type { V1_PackageableElementVisitor } from '../../../model/packageableElements/V1_PackageableElement';
import { V1_PackageableElement } from '../../../model/packageableElements/V1_PackageableElement';
import type { V1_RawLambda } from '../../../model/rawValueSpecification/V1_RawLambda';

export class V1_Unit extends V1_PackageableElement implements Hashable {
  measure!: string;
  conversionFunction?: V1_RawLambda; // @MARKER GENERATED MODEL DISCREPANCY --- Studio does not process lambda
  //  superType!: string; // no clear purpose to this so we won't add it for now

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.UNIT,
      this.measure,
      this.conversionFunction ?? '',
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    throw new UnsupportedOperationError();
  }
}

export class V1_Measure extends V1_PackageableElement implements Hashable {
  canonicalUnit?: V1_Unit;
  nonCanonicalUnits: V1_Unit[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MEASURE,
      super.hashCode,
      this.canonicalUnit ?? '',
      hashArray(this.nonCanonicalUnits),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_Measure(this);
  }
}
