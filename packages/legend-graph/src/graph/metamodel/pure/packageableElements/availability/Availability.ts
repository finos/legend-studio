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
import { CORE_HASH_STRUCTURE } from '../../../../../graph/Core_HashUtils.js';
import {
  PackageableElement,
  type PackageableElementVisitor,
} from '../PackageableElement.js';
import type { Testable } from '../../test/Testable.js';
import type { RawLambda } from '../../rawValueSpecification/RawLambda.js';
import type { AvailabilityTestSuite } from './AvailabilityTestSuite.js';
import type { Notification } from './Notification.js';
import type { AppDirNode } from '../ingest/IngestDefinition.js';

export class Availability extends PackageableElement implements Testable {
  barrier!: RawLambda;
  extraIngestDefinitions: string[] = [];
  notification: Notification | undefined;
  owner: AppDirNode | undefined;
  tests: AvailabilityTestSuite[] = [];

  override accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }

  protected override get _elementHashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.AVAILABILITY,
      this.path,
      this.barrier,
      hashArray(this.extraIngestDefinitions),
      this.notification ?? '',
      this.owner ?? '',
      hashArray(this.tests),
    ]);
  }
}
