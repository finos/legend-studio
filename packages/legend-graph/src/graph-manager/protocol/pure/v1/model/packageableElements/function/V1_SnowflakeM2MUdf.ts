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
import type { V1_SnowflakeM2MUdfDeploymentConfiguration } from '../../../engine/functionActivator/V1_SnowflakeM2MUdfDeploymentConfiguration.js';
import type { V1_DeploymentOwner } from './V1_Ownership.js';

export class V1_SnowflakeM2MUdf extends V1_FunctionActivator {
  udfName!: string;
  description: string | undefined;
  deploymentSchema: string | undefined;
  deploymentStage: string | undefined;
  declare ownership: V1_DeploymentOwner;
  declare activationConfiguration: V1_SnowflakeM2MUdfDeploymentConfiguration;

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
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
      hashArray(this.stereotypes),
      hashArray(this.actions),
    ]);
  }
}
