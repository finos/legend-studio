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
import { CORE_HASH_STRUCTURE } from '../../../../Core_HashUtils.js';
import type { PackageableElementVisitor } from '../PackageableElement.js';
import { FunctionActivator } from './FunctionActivator.js';
import type { SnowflakeAppDeploymentConfiguration } from '../../functionActivator/SnowflakeAppDeploymentConfiguration.js';
import type { DeploymentOwner } from './Ownership.js';

export enum SnowflakePermissionScheme {
  DEFAULT = 'DEFAULT',
  SEQUESTERED = 'SEQUESTERED',
}

export class SnowflakeApp extends FunctionActivator {
  applicationName!: string;
  description: string | undefined;
  permissionScheme?: SnowflakePermissionScheme;
  usageRole?: string | undefined;
  declare ownership: DeploymentOwner;
  declare activationConfiguration: SnowflakeAppDeploymentConfiguration;
  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_SnowflakeApp(this);
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SNOWFLAKE_APP,
      this.applicationName,
      this.description ?? '',
      this.permissionScheme ?? '',
      this.usageRole ?? '',
      this.ownership,
      this.activationConfiguration,
      hashArray(this.taggedValues),
      hashArray(this.stereotypes.map((val) => val.pointerHashCode)),
    ]);
  }
}
