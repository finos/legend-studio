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
import type { SnowflakeAppDeploymentConfiguration } from '../../functionActivator/DSL_SnowflakeApp_SnowflakeAppDeploymentConfiguration.js';
import type { SnowflakeAppType } from '../../functionActivator/DSL_SnowflakeApp_SnowflakeAppType.js';
import {
  type PackageableElementVisitor,
  FunctionActivator,
} from '@finos/legend-graph';
import { SNOWFLAKE_APP_HASH_STRUCTURE } from '../../../../../DSL_SnowflakeApp_HashUtils.js';

export class SnowflakeApp extends FunctionActivator {
  applicationName!: string;
  description: string | undefined;
  owner: string | undefined;
  declare activationConfiguration: SnowflakeAppDeploymentConfiguration;
  type: SnowflakeAppType | undefined;

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }

  override get hashCode(): string {
    return hashArray([
      SNOWFLAKE_APP_HASH_STRUCTURE.SNOWFLAKE_APP,
      this.applicationName,
      this.description ?? '',
      this.owner ?? '',
      this.activationConfiguration,
      this.type ?? '',
    ]);
  }
}
