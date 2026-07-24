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

import { hashArray } from '@finos/legend-shared';
import {
  CORE_HASH_STRUCTURE,
  hashObjectWithoutSourceInformation,
} from '../../../../../graph/Core_HashUtils.js';
import { type PackageableElementVisitor } from '../PackageableElement.js';
import { INTERNAL__UnknownPackageableElement } from '../INTERNAL__UnknownPackageableElement.js';
import type { Testable } from '../../test/Testable.js';
import type { RawLambda } from '../../rawValueSpecification/RawLambda.js';
import type { AvailabilityTestSuite } from './AvailabilityTestSuite.js';
import type { Notification } from './Notification.js';
import type { AppDirNode } from '../ingest/IngestDefinition.js';

// NOTE: like `IngestDefinition`, we extend `INTERNAL__UnknownPackageableElement`
// so the raw JSON content coming from the engine is preserved on `.content` and
// the element does not fall back to unknown when the studio protocol schema
// happens to diverge from the engine's (e.g. new owner shape).
export class Availability
  extends INTERNAL__UnknownPackageableElement
  implements Testable
{
  barrier?: RawLambda | undefined;
  extraIngestDefinitions: string[] = [];
  notification: Notification | undefined;
  owner: AppDirNode | undefined;
  tests: AvailabilityTestSuite[] = [];

  override accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_Availability(this);
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.AVAILABILITY,
      this.path,
      hashObjectWithoutSourceInformation(this.content),
      hashArray(this.tests),
    ]);
  }
}
