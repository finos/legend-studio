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
  type V1_ValueSpecificationVisitor,
  V1_ValueSpecification,
} from '../../../model/valueSpecification/V1_ValueSpecification.js';
import { V1_Multiplicity } from '../../packageableElements/domain/V1_Multiplicity.js';
import type { V1_Type } from '../../packageableElements/type/V1_Type.js';

export class V1_PackageableElementPtr extends V1_ValueSpecification {
  readonly multiplicity = V1_Multiplicity.ONE;
  fullPath!: string;

  accept_ValueSpecificationVisitor<T>(
    visitor: V1_ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_PackageableElementPtr(this);
  }
}

export class V1_PackageableType
  extends V1_PackageableElementPtr
  implements V1_Type
{
  get hashCode(): string {
    return this.fullPath;
  }
}
