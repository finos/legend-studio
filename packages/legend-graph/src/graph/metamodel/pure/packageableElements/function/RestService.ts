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
import type { RestServiceDeploymentConfiguration } from '../../functionActivator/RestServiceDeploymentConfiguration.js';
import type { RestServiceOwnership } from './RestServiceOwnership.js';

export const DEFAULT_REST_SERVICE_PATTERN = '/';

export class RestService extends FunctionActivator {
  documentation: string | undefined;
  ownership: RestServiceOwnership | undefined;
  pattern = '/';
  autoActivateUpdates: boolean | undefined;
  storeModel: boolean | undefined;
  generateLineage: boolean | undefined;
  declare activationConfiguration: RestServiceDeploymentConfiguration;

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
    return visitor.visit_RestService(this);
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.REST_SERVICE,
      this.documentation ?? '',
      this.ownership ?? '',
      this.pattern,
      this.autoActivateUpdates,
      this.storeModel ?? '',
      this.generateLineage ?? '',
      this.activationConfiguration,
    ]);
  }
}
