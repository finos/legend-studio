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

import type { V1_Notifier } from './V1_DSL_Persistence_Notifier.js';
import type { V1_Persister } from './V1_DSL_Persistence_Persister.js';
import type { V1_Trigger } from './V1_DSL_Persistence_Trigger.js';
import {
  V1_PackageableElement,
  type V1_PackageableElementPointer,
  type V1_PackageableElementVisitor,
} from '@finos/legend-graph';
import { type Hashable, hashArray } from '@finos/legend-shared';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../../../graph/DSL_Persistence_HashUtils.js';
import type { V1_PersistenceTest } from './V1_DSL_Persistence_PersistenceTest.js';
import type { V1_ServiceOutputTarget as V1_ServiceOutputTarget } from './V1_DSL_Persistence_ServiceOutputTarget.js';

export class V1_Persistence extends V1_PackageableElement implements Hashable {
  documentation!: string;
  trigger!: V1_Trigger;
  service!: V1_PackageableElementPointer;
  persister?: V1_Persister | undefined;
  serviceOutputTargets?: V1_ServiceOutputTarget[] | undefined;
  notifier!: V1_Notifier;
  tests: V1_PersistenceTest[] = [];

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.PERSISTENCE,
      this.documentation,
      this.trigger,
      this.service.path,
      hashArray(this.serviceOutputTargets ?? []),
      this.persister ?? '',
      this.notifier,
      hashArray(this.tests),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}
