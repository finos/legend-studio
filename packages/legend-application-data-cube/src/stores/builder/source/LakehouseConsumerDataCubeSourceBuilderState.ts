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

import { action, flow, makeObservable, observable } from 'mobx';
import {
  LegendDataCubeSourceBuilderState,
  LegendDataCubeSourceBuilderType,
} from './LegendDataCubeSourceBuilderState.js';
import {
  assertErrorThrown,
  guaranteeNonNullable,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import type { DataCubeAlertService } from '@finos/legend-data-cube';
import type { LegendDataCubeApplicationStore } from '../../LegendDataCubeBaseStore.js';
import type { LegendDataCubeDataCubeEngine } from '../../LegendDataCubeDataCubeEngine.js';
import {
  IngestDeploymentServerConfig,
  type LakehousePlatformServerClient,
  type LakehouseContractServerClient,
} from '@finos/legend-server-lakehouse';
import {
  DepotScope,
  VersionedProjectData,
  type DepotServerClient,
  type StoredSummaryEntity,
} from '@finos/legend-server-depot';
import {
  CORE_PURE_PATH,
  V1_SdlcDeploymentDataProductOrigin,
  type V1_EntitlementsDataProductDetailsResponse,
  type V1_EntitlementsDataProductDetails,
} from '@finos/legend-graph';
import { RawLakehouseConsumerDataCubeSource } from '../../model/LakehouseConsumerDataCubeSource.js';

export class LakehouseConsumerDataCubeSourceBuilderState extends LegendDataCubeSourceBuilderState {
  warehouse: string | undefined;
  selectedDataProduct: string | undefined;
  selectedAccessPoint: string | undefined;
  selectedEnvironment: string | undefined;
  paths: string[] = [];
  ingestEnvironment: string | undefined;
  dataProducts: StoredSummaryEntity[] = [];
  dataProductMap: Record<string, V1_EntitlementsDataProductDetails> = {};
  accessPoints: string[] = [];
  environments: string[] = [];
  dpCoordinates: VersionedProjectData | undefined;

  private readonly _depotServerClient: DepotServerClient;
  private readonly _platformServerClient: LakehousePlatformServerClient;
  private readonly _contractServerClient: LakehouseContractServerClient;

  constructor(
    application: LegendDataCubeApplicationStore,
    engine: LegendDataCubeDataCubeEngine,
    depotServerClient: DepotServerClient,
    platformServerClient: LakehousePlatformServerClient,
    contractServerClient: LakehouseContractServerClient,
    alertService: DataCubeAlertService,
  ) {
    super(application, engine, alertService);
    this._platformServerClient = platformServerClient;
    this._depotServerClient = depotServerClient;
    this._contractServerClient = contractServerClient;

    makeObservable(this, {
      warehouse: observable,
      dataProducts: observable,
      selectedDataProduct: observable,
      accessPoints: observable,
      environments: observable,
      selectedAccessPoint: observable,
      selectedEnvironment: observable,
      fetchDataProductEnvironments: flow,
      loadDataProducts: flow,

      setWarehouse: action,
      setDataProducts: action,
      setSelectedDataProduct: action,
      setAccessPoints: action,
      setEnvironments: action,
      setSelectedAccessPoint: action,
      setSelectedEnvironment: action,
    });
  }

  setWarehouse(warehouse: string | undefined) {
    this.warehouse = warehouse;
  }

  setDataProducts(dataProducts: StoredSummaryEntity[]) {
    this.dataProducts = dataProducts;
  }

  setSelectedDataProduct(dataProduct: string | undefined) {
    this.selectedDataProduct = dataProduct;
  }

  setAccessPoints(accessPoints: string[]) {
    this.accessPoints = accessPoints;
  }

  setEnvironments(environments: string[]) {
    this.environments = environments;
  }

  setSelectedAccessPoint(accessPoint: string | undefined) {
    this.selectedAccessPoint = accessPoint;
  }

  setSelectedEnvironment(environment: string | undefined) {
    this.selectedEnvironment = environment;
  }

  *loadDataProducts(): GeneratorFn<void> {
    try {
      this.setDataProducts(
        (yield this._depotServerClient.getEntitiesSummaryByClassifier(
          CORE_PURE_PATH.DATA_PRODUCT,
          {
            scope: DepotScope.RELEASES,
            latest: true,
            summary: true,
          },
        )) as StoredSummaryEntity[],
      );
    } catch (error) {
      assertErrorThrown(error);
      throw error;
    }
  }

  *fetchDataProductEnvironments(
    access_token: string | undefined,
  ): GeneratorFn<void> {
    this.resetDataProduct();
    const selectedDp = guaranteeNonNullable(this.selectedDataProduct);
    const dataProductResponse =
      (yield this._contractServerClient.getDataProduct(
        selectedDp.split('::').pop() ?? '',
        access_token,
      )) as V1_EntitlementsDataProductDetailsResponse;
    if (dataProductResponse.dataProducts) {
      this.dataProductMap = dataProductResponse.dataProducts
        .filter((dp) => Boolean(dp.lakehouseEnvironment))
        .reduce(
          (acc, dp) => {
            const envType = guaranteeNonNullable(
              dp.lakehouseEnvironment,
            ).type.valueOf();
            acc[envType] = dp;
            return acc;
          },
          {} as Record<string, V1_EntitlementsDataProductDetails>,
        );

      this.setEnvironments(Object.keys(this.dataProductMap));
    }
  }

  fetchAccessPoints() {
    this.resetEnvironment();
    const selectedEnvironment = guaranteeNonNullable(this.selectedEnvironment);
    const dataProduct = this.dataProductMap[selectedEnvironment];

    if (dataProduct?.origin instanceof V1_SdlcDeploymentDataProductOrigin) {
      const versionedData = new VersionedProjectData();
      versionedData.groupId = dataProduct.origin.group;
      versionedData.artifactId = dataProduct.origin.artifact;
      versionedData.versionId = dataProduct.origin.version;
      this.dpCoordinates = versionedData;
    }
    this.setAccessPoints(
      dataProduct?.dataProduct.accessPoints.map(
        (accessPoint) => accessPoint.name,
      ) ?? [],
    );
  }

  async fetchEnvironment(access_token: string | undefined) {
    const selectedEnvironment = guaranteeNonNullable(this.selectedEnvironment);
    const dataProduct = this.dataProductMap[selectedEnvironment];
    const config = IngestDeploymentServerConfig.serialization.fromJson(
      await this._platformServerClient.findProducerServer(
        guaranteeNonNullable(dataProduct?.deploymentId),
        'DEPLOYMENT',
        access_token,
      ),
    );
    const baseUrl = new URL(config.ingestServerUrl).hostname;
    const subdomain = baseUrl.split('.')[0];
    const parts = subdomain?.split('-');
    const env = parts?.slice(0, -1).join('-');
    this.ingestEnvironment = env;
    this.setWarehouse('LAKEHOUSE_CONSUMER_DEFAULT_WH');
  }

  reset() {
    this.setWarehouse(undefined);
    this.setDataProducts([]);
    this.setSelectedDataProduct(undefined);
    this.setAccessPoints([]);
    this.setEnvironments([]);
    this.setSelectedAccessPoint(undefined);
    this.setSelectedEnvironment(undefined);
    this.dpCoordinates = undefined;
  }

  resetDataProduct() {
    this.setWarehouse(undefined);
    this.setAccessPoints([]);
    this.setEnvironments([]);
    this.setSelectedAccessPoint(undefined);
    this.setSelectedEnvironment(undefined);
    this.dpCoordinates = undefined;
  }

  resetEnvironment() {
    this.setWarehouse(undefined);
    this.setAccessPoints([]);
    this.setSelectedAccessPoint(undefined);
    this.dpCoordinates = undefined;
  }

  override get label(): LegendDataCubeSourceBuilderType {
    return LegendDataCubeSourceBuilderType.LAKEHOUSE_CONSUMER;
  }

  override get isValid(): boolean {
    return (
      Boolean(this.warehouse) &&
      Boolean(this.selectedAccessPoint) &&
      Boolean(this.selectedDataProduct) &&
      Boolean(this.selectedEnvironment) &&
      Boolean(this.dpCoordinates)
    );
  }

  override async generateSourceData(): Promise<PlainObject> {
    // build data cube source
    this.paths = [];
    this.paths.push(
      ...[
        guaranteeNonNullable(this.selectedDataProduct),
        guaranteeNonNullable(this.selectedAccessPoint),
      ],
    );

    const rawSource = new RawLakehouseConsumerDataCubeSource();
    rawSource.environment = guaranteeNonNullable(this.ingestEnvironment);
    rawSource.dpCoordinates = guaranteeNonNullable(this.dpCoordinates);
    rawSource.paths = this.paths;
    rawSource.warehouse = guaranteeNonNullable(this.warehouse);

    return Promise.resolve(
      RawLakehouseConsumerDataCubeSource.serialization.toJson(rawSource),
    );
  }
}
