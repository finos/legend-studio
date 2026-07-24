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
import {
  CORE_HASH_STRUCTURE,
  hashObjectWithoutSourceInformation,
} from '../../../../../../../graph/Core_HashUtils.js';
import { type V1_PackageableElementVisitor } from '../V1_PackageableElement.js';
import { V1_INTERNAL__UnknownPackageableElement } from '../V1_INTERNAL__UnknownPackageableElement.js';
import type { V1_AvailabilityTestSuite } from './V1_AvailabilityTestSuite.js';

// NOTE: the engine's Availability serializer emits `"_type": "Availability"`
// (PascalCase) rather than the camelCase convention used by other lakehouse
// elements such as `ingestDefinition` / `compute` / `dataProduct`. This must
// match the engine wire format exactly, otherwise `V1_deserializePackageableElement`
// falls through to the unknown-element branch and the studio renders the
// availability with the "?" icon.
export const V1_AVAILABILITY_ELEMENT_PROTOCOL_TYPE = 'Availability';

// NOTE: mirrors `V1_IngestDefinition` — the element extends
// `V1_INTERNAL__UnknownPackageableElement` so the engine's raw JSON payload is
// stored on `.content`. Only the typed pieces the studio needs to render its
// tabs (currently the testing tab) are lifted out into typed fields.
export class V1_Availability
  extends V1_INTERNAL__UnknownPackageableElement
  implements Hashable
{
  testSuites: V1_AvailabilityTestSuite[] = [];

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.AVAILABILITY,
      this.path,
      hashObjectWithoutSourceInformation(this.content),
      hashArray(this.testSuites),
    ]);
  }

  override accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_Availability(this);
  }
}
