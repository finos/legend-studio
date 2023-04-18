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

import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Persistence_HashUtils.js';
import type { V1_Connection, V1_ValueSpecification } from '@finos/legend-graph';
import { type Hashable, hashArray } from '@finos/legend-shared';

export class V1_ServiceParameter implements Hashable {
  name!: string;
  value!: V1_ServiceParameterValue;

  get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.SERVICE_PARAMETER,
      this.name,
      this.value,
    ]);
  }
}

export abstract class V1_ServiceParameterValue implements Hashable {
  abstract get hashCode(): string;
}

export class V1_PrimitiveTypeValue
  extends V1_ServiceParameterValue
  implements Hashable
{
  primitiveType!: V1_ValueSpecification;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.PRIMITIVE_TYPE_VALUE_SERVICE_PARAMETER,
      //TODO: ledav -- hash value specification
    ]);
  }
}

export class V1_ConnectionValue
  extends V1_ServiceParameterValue
  implements Hashable
{
  connection!: V1_Connection;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.CONNECTION_VALUE_SERVICE_PARAMETER,
      this.connection,
    ]);
  }
}
