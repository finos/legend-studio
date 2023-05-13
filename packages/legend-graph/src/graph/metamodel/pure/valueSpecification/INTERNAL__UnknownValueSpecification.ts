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
  type Hashable,
  hashArray,
  type PlainObject,
} from '@finos/legend-shared';
import {
  CORE_HASH_STRUCTURE,
  hashObjectWithoutSourceInformation,
} from '../../../Core_HashUtils.js';
import { Multiplicity } from '../packageableElements/domain/Multiplicity.js';
import {
  type ValueSpecificationVisitor,
  ValueSpecification,
} from './ValueSpecification.js';

/**
 * This value specification is used to hold a value specification type that we can't yet handle
 * It wraps the protocol JSON of the unknown value specification.
 *
 * @internal This type is specific to Studio only, not a standard, recognizeable in Pure/engine.
 */
export class INTERNAL__UnknownValueSpecification
  extends ValueSpecification
  implements Hashable
{
  readonly content: PlainObject;

  constructor(content: PlainObject) {
    super(Multiplicity.ZERO);

    this.content = content;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.INTERNAL__UNKNOWN_VALUE_SPECIFICATION,
      hashObjectWithoutSourceInformation(this.content),
      this.genericType?.ownerReference.valueForSerialization ?? '',
    ]);
  }

  accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_INTERNAL__UnknownValueSpecification(this);
  }
}
