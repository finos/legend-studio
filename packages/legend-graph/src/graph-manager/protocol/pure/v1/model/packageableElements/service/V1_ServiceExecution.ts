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

import { hashArray, type Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import type { V1_Runtime } from '../../../model/packageableElements/runtime/V1_Runtime.js';
import type { V1_RawLambda } from '../../../model/rawValueSpecification/V1_RawLambda.js';

export abstract class V1_ServiceExecution implements Hashable {
  abstract get hashCode(): string;
}

export abstract class V1_PureExecution
  extends V1_ServiceExecution
  implements Hashable
{
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  func!: V1_RawLambda;

  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.SERVICE_PURE_EXECUTION, this.func]);
  }
}

export class V1_PureSingleExecution
  extends V1_PureExecution
  implements Hashable
{
  mapping: string | undefined;
  runtime: V1_Runtime | undefined;

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_PURE_SINGLE_EXECUTION,
      super.hashCode,
      this.mapping ?? '',
      this.runtime ?? '',
    ]);
  }
}

export class V1_KeyedExecutionParameter implements Hashable {
  key!: string;
  mapping!: string;
  runtime!: V1_Runtime;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_KEYED_EXECUTION_PARAMETER,
      this.key,
      this.mapping,
      this.runtime,
    ]);
  }
}

export class V1_PureMultiExecution
  extends V1_PureExecution
  implements Hashable
{
  executionKey: string | undefined;
  executionParameters: V1_KeyedExecutionParameter[] | undefined;

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE_PURE_MULTI_EXECUTION,
      super.hashCode,
      this.executionKey,
      hashArray(this.executionParameters ?? []),
    ]);
  }
}
