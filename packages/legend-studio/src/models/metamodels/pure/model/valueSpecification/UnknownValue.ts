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

import { Multiplicity } from '../packageableElements/domain/Multiplicity';
import type { ValueSpecificationVisitor } from './ValueSpecification';
import { ValueSpecification } from './ValueSpecification';

/* @MARKER: INTERNAL SUBTYPE --- this unofficial subtype is used for hold value of types we don't process */
export class UnknownValue extends ValueSpecification {
  content: object;

  constructor(content: object) {
    super(new Multiplicity(0, 0));
    this.content = content;
  }

  accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_UnknownValue(this);
  }
}
