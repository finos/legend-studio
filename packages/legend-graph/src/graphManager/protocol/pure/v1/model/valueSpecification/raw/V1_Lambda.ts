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

import type { V1_Variable } from '../../../model/valueSpecification/V1_Variable.js';
import type {
  V1_ValueSpecification,
  V1_ValueSpecificationVisitor,
} from '../V1_ValueSpecification.js';
import { V1_CoreClassInstance } from './V1_CoreClassInstance.js';

export class V1_Lambda extends V1_CoreClassInstance {
  body: V1_ValueSpecification[] = [];
  parameters: V1_Variable[] = [];

  accept_ValueSpecificationVisitor<T>(
    visitor: V1_ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_Lambda(this);
  }
}
