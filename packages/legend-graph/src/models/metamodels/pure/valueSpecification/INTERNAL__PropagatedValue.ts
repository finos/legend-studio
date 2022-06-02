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
  ValueSpecification,
  type ValueSpecificationVisitor,
} from './ValueSpecification.js';

/**
 * This value specification maintains a reference to another value specification
 *
 * @internal This type is specific to Studio only, not a standard, recognizeable in Pure/engine.
 */
export class INTERNAL__PropagatedValue extends ValueSpecification {
  getValue!: () => ValueSpecification;

  accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_INTERNAL__PropagatedValue(this);
  }
}
