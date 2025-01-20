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
import { CORE_HASH_STRUCTURE } from '../../../../../graph/Core_HashUtils.js';
import type { Mapping } from '../mapping/Mapping.js';
import type { Runtime } from '../runtime/Runtime.js';
import {
  type PackageableElementVisitor,
  PackageableElement,
} from '../PackageableElement.js';
import type { PackageableElementReference } from '../PackageableElementReference.js';
import type { Class } from '../domain/Class.js';
import type { Binding } from '../externalFormat/store/DSL_ExternalFormat_Binding.js';

export class ExecutionEnvironmentInstance
  extends PackageableElement
  implements Hashable
{
  executionParameters: ExecutionParameters[] = [];

  protected override get _elementHashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.EXECUTION_ENVIRONMENT_INSTANCE,
      this.path,
      hashArray(this.executionParameters),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_ExecutionEnvironmentInstance(this);
  }
}

export abstract class ExecutionParameters implements Hashable {
  abstract get hashCode(): string;
}

export class RuntimeComponents implements Hashable {
  runtime!: Runtime;
  binding!: PackageableElementReference<Binding>;
  clazz!: PackageableElementReference<Class>;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RUNTIME_COMPONENTS,
      this.binding.valueForSerialization ?? '',
      this.clazz.valueForSerialization ?? '',
      this.runtime,
    ]);
  }
}

export class SingleExecutionParameters implements Hashable {
  key!: string;
  mapping!: PackageableElementReference<Mapping>;
  runtime?: Runtime;
  runtimeComponents?: RuntimeComponents;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SINGLE_EXECUTION_PARAMETER,
      this.key,
      this.mapping.valueForSerialization ?? '',
      this.runtime ?? '',
      this.runtimeComponents ?? '',
    ]);
  }
}

export class MultiExecutionParameters implements Hashable {
  masterKey!: string;
  singleExecutionParameters: SingleExecutionParameters[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MULTI_EXECUTION_PARAMETER,
      this.masterKey,
      hashArray(this.singleExecutionParameters),
    ]);
  }
}
