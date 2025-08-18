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

import { V1_Multiplicity } from '../../packageableElements/domain/V1_Multiplicity.js';
import {
  V1_ValueSpecification,
  type V1_ValueSpecificationVisitor,
} from '../V1_ValueSpecification.js';
import { hashArray } from '@finos/legend-shared';
import {
  CORE_HASH_STRUCTURE,
  hashObjectWithoutSourceInformation,
} from '../../../../../../../graph/Core_HashUtils.js';

/**
 * This is the mechanism by which we scale the system. Pretty much any constructs like
 * graph-fetch, path, etc, which have the need to store some data and manifest in value
 * specification space can be wrapped in form of a class instance. Here, we also keep
 * track of the type in order to interpret the value for processing.
 */
export class V1_ClassInstance extends V1_ValueSpecification {
  readonly multiplicity = V1_Multiplicity.ONE;
  type!: string;
  value!: unknown;

  accept_ValueSpecificationVisitor<T>(
    visitor: V1_ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_ClassInstance(this);
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.INSTANCE_VALUE,
      this.type,
      this.multiplicity,
      hashObjectWithoutSourceInformation([this.value]),
    ]);
  }
}
