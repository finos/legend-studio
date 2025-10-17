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

import {
  guaranteeNonNullable,
  guaranteeType,
  type PlainObject,
} from '@finos/legend-shared';
import type { LegendDataCubeApplicationStore } from '../../LegendDataCubeBaseStore.js';
import type { LegendDataCubeDataCubeEngine } from '../../LegendDataCubeDataCubeEngine.js';
import { LegendDataCubeSourceLoaderState } from './LegendDataCubeSourceLoaderState.js';
import type { DataCubeAlertService } from '@finos/legend-data-cube';
import {
  V1_AdHocDeploymentDataProductOrigin,
  V1_entitlementsDataProductDetailsResponseToDataProductDetails,
  V1_EntitlementsLakehouseEnvironmentType,
  V1_IngestEnvironmentClassification,
  type PersistentDataCube,
} from '@finos/legend-graph';
import type { LakehouseContractServerClient } from '@finos/legend-server-lakehouse';
import { action, makeObservable, observable } from 'mobx';
import { LegendDataCubeSourceBuilderType } from './LegendDataCubeSourceBuilderState.js';
import {
  RawLakehouseConsumerDataCubeSource,
  RawLakehouseSdlcOrigin,
} from '../../model/LakehouseConsumerDataCubeSource.js';

const PROD_PARALELLEL_SUFFIX = 'pp';

export class LakehouseConsumerDataCubeSourceLoaderState extends LegendDataCubeSourceLoaderState {
  fullGraphGrammar: string | undefined;
  dataProductId: string | undefined;
  dpLoaded: boolean;
  environment: string | undefined;

  constructor(
    application: LegendDataCubeApplicationStore,
    engine: LegendDataCubeDataCubeEngine,
    alertService: DataCubeAlertService,
    sourceData: PlainObject,
    persistentDataCube: PersistentDataCube,
    onSuccess: () => Promise<void>,
    onError: (error: unknown) => Promise<void>,
  ) {
    super(
      application,
      engine,
      alertService,
      sourceData,
      persistentDataCube,
      onSuccess,
      onError,
    );
    this.dpLoaded = false;

    makeObservable(this, {
      dpLoaded: observable,
      setDpLoaded: action,

      dataProductId: observable,
      setDataProductId: action,
    });
  }

  setDpLoaded(dpLoaded: boolean) {
    this.dpLoaded = dpLoaded;
  }

  setDataProductId(id: string | undefined) {
    this.dataProductId = id;
  }

  override get isValid(): boolean {
    return this.dpLoaded;
  }

  override get label() {
    return LegendDataCubeSourceBuilderType.LAKEHOUSE_CONSUMER;
  }

  reset() {
    const rawSource = RawLakehouseConsumerDataCubeSource.serialization.fromJson(
      this.sourceData,
    );
    if (
      !rawSource.origin ||
      rawSource.origin instanceof RawLakehouseSdlcOrigin
    ) {
      this.setDpLoaded(true);
    } else {
      this.setDpLoaded(false);
    }
    this.setDataProductId(rawSource.paths[0]);
    this.environment = rawSource.environment;
    this.fullGraphGrammar = undefined;
  }

  async loadAdhocDataProduct(
    access_token: string | undefined,
    lakehouseContractServerClient: LakehouseContractServerClient,
  ) {
    const dataProducts =
      V1_entitlementsDataProductDetailsResponseToDataProductDetails(
        await lakehouseContractServerClient.getDataProduct(
          this.dataProductId?.split('::').pop() ?? '',
          access_token,
        ),
      );

    const selectedEnv = guaranteeNonNullable(this.environment);

    const dataProduct = selectedEnv.includes(
      V1_IngestEnvironmentClassification.DEV,
    )
      ? dataProducts.find(
          (dp) =>
            dp.lakehouseEnvironment?.type ===
            V1_EntitlementsLakehouseEnvironmentType.DEVELOPMENT,
        )
      : selectedEnv.includes(PROD_PARALELLEL_SUFFIX)
        ? dataProducts.find(
            (dp) =>
              dp.lakehouseEnvironment?.type ===
              V1_EntitlementsLakehouseEnvironmentType.PRODUCTION_PARALLEL,
          )
        : dataProducts.find(
            (dp) =>
              dp.lakehouseEnvironment?.type ===
              V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
          );

    if (
      dataProduct?.origin &&
      dataProduct.origin instanceof V1_AdHocDeploymentDataProductOrigin
    ) {
      this.fullGraphGrammar = guaranteeType(
        dataProduct.origin,
        V1_AdHocDeploymentDataProductOrigin,
      ).definition;
      this.setDpLoaded(true);
    }
  }

  override async load(source: PlainObject | undefined) {
    const deserializedSource =
      RawLakehouseConsumerDataCubeSource.serialization.fromJson(
        guaranteeNonNullable(source),
      );

    if (this.fullGraphGrammar) {
      this._engine.registerAdhocDataProductGraphGrammar(this.fullGraphGrammar);
    }

    return RawLakehouseConsumerDataCubeSource.serialization.toJson(
      deserializedSource,
    );
  }
}
