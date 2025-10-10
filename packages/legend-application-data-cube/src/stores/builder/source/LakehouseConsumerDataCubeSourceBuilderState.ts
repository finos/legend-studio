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
import { VersionedProjectData } from '@finos/legend-server-depot';
import {
  V1_EntitlementsLakehouseEnvironmentType,
  V1_SdlcDeploymentDataProductOrigin,
  type V1_EntitlementsDataProductLite,
  type V1_EntitlementsDataProductLiteResponse,
  V1_entitlementsDataProductDetailsResponseToDataProductDetails,
  V1_DataProductOriginType,
  V1_AdHocDeploymentDataProductOrigin,
  type V1_EntitlementsDataProductDetails,
} from '@finos/legend-graph';
import {
  LakehouseEnvironmentType,
  RawLakehouseAdhocOrigin,
  RawLakehouseConsumerDataCubeSource,
  RawLakehouseSdlcOrigin,
} from '../../model/LakehouseConsumerDataCubeSource.js';

export class LakehouseConsumerDataCubeSourceBuilderState extends LegendDataCubeSourceBuilderState {
  warehouse: string | undefined;
  selectedDataProduct: string | undefined;
  selectedAccessPoint: string | undefined;
  paths: string[] = [];
  allEnvironments: string[] = [];
  environments: string[] = [];
  selectedEnvironment: string | undefined;
  dataProducts: V1_EntitlementsDataProductLite[] = [];
  accessPoints: string[] = [];
  dpCoordinates: VersionedProjectData | undefined;
  origin: string | undefined;
  fullGraphGrammar: string | undefined;

  dataProductDetails: V1_EntitlementsDataProductDetails[] = [];

  DEFAULT_CONSUMER_WAREHOUSE = 'LAKEHOUSE_CONSUMER_DEFAULT_WH';

  private readonly _platformServerClient: LakehousePlatformServerClient;
  private readonly _contractServerClient: LakehouseContractServerClient;
  readonly dataProductLoadingState = ActionState.create();
  readonly ingestEnvLoadingState = ActionState.create();

