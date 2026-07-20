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
import {
  V1_PackageableElement,
  type V1_PackageableElementVisitor,
} from '../V1_PackageableElement.js';
import type { V1_AvailabilityTestSuite } from './V1_AvailabilityTestSuite.js';
import type { V1_Notification } from './V1_Notification.js';
import type { V1_AppDirNode } from '../../../lakehouse/entitlements/V1_CoreEntitlements.js';
import type { V1_RawLambda } from '../../rawValueSpecification/V1_RawLambda.js';

export const V1_AVAILABILITY_ELEMENT_PROTOCOL_TYPE = 'availability';

export class V1_Availability extends V1_PackageableElement implements Hashable {
  barrier!: V1_RawLambda;
  extraIngestDefinitions: string[] = [];
  notification: V1_Notification | undefined;
  owner: V1_AppDirNode | undefined;
  testSuites: V1_AvailabilityTestSuite[] = [];

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.AVAILABILITY,
      this.package,
      this.name,
      this.barrier,
      hashArray(this.extraIngestDefinitions),
      this.notification ?? '',
      this.owner ?? '',
      hashArray(this.testSuites),
    ]);
  }

  override accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}
