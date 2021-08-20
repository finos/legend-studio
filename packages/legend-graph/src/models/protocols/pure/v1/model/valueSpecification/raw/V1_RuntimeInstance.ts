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

import type { V1_Runtime } from '../../../model/packageableElements/runtime/V1_Runtime';
import type { V1_ValueSpecificationVisitor } from '../../../model/valueSpecification/V1_ValueSpecification';
import { V1_ValueSpecification } from '../../../model/valueSpecification/V1_ValueSpecification';

export class V1_RuntimeInstance extends V1_ValueSpecification {
  runtime!: V1_Runtime;

  accept_ValueSpecificationVisitor<T>(
    visitor: V1_ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_RuntimeInstance(this);
  }
}
