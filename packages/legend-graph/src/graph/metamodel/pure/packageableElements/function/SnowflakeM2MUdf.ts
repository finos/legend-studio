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
import type { SnowflakeM2MUdfDeploymentConfiguration } from '../../functionActivator/SnowflakeM2MUdfDeploymentConfiguration.js';
import type { DeploymentOwner } from './Ownership.js';

export class SnowflakeM2MUdf extends FunctionActivator {
  udfName!: string;
  description: string | undefined;
  deploymentSchema: string | undefined;
  deploymentStage: string | undefined;
  declare ownership: DeploymentOwner;
  declare activationConfiguration: SnowflakeM2MUdfDeploymentConfiguration;
  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_SnowflakeM2MUdf(this);
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SNOWFLAKE_M2M_UDF,
      this.udfName,
      this.description ?? '',
      this.deploymentSchema ?? '',
      this.deploymentStage ?? '',
      this.ownership,
      this.activationConfiguration,
      hashArray(this.taggedValues),
      hashArray(this.stereotypes.map((val) => val.pointerHashCode)),
      hashArray(this.actions),
    ]);
  }
}
