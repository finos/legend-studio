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
import type { LegendMarketplaceBaseStore } from '../stores/LegendMarketplaceBaseStore.js';
import type {
  ContractConsumerTypeRendererConfig,
  DataProductDataAccess_LegendApplicationPlugin_Extension,
  AccessPointGroupAccess,
  DataProductAccessPointCodeConfiguration,
} from '@finos/legend-extension-dsl-data-product';
import type { ProductCardState } from '../stores/lakehouse/dataProducts/ProductCardState.js';
import type React from 'react';
import type { PlainObject } from '@finos/legend-shared';

export interface AdditionalMarketplacePageConfig {
  path: string;
  component: React.FC;
  protected: boolean;
}

export interface AdditionalMarketplaceHelpMenuItemConfig {
  label: string;
  onClick?: () => void;
  href?: string;
}

export abstract class LegendMarketplaceApplicationPlugin
  extends LegendApplicationPlugin
  implements DataProductDataAccess_LegendApplicationPlugin_Extension
{
  /**
   * This helps to better type-check for this empty abtract type
   * See https://github.com/finos/legend-studio/blob/master/docs/technical/typescript-usage.md#understand-typescript-structual-type-system
   */
  private readonly _$nominalTypeBrand!: 'LegendMarketplaceApplicationPlugin';

  install(pluginManager: LegendMarketplacePluginManager): void {
    pluginManager.registerApplicationPlugin(this);
  }

  /**
   * Callback to return a list of data products to be displayed on the home page.
   *
   * @param marketplaceStore
   */
  async getExtraHomePageDataProducts?(
    marketplaceBaseStore: LegendMarketplaceBaseStore,
    token: string | undefined,
  ): Promise<ProductCardState[] | undefined>;

  /**
   * Returns additional details about a given access point group access type.
   *
   * @param access the AccessPointGroupAccess value for a given Access Point Group
   */
  getExtraAccessPointGroupAccessInfo?(
    access: AccessPointGroupAccess,
  ): string | undefined;

  /**
   * Config to handle different types of contract consumers, including configuration for:
   * - Contract creation dialog renderer
   * - Organizational scope type details renderer
   */
  getContractConsumerTypeRendererConfigs?(): ContractConsumerTypeRendererConfig[];

  /**
   * Config to add extra data product access point code for other code types
   */
  getExtraDataProductAccessPointCodeConfiguration?(): DataProductAccessPointCodeConfiguration[];

  /**
   * Config to allow adding arbitrary additional pages to the marketplace application.
   * These pages will be wrapped in all the usual context providers, so they will
   * have access to useLegendMarketplaceBaseStore and other similar hooks.
   */
  getAdditionalMarketplacePageConfigs?(): AdditionalMarketplacePageConfig[];

  /**
   * Config to allow adding additional MenuItem elements to the LegendMarketplaceIconToolbar's
   * help menu
   */
  getAdditionalHelpMenuItemConfigs?(
    marketplaceBaseStore: LegendMarketplaceBaseStore,
  ): AdditionalMarketplaceHelpMenuItemConfig[];

  /**
   * Config to allow passing in a response handler for endpoints that return
   * ownership data for a given data product DID
   */
  handleDataProductOwnersResponse?: (response: PlainObject) => string[];
}
