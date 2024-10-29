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
import { V1_FunctionActivator } from './V1_FunctionActivator.js';
import type { V1_PackageableElementVisitor } from '../V1_PackageableElement.js';
import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import type { V1_HostedServiceDeploymentConfiguration } from '../../../engine/functionActivator/V1_HostedServiceDeploymentConfiguration.js';

export class V1_HostedService extends V1_FunctionActivator {
  documentation: string | undefined;
  pattern!: string;
  autoActivateUpdates: boolean | undefined;
  storeModel: boolean | undefined;
  generateLineage: boolean | undefined;
  declare activationConfiguration:
    | V1_HostedServiceDeploymentConfiguration
    | undefined;

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_HostedService(this);
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.HOSTED_SERVICE,
      this.documentation ?? '',
      this.pattern,
      this.autoActivateUpdates,
      this.storeModel ?? '',
      this.generateLineage ?? '',
      this.activationConfiguration,
      this.ownership,
      hashArray(this.actions),
    ]);
  }
}
