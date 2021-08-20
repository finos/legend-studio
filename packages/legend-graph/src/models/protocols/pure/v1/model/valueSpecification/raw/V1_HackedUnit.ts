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

import type { V1_ValueSpecificationVisitor } from '../V1_ValueSpecification';
import { V1_ValueSpecification } from '../V1_ValueSpecification';

/**
 * @deprecated
 *
 * We might eventually make it similar to HackedClass where we make it a subclass of PackageableElementPtr
 */
export class V1_HackedUnit extends V1_ValueSpecification {
  unitType!: string;

  accept_ValueSpecificationVisitor<T>(
    visitor: V1_ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_HackedUnit(this);
  }
}
