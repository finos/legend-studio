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
  action,
  computed,
  flow,
  makeObservable,
  observable,
  runInAction,
} from 'mobx';
import {
  LegendDataCubeSourceBuilderState,
  LegendDataCubeSourceBuilderType,
} from './LegendDataCubeSourceBuilderState.js';
import {
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  guaranteeType,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import {
  _defaultPrimitiveTypeValue,
  _primitiveValue,
  type DataCubeAlertService,
} from '@finos/legend-data-cube';
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
  type V1_EntitlementsDataProductDetailsResponse,
  type V1_EntitlementsDataProductDetails,
  type V1_ValueSpecification,
  type V1_Variable,
  V1_serializeValueSpecification,
  V1_PackageableType,
  V1_deserializeRawValueSpecificationType,
  V1_observe_ValueSpecification,
  V1_dataProductModelSchema,
  V1_LakehouseAccessPoint,
  V1_serializeRawValueSpecification,
  V1_deserializeValueSpecification,
  V1_Lambda,
} from '@finos/legend-graph';
import { RawLakehouseConsumerDataCubeSource } from '../../model/LakehouseConsumerDataCubeSource.js';
import { isValidV1_ValueSpecification } from '@finos/legend-query-builder';
import { deserialize } from 'serializr';

type QueryParameterValues = {
  [varName: string]: {
    variable: V1_Variable;
    valueSpec: V1_ValueSpecification;
  };
};

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

  queryParameterValues?: QueryParameterValues | undefined;

  private readonly _depotServerClient: DepotServerClient;
  private readonly _platformServerClient: LakehousePlatformServerClient;
  private readonly _contractServerClient: LakehouseContractServerClient;
  readonly dataProductLoadingState = ActionState.create();

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

      queryParameters: computed,
      queryParameterValues: observable,
      hasInvalidQueryParameters: computed,

      setWarehouse: action,
      setDataProducts: action,
      setSelectedDataProduct: action,
      setAccessPoints: action,
      setEnvironments: action,
      setSelectedAccessPoint: action,
      setSelectedEnvironment: action,
      setQueryParameterValue: action,
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

  setQueryParameterValue(name: string, value: V1_ValueSpecification) {
    if (this.queryParameterValues?.[name]) {
      this.queryParameterValues[name].valueSpec = value;
    }
  }

  get queryParameters(): V1_Variable[] | undefined {
    return this.queryParameterValues
      ? Object.values(this.queryParameterValues).map((elem) => elem.variable)
      : undefined;
  }

  get hasInvalidQueryParameters(): boolean {
    if (this.queryParameterValues) {
      return Object.values(this.queryParameterValues).some(
        (paramVal) =>
          !isValidV1_ValueSpecification(
            paramVal.valueSpec,
            paramVal.variable.multiplicity,
          ),
      );
    }
    return false;
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

    await this._initializeQueryParameters();
  }

  private async _initializeQueryParameters() {
    const dataProductFull = deserialize(
      V1_dataProductModelSchema,
      (
        await this._depotServerClient.getEntityByGAV(
          guaranteeNonNullable(this.dpCoordinates?.groupId),
          guaranteeNonNullable(this.dpCoordinates?.artifactId),
          guaranteeNonNullable(this.dpCoordinates?.versionId),
          guaranteeNonNullable(this.selectedDataProduct),
        )
      ).content,
    );

    const accessPoint = guaranteeType(
      dataProductFull.accessPointGroups.map((group) =>
        group.accessPoints.find(
          (point) => point.id === this.selectedAccessPoint,
        ),
      )[0],
      V1_LakehouseAccessPoint,
    );
    const lambda = V1_serializeRawValueSpecification(accessPoint.func);
    const convertedLambda = guaranteeType(
      V1_deserializeValueSpecification(lambda, []),
      V1_Lambda,
    );

    const queryParameters = convertedLambda.parameters;

    const queryParameterValues: QueryParameterValues = {};
    for (const param of queryParameters) {
      const genericType = guaranteeNonNullable(param.genericType);
      const packageableType = guaranteeType(
        genericType.rawType,
        V1_PackageableType,
      );
      const defaultValueSpec = _primitiveValue(
        V1_deserializeRawValueSpecificationType(packageableType.fullPath),
        _defaultPrimitiveTypeValue(packageableType.fullPath),
      );
      queryParameterValues[param.name] = {
        variable: param,
        valueSpec: V1_observe_ValueSpecification(defaultValueSpec),
      };
    }
    runInAction(() => {
      this.queryParameterValues = queryParameterValues;
    });
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
      Boolean(this.dpCoordinates) &&
      !this.hasInvalidQueryParameters
    );
  }

  //set query params

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

    rawSource.parameterValues = this.queryParameterValues
      ? Object.values(this.queryParameterValues).map((variableAndValueSpec) => [
          JSON.stringify(
            V1_serializeValueSpecification(
              variableAndValueSpec.variable,
              this._application.pluginManager.getPureProtocolProcessorPlugins(),
            ),
          ),
          JSON.stringify(
            V1_serializeValueSpecification(
              variableAndValueSpec.valueSpec,
              this._application.pluginManager.getPureProtocolProcessorPlugins(),
            ),
          ),
        ])
      : [];

    return Promise.resolve(
      RawLakehouseConsumerDataCubeSource.serialization.toJson(rawSource),
    );
  }
}
