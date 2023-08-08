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

import { type Hashable, hashArray } from '@finos/legend-shared';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Persistence_HashUtils.js';
import { hashObjectWithoutSourceInformation } from '@finos/legend-graph';

export abstract class V1_ActionIndicatorFields implements Hashable {
  abstract get hashCode(): string;
}

export class V1_NoActionIndicator implements V1_ActionIndicatorFields {
  get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.NO_ACTION_INDICATOR]);
  }
}

export abstract class V1_DeleteIndicator extends V1_ActionIndicatorFields {
  deleteValues!: string[];
}

export class V1_DeleteIndicatorForGraphFetch extends V1_DeleteIndicator {
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  deleteFieldPath!: object;

  get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.DELETE_INDICATOR_FOR_GRAPH_FETCH,
      hashObjectWithoutSourceInformation(this.deleteFieldPath),
    ]);
  }
}

export class V1_DeleteIndicatorForTds extends V1_DeleteIndicator {
  deleteField!: string;

  get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.DELETE_INDICATOR_FOR_TDS,
      this.deleteField,
    ]);
  }
}
