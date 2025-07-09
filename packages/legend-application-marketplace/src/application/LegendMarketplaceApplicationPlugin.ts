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

import { LegendApplicationPlugin } from '@finos/legend-application';
import type { LegendMarketplacePluginManager } from '../application/LegendMarketplacePluginManager.js';
import type { DataProductGroupAccessState } from '../stores/lakehouse/DataProductDataAccessState.js';
import type { V1_OrganizationalScope } from '@finos/legend-graph';
import type { LegendMarketplaceBaseStore } from '../stores/LegendMarketplaceBaseStore.js';

export type ContractConsumerTypeRendererConfig = {
  type: string;
  createContractRenderer: (
    marketplaceBaseStore: LegendMarketplaceBaseStore,
    accessGroupState: DataProductGroupAccessState,
    handleOrganizationalScopeChange: (consumer: V1_OrganizationalScope) => void,
    handleDescriptionChange: (description: string | undefined) => void,
    handleIsValidChange: (isValid: boolean) => void,
  ) => React.ReactNode;
  getOrganizationalScopeDetails?: (
    consumer: V1_OrganizationalScope,
  ) => string | undefined;
};

export abstract class LegendMarketplaceApplicationPlugin extends LegendApplicationPlugin {
  /**
   * This helps to better type-check for this empty abtract type
   * See https://github.com/finos/legend-studio/blob/master/docs/technical/typescript-usage.md#understand-typescript-structual-type-system
   */
  private readonly _$nominalTypeBrand!: 'LegendMarketplaceApplicationPlugin';

  install(pluginManager: LegendMarketplacePluginManager): void {
    pluginManager.registerApplicationPlugin(this);
  }

  /**
   * Config to handle different types of contract consumers, including configuration for:
   * - Contract creation dialog renderer
   * - Stringify organizational scope
   */
  getContractConsumerTypeRendererConfigs?(): ContractConsumerTypeRendererConfig[];
}
