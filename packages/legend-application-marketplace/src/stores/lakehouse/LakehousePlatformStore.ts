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

import {
  IngestDeploymentServerConfig,
  type LakehousePlatformServerClient,
} from '@finos/legend-server-lakehouse';
import type { LegendMarketplaceBaseStore } from '../LegendMarketplaceBaseStore.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { V1_AppDirLevel } from '@finos/legend-graph';
import { action, makeObservable, observable } from 'mobx';

export class LakehousePlatformStore {
  readonly legendMarketplaceBaseStore: LegendMarketplaceBaseStore;
  readonly lakehousePlatformServerClient: LakehousePlatformServerClient;
  readonly requestMap = new Map<
    number,
    Promise<IngestDeploymentServerConfig>
  >();
  readonly didToEnvironmentMap: Map<number, IngestDeploymentServerConfig> =
    new Map();

  constructor(
    legendMarketplaceBaseStore: LegendMarketplaceBaseStore,
    lakehousePlatformServerClient: LakehousePlatformServerClient,
  ) {
    this.legendMarketplaceBaseStore = legendMarketplaceBaseStore;
    this.lakehousePlatformServerClient = lakehousePlatformServerClient;

    makeObservable(this, {
      didToEnvironmentMap: observable,
      setEnvironment: action,
    });
  }

  private async fetchEnvironmentForDID(
    did: number,
    token: string | undefined,
  ): Promise<IngestDeploymentServerConfig> {
    const rawResult =
      await this.lakehousePlatformServerClient.findProducerServer(
        did,
        V1_AppDirLevel.DEPLOYMENT,
        token,
      );
    return IngestDeploymentServerConfig.serialization.fromJson(rawResult);
  }

  async getOrFetchEnvironmentForDID(
    did: number,
    token: string | undefined,
  ): Promise<IngestDeploymentServerConfig | undefined> {
    if (this.didToEnvironmentMap.has(did)) {
      return guaranteeNonNullable(this.didToEnvironmentMap.get(did));
    }

    if (!this.requestMap.has(did)) {
      this.requestMap.set(did, this.fetchEnvironmentForDID(did, token));
    }

    const environment = guaranteeNonNullable(await this.requestMap.get(did));
    this.requestMap.delete(did);
    if (environment) {
      this.setEnvironment(did, environment);
      return environment;
    } else {
      return undefined;
    }
  }

  setEnvironment(did: number, environment: IngestDeploymentServerConfig): void {
    this.didToEnvironmentMap.set(did, environment);
  }
}
