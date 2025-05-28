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

import type { V1_AppDirNode } from '../../../lakehouse/entitlements/V1_CoreEntitlements.js';
import { V1_INTERNAL__UnknownPackageableElement } from '../V1_INTERNAL__UnknownPackageableElement.js';
import type { V1_PackageableElementVisitor } from '../V1_PackageableElement.js';

export const V1_INGEST_DEFINITION_TYPE = 'ingestDefinition';

export class V1_IngestDefinition extends V1_INTERNAL__UnknownPackageableElement {
  appDirDeployment: V1_AppDirNode | undefined;

  override accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_IngestDefinition(this);
  }
}