  constructor(
    application: LegendDataCubeApplicationStore,
    engine: LegendDataCubeDataCubeEngine,
    platformServerClient: LakehousePlatformServerClient,
    contractServerClient: LakehouseContractServerClient,
    alertService: DataCubeAlertService,
  ) {
    super(application, engine, alertService);
    this._platformServerClient = platformServerClient;
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

  setDataProducts(dataProducts: V1_EntitlementsDataProductLite[]) {
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

  setAllEnvironments(environments: string[]) {
    this.allEnvironments = environments;
  }

  setSelectedAccessPoint(accessPoint: string | undefined) {
    this.selectedAccessPoint = accessPoint;
  }

  setSelectedEnvironment(environment: string | undefined) {
    this.selectedEnvironment = environment;
  }

  *loadDataProducts(access_token?: string): GeneratorFn<void> {
    try {
      this.dataProductLoadingState.inProgress();
      const dataProducts =
        (yield this._contractServerClient.getDataProductsLite(
          access_token,
        )) as V1_EntitlementsDataProductLiteResponse;
      this.setDataProducts(dataProducts.dataProducts ?? []);
      this.dataProductLoadingState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.dataProductLoadingState.fail();
      throw error;
    }
  }

  async fetchDataProduct(access_token?: string) {
    this.resetEnvironment();

    const selectedDp = guaranteeNonNullable(this.selectedDataProduct);
    this.dataProductDetails =
      V1_entitlementsDataProductDetailsResponseToDataProductDetails(
        await this._contractServerClient.getDataProduct(
          selectedDp.split('::').pop() ?? '',
          access_token,
        ),
      );

    const filterEnvironments = (
      type: V1_EntitlementsLakehouseEnvironmentType,
      environments: string[],
    ): string[] => {
      switch (type) {
        case V1_EntitlementsLakehouseEnvironmentType.PRODUCTION:
          return environments.filter(
            (env) =>
              !env.includes(LakehouseEnvironmentType.PRODUCTION_PARALLEL) &&
              !env.includes(LakehouseEnvironmentType.DEVELOPMENT),
          );
        case V1_EntitlementsLakehouseEnvironmentType.PRODUCTION_PARALLEL:
          return environments.filter((env) =>
            env.includes(LakehouseEnvironmentType.PRODUCTION_PARALLEL),
          );
        case V1_EntitlementsLakehouseEnvironmentType.DEVELOPMENT:
          return environments.filter((env) =>
            env.includes(LakehouseEnvironmentType.DEVELOPMENT),
          );
        default:
          return environments;
      }
    };

    if (this.dataProductDetails.length === 1) {
      const environmentType =
        this.dataProductDetails.at(0)?.lakehouseEnvironment?.type;
      if (environmentType) {
        this.setEnvironments(
          filterEnvironments(environmentType, this.allEnvironments),
        );
      }
    } else if (this.dataProductDetails.length > 1) {
      const allEnvironments = new Set<string>();
      this.dataProductDetails.forEach((dataProduct) => {
        const environmentType = dataProduct.lakehouseEnvironment?.type;
        if (environmentType) {
          filterEnvironments(environmentType, this.allEnvironments).forEach(
            (env) => allEnvironments.add(env),
          );
        }
      });
      this.setEnvironments(Array.from(allEnvironments));
    }
  }

  fetchAccessPoints() {
    this.resetAccessPoint();
    const selectedEnv = guaranteeNonNullable(this.selectedEnvironment);
    const dataProduct = selectedEnv.includes(
      LakehouseEnvironmentType.DEVELOPMENT,
    )
      ? this.dataProductDetails.find(
          (dp) =>
            dp.lakehouseEnvironment?.type ===
            V1_EntitlementsLakehouseEnvironmentType.DEVELOPMENT,
        )
      : selectedEnv.includes(LakehouseEnvironmentType.PRODUCTION_PARALLEL)
        ? this.dataProductDetails.find(
            (dp) =>
              dp.lakehouseEnvironment?.type ===
              V1_EntitlementsLakehouseEnvironmentType.PRODUCTION_PARALLEL,
          )
        : this.dataProductDetails.find(
            (dp) =>
              dp.lakehouseEnvironment?.type ===
              V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
          );
    if (dataProduct?.origin instanceof V1_SdlcDeploymentDataProductOrigin) {
      const versionedData = new VersionedProjectData();
      versionedData.groupId = dataProduct.origin.group;
      versionedData.artifactId = dataProduct.origin.artifact;
      versionedData.versionId = dataProduct.origin.version;
      this.dpCoordinates = versionedData;
      this.origin = V1_DataProductOriginType.SDLC_DEPLOYMENT;
    } else if (
      dataProduct?.origin instanceof V1_AdHocDeploymentDataProductOrigin
    ) {
      this.dpCoordinates = undefined;
      this.origin = V1_DataProductOriginType.AD_HOC_DEPLOYMENT;
      this.fullGraphGrammar = dataProduct.origin.definition;
    }
    this.setAccessPoints(
      dataProduct?.dataProduct.accessPoints.map(
        (accessPoint) => accessPoint.name,
      ) ?? [],
    );
  }

  *fetchEnvironment(access_token: string | undefined): GeneratorFn<void> {
    this.ingestEnvLoadingState.inProgress();
    const ingestServerConfigs =
      (yield this._platformServerClient.getIngestEnvironmentSummaries(
        access_token,
      )) as IngestDeploymentServerConfig[];
    this.setAllEnvironments(
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

  resetAccessPoint() {
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
    if (this.origin === V1_DataProductOriginType.SDLC_DEPLOYMENT) {
      const lakehouseOrigin = new RawLakehouseSdlcOrigin();
      lakehouseOrigin.dpCoordinates = guaranteeNonNullable(this.dpCoordinates);
      rawSource.origin = lakehouseOrigin;
    } else {
      this._engine.registerAdhocDataProductGraphGrammar(this.fullGraphGrammar);
      rawSource.origin = new RawLakehouseAdhocOrigin();
    }
    rawSource.paths = this.paths;
    rawSource.warehouse = guaranteeNonNullable(this.warehouse);

    return Promise.resolve(
      RawLakehouseConsumerDataCubeSource.serialization.toJson(rawSource),
    );
  }
}
