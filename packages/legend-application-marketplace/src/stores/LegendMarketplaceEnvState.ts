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

export enum LegendMarketplaceEnv {
  PRODUCTION = 'PRODUCTION',
  PRODUCTION_PARALLEL = 'PRODUCTION_PARALLEL',
}

export abstract class LegendMarketplaceEnvState {
  abstract key: LegendMarketplaceEnv;

  abstract supportsLegacyDataProducts(): boolean;
  abstract filterDataProduct(
    classification: V1_EntitlementsLakehouseEnvironmentType | undefined,
  ): boolean;
}

export class ProdLegendMarketplaceEnvState extends LegendMarketplaceEnvState {
  key = LegendMarketplaceEnv.PRODUCTION;

  supportsLegacyDataProducts(): boolean {
    return true;
  }

  filterDataProduct(
    classification: V1_EntitlementsLakehouseEnvironmentType | undefined,
  ): boolean {
    return (
      classification === V1_EntitlementsLakehouseEnvironmentType.PRODUCTION
    );
  }
}

export class ProdParallelLegendMarketplaceEnvState extends LegendMarketplaceEnvState {
  key = LegendMarketplaceEnv.PRODUCTION_PARALLEL;

  supportsLegacyDataProducts(): boolean {
    return false;
  }

  filterDataProduct(
    classification: V1_EntitlementsLakehouseEnvironmentType | undefined,
  ): boolean {
    return (
      classification ===
        V1_EntitlementsLakehouseEnvironmentType.PRODUCTION_PARALLEL ||
      classification === V1_EntitlementsLakehouseEnvironmentType.DEVELOPMENT ||
      classification === undefined
    );
  }
}
