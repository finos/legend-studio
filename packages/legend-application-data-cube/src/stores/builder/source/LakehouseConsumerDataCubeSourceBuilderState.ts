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
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import type { DataCubeAlertService } from '@finos/legend-data-cube';
import type { LegendDataCubeApplicationStore } from '../../LegendDataCubeBaseStore.js';
import type { LegendDataCubeDataCubeEngine } from '../../LegendDataCubeDataCubeEngine.js';
import {
  type LakehousePlatformServerClient,
  type LakehouseContractServerClient,
  type IngestDeploymentServerConfig,
} from '@finos/legend-server-lakehouse';
import {
  DepotScope,
  VersionedProjectData,
  type DepotServerClient,
  type StoredSummaryEntity,
} from '@finos/legend-server-depot';
import {
  CORE_PURE_PATH,
  type V1_EntitlementsDataProductDetailsResponse,
  type V1_EntitlementsDataProductDetails,
  V1_EntitlementsLakehouseEnvironmentType,
} from '@finos/legend-graph';
import { RawLakehouseConsumerDataCubeSource } from '../../model/LakehouseConsumerDataCubeSource.js';

export class LakehouseConsumerDataCubeSourceBuilderState extends LegendDataCubeSourceBuilderState {
  warehouse: string | undefined;
  selectedDataProduct: string | undefined;
  selectedAccessPoint: string | undefined;
  paths: string[] = [];
  environments: string[] = [];
  selectedEnvironment: string | undefined;
  dataProducts: StoredSummaryEntity[] = [];
  dataProductDetails: V1_EntitlementsDataProductDetails | undefined;
  accessPoints: string[] = [];
  dpCoordinates: VersionedProjectData | undefined;

  DEFAULT_CONSUMER_WAREHOUSE = 'LAKEHOUSE_CONSUMER_DEFAULT_WH';

  private readonly _depotServerClient: DepotServerClient;
  private readonly _platformServerClient: LakehousePlatformServerClient;
  private readonly _contractServerClient: LakehouseContractServerClient;
  readonly dataProductLoadingState = ActionState.create();
  readonly ingestEnvLoadingState = ActionState.create();

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
      loadDataProducts: flow,
      fetchEnvironment: flow,

      setWarehouse: action,
      setDataProducts: action,
      setSelectedDataProduct: action,
      setAccessPoints: action,
      setSelectedAccessPoint: action,
      setSelectedEnvironment: action,
      setEnvironments: action,
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
      this.dataProductLoadingState.inProgress();
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
      this.dataProductLoadingState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.dataProductLoadingState.fail();
      throw error;
    }
  }

  async fetchAccessPoints(access_token?: string) {
    this.resetEnvironment();

    const selectedDp = guaranteeNonNullable(this.selectedDataProduct);
    const dataProductResponse =
      (await this._contractServerClient.getDataProduct(
        selectedDp.split('::').pop() ?? '',
        access_token,
      )) as V1_EntitlementsDataProductDetailsResponse;
    if (dataProductResponse.dataProducts) {
      const dataProduct = dataProductResponse.dataProducts
        .filter(
          (dp) =>
            Boolean(dp.lakehouseEnvironment) &&
            dp.lakehouseEnvironment?.type ===
              V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
        )
        .at(0);
      if (
        dataProduct?.origin &&
        'group' in dataProduct.origin &&
        'artifact' in dataProduct.origin &&
        'version' in dataProduct.origin
      ) {
        const versionedData = new VersionedProjectData();
        versionedData.groupId = dataProduct.origin.group as string;
        versionedData.artifactId = dataProduct.origin.artifact as string;
        versionedData.versionId = dataProduct.origin.version as string;
        this.dpCoordinates = versionedData;
      }
      this.setAccessPoints(
        dataProduct?.dataProduct.accessPoints.map(
          (accessPoint) => accessPoint.name,
        ) ?? [],
      );
    }
  }

  *fetchEnvironment(access_token: string | undefined): GeneratorFn<void> {
    this.ingestEnvLoadingState.inProgress();
    const ingestServerConfigs =
      (yield this._platformServerClient.getIngestEnvironmentSummaries(
        access_token,
      )) as IngestDeploymentServerConfig[];
    this.setEnvironments(
      ingestServerConfigs
        .map((config) => {
          const baseUrl = new URL(config.ingestServerUrl).hostname;
          const subdomain = baseUrl.split('.')[0];
          const parts = subdomain?.split('-');
          return parts?.slice(0, -1).join('-');
        })
        .filter((env) => env !== undefined),
    );
    this.ingestEnvLoadingState.complete();
  }

  reset() {
    this.setWarehouse(undefined);
    this.setDataProducts([]);
    this.setSelectedDataProduct(undefined);
    this.setAccessPoints([]);
    this.setSelectedAccessPoint(undefined);
    this.setSelectedEnvironment(undefined);
    this.dpCoordinates = undefined;
  }

  resetEnvironment() {
    this.setWarehouse(undefined);
    this.setAccessPoints([]);
    this.setSelectedAccessPoint(undefined);
    this.setSelectedEnvironment(undefined);
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
      Boolean(this.dpCoordinates) &&
      Boolean(this.selectedEnvironment)
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
    rawSource.environment = guaranteeNonNullable(this.selectedEnvironment);
    rawSource.dpCoordinates = guaranteeNonNullable(this.dpCoordinates);
    rawSource.paths = this.paths;
    rawSource.warehouse = guaranteeNonNullable(this.warehouse);

    return Promise.resolve(
      RawLakehouseConsumerDataCubeSource.serialization.toJson(rawSource),
    );
  }
}
