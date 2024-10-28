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

import { hashArray, uniq } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../Core_HashUtils.js';
import type { PackageableElementVisitor } from '../PackageableElement.js';
import { FunctionActivator } from './FunctionActivator.js';
import type { HostedServiceDeploymentConfiguration } from '../../functionActivator/HostedServiceDeploymentConfiguration.js';

export const DEFAULT_HOSTED_SERVICE_PATTERN = '/';

export class HostedService extends FunctionActivator {
  documentation: string | undefined;
  pattern = '/';
  autoActivateUpdates: boolean | undefined;
  storeModel: boolean | undefined;
  generateLineage: boolean | undefined;
  declare activationConfiguration:
    | HostedServiceDeploymentConfiguration
    | undefined;

  get patternParameters(): string[] {
    return uniq(
      (this.pattern.match(/\{\w+\}/gu) ?? []).map((parameter) =>
        parameter.substring(1, parameter.length - 1),
      ),
    );
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
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
