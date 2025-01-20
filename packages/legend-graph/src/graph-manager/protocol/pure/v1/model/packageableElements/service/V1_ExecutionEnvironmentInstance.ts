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
import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import type { V1_Runtime } from '../runtime/V1_Runtime.js';
import {
  type V1_PackageableElementPointer,
  type V1_PackageableElementVisitor,
  V1_PackageableElement,
} from '../V1_PackageableElement.js';

export class V1_ExecutionEnvironmentInstance
  extends V1_PackageableElement
  implements Hashable
{
  executionParameters: V1_ExecutionParameters[] = [];

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.EXECUTION_ENVIRONMENT_INSTANCE,
      this.path,
      hashArray(this.executionParameters),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_ExecutionEnvironmentInstance(this);
  }
}

export abstract class V1_ExecutionParameters implements Hashable {
  abstract get hashCode(): string;
}

export class V1_RuntimeComponents implements Hashable {
  runtime!: V1_Runtime;
  binding!: V1_PackageableElementPointer;
  clazz!: V1_PackageableElementPointer;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RUNTIME_COMPONENTS,
      this.binding.path,
      this.clazz.path,
      this.runtime,
    ]);
  }
}

export class V1_SingleExecutionParameters
  extends V1_ExecutionParameters
  implements Hashable
{
  key!: string;
  mapping!: string;
  runtime?: V1_Runtime;
  runtimeComponents?: V1_RuntimeComponents;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SINGLE_EXECUTION_PARAMETER,
      this.key,
      this.mapping,
      this.runtime ?? '',
      this.runtimeComponents ?? '',
    ]);
  }
}

export class V1_MultiExecutionParameters
  extends V1_ExecutionParameters
  implements Hashable
{
  masterKey!: string;
  singleExecutionParameters: V1_SingleExecutionParameters[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MULTI_EXECUTION_PARAMETER,
      this.masterKey,
      hashArray(this.singleExecutionParameters),
    ]);
  }
}
