/**
 * Copyright (c) 2025-present, Goldman Sachs
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

import { V1_EntitlementsLakehouseEnvironmentType } from '@finos/legend-graph';
import type { ProductCardState } from './lakehouse/dataProducts/ProductCardState.js';
import {
  LakehouseDataProductSearchResultDetails,
  LegacyDataProductSearchResultDetails,
} from '@finos/legend-server-marketplace';

export enum LegendMarketplaceEnv {
  PRODUCTION = 'PRODUCTION',
  PRODUCTION_PARALLEL = 'PRODUCTION_PARALLEL',
  DEVELOPMENT = 'DEVELOPMENT',
}

export abstract class LegendMarketplaceEnvState {
  abstract key: LegendMarketplaceEnv;
  abstract lakehouseEnvironment: V1_EntitlementsLakehouseEnvironmentType;

  get label(): string {
    return this.key;
  }

  abstract get adjacentEnv(): LegendMarketplaceEnv | undefined;

  abstract supportsLegacyDataProducts(): boolean;

  abstract supportedClassifications(): (
    | V1_EntitlementsLakehouseEnvironmentType
    | undefined
  )[];

  filterDataProduct(
    productCardState: ProductCardState,
    includeLegacyDataProducts: boolean,
  ): boolean {
    if (
      productCardState.searchResult.dataProductDetails instanceof
      LegacyDataProductSearchResultDetails
    ) {
      if (this.supportsLegacyDataProducts() && includeLegacyDataProducts) {
        return true;
      } else {
        return false;
      }
    } else if (
      productCardState.searchResult.dataProductDetails instanceof
      LakehouseDataProductSearchResultDetails
    ) {
      const classification =
        productCardState.searchResult.dataProductDetails
          .producerEnvironmentType;
      return this.supportedClassifications().includes(classification);
    } else {
      return true;
    }
  }
}

export class ProdLegendMarketplaceEnvState extends LegendMarketplaceEnvState {
  key = LegendMarketplaceEnv.PRODUCTION;
  lakehouseEnvironment = V1_EntitlementsLakehouseEnvironmentType.PRODUCTION;

  override get label(): string {
    return 'Prod';
  }

  override get adjacentEnv() {
    return LegendMarketplaceEnv.PRODUCTION_PARALLEL;
  }

  supportsLegacyDataProducts(): boolean {
    return true;
  }

  supportedClassifications() {
    return [V1_EntitlementsLakehouseEnvironmentType.PRODUCTION];
  }
}

export class ProdParallelLegendMarketplaceEnvState extends LegendMarketplaceEnvState {
  key = LegendMarketplaceEnv.PRODUCTION_PARALLEL;
  lakehouseEnvironment =
    V1_EntitlementsLakehouseEnvironmentType.PRODUCTION_PARALLEL;

  override get label(): string {
    return 'Prod-Parallel';
  }

  override get adjacentEnv() {
    return LegendMarketplaceEnv.PRODUCTION;
  }

  supportsLegacyDataProducts(): boolean {
    return false;
  }

  supportedClassifications() {
    return [V1_EntitlementsLakehouseEnvironmentType.PRODUCTION_PARALLEL];
  }
}

export class DevelopmentLegendMarketplaceEnvState extends LegendMarketplaceEnvState {
  key = LegendMarketplaceEnv.DEVELOPMENT;
  lakehouseEnvironment = V1_EntitlementsLakehouseEnvironmentType.DEVELOPMENT;

  override get label(): string {
    return 'Development';
  }

  override get adjacentEnv() {
    return LegendMarketplaceEnv.PRODUCTION_PARALLEL;
  }

  supportsLegacyDataProducts(): boolean {
    return false;
  }

  supportedClassifications() {
    return [V1_EntitlementsLakehouseEnvironmentType.DEVELOPMENT, undefined];
  }
}
