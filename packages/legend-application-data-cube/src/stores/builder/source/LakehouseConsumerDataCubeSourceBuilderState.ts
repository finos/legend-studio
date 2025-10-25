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
  reaction,
} from 'mobx';
import {
  LegendDataCubeSourceBuilderState,
  LegendDataCubeSourceBuilderType,
} from './LegendDataCubeSourceBuilderState.js';
import {
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  isNonNullable,
  uniq,
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
  filterEnvironmentsByEntitlementsEnv,
  getIngestDeploymentServerConfigName,
} from '@finos/legend-server-lakehouse';
import { VersionedProjectData } from '@finos/legend-server-depot';
import {
  V1_SdlcDeploymentDataProductOrigin,
  type V1_EntitlementsDataProductLite,
  type V1_EntitlementsDataProductLiteResponse,
  V1_entitlementsDataProductDetailsResponseToDataProductDetails,
  V1_DataProductOriginType,
  V1_AdHocDeploymentDataProductOrigin,
  type V1_EntitlementsDataProductDetails,
  V1_isIngestEnvsCompatibleWithEntitlements,
  V1_LegendSDLC,
  V1_serializePureModelContext,
  V1_PureModelContextPointer,
  V1_ClassInstance,
  V1_ClassInstanceType,
  V1_DataProductAccessor,
  V1_Protocol,
  V1_PureGraphManager,
  PureClientVersion,
} from '@finos/legend-graph';
import {
  RawLakehouseAdhocOrigin,
  RawLakehouseConsumerDataCubeSource,
  RawLakehouseSdlcOrigin,
} from '../../model/LakehouseConsumerDataCubeSource.js';
import { LegendDataCubeCodeEditorState } from '../LegendDataCubeCodeEditorState.js';

export class LakehouseConsumerDataCubeSourceBuilderState extends LegendDataCubeSourceBuilderState {
  warehouse: string | undefined;
  selectedDataProduct: string | undefined;
  selectedAccessPoint: string | undefined;
  paths: string[] = [];
  dataProducts: V1_EntitlementsDataProductLite[] = [];
  accessPoints: string[] = [];
  dpCoordinates: VersionedProjectData | undefined;
  origin: string | undefined;
  fullGraphGrammar: string | undefined;
  deploymentId: number | undefined;
  dataProductDetails: V1_EntitlementsDataProductDetails[] | undefined;
  showQueryEditor = false;
  DEFAULT_CONSUMER_WAREHOUSE = 'LAKEHOUSE_CONSUMER_DEFAULT_WH';
  codeEditorState: LegendDataCubeCodeEditorState;

  // envs
  allEnvironments: IngestDeploymentServerConfig[] | undefined;
  selectedEnvironment: IngestDeploymentServerConfig | undefined;

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
      allEnvironments: observable,
      environments: computed,
      selectedDataProductDetail: computed,
      selectedAccessPoint: observable,
      selectedEnvironment: observable,
      showQueryEditor: observable,
      setShowQueryEditor: action,
      loadDataProducts: flow,
      fetchEnvironment: flow,

      setWarehouse: action,
      setDataProducts: action,
      setSelectedDataProduct: action,
      setAccessPoints: action,
      setSelectedAccessPoint: action,
      setSelectedEnvironment: action,
    });

    this.codeEditorState = new LegendDataCubeCodeEditorState(
      engine,
      alertService,
      undefined,
    );

    reaction(
      () => this.selectedAccessPoint,
      (accessPoint) => {
        this.setShowQueryEditor(!!accessPoint);
      },
    );
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

  setAllEnvironments(environments: IngestDeploymentServerConfig[]) {
    this.allEnvironments = environments;
  }

  setSelectedAccessPoint(accessPoint: string | undefined) {
    this.selectedAccessPoint = accessPoint;
  }

  setSelectedEnvironment(
    environment: IngestDeploymentServerConfig | undefined,
  ) {
    this.selectedEnvironment = environment;
  }

  setShowQueryEditor(val: boolean): void {
    this.showQueryEditor = val;
  }

  get environments(): IngestDeploymentServerConfig[] {
    const allEnvironments = this.allEnvironments;
    if (allEnvironments) {
      const details = this.dataProductDetails?.map(
        (detail) => detail.lakehouseEnvironment?.type,
      );
      if (details?.length && !details.includes(undefined)) {
        const entitlementsTypes = uniq(details.filter(isNonNullable));
        return uniq(
          entitlementsTypes
            .map((type) =>
              filterEnvironmentsByEntitlementsEnv(type, allEnvironments),
            )
            .flat(),
        );
      }
      return allEnvironments;
    }
    return [];
  }

  get selectedDataProductDetail():
    | V1_EntitlementsDataProductDetails
    | undefined {
    const selectedEnv = this.selectedEnvironment;
    if (selectedEnv && this.dataProductDetails?.length) {
      const details = this.dataProductDetails.filter((dpDetail) => {
        const dpDetailType = dpDetail.lakehouseEnvironment?.type;
        if (!dpDetailType) {
          return false;
        }
        return V1_isIngestEnvsCompatibleWithEntitlements(
          selectedEnv.environmentClassification,
          dpDetailType,
        );
      });
      if (details.length === 1) {
        return guaranteeNonNullable(details[0]);
      }
    }
    return undefined;
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
  }

  async fetchAccessPoints() {
    try {
      this.resetAccessPoint();
      const dataProduct = guaranteeNonNullable(
        this.selectedDataProductDetail,
        'unable to resolve data product',
      );
      if (dataProduct.origin instanceof V1_SdlcDeploymentDataProductOrigin) {
        const versionedData = new VersionedProjectData();
        versionedData.groupId = dataProduct.origin.group;
        versionedData.artifactId = dataProduct.origin.artifact;
        versionedData.versionId = dataProduct.origin.version;
        this.dpCoordinates = versionedData;
        this.origin = V1_DataProductOriginType.SDLC_DEPLOYMENT;

        const sdlc = new V1_LegendSDLC(
          versionedData.groupId,
          versionedData.artifactId,
          versionedData.versionId,
        );
        const model = V1_serializePureModelContext(
          new V1_PureModelContextPointer(
            // TODO: remove this when it is handled from backend
            new V1_Protocol(
              V1_PureGraphManager.PURE_PROTOCOL_NAME,
              PureClientVersion.VX_X_X,
            ),
            sdlc,
          ),
        );

        this.codeEditorState.setModel(model);
      } else if (
        dataProduct.origin instanceof V1_AdHocDeploymentDataProductOrigin
      ) {
        this.dpCoordinates = undefined;
        this.origin = V1_DataProductOriginType.AD_HOC_DEPLOYMENT;
        this.fullGraphGrammar = dataProduct.origin.definition;

        const model = await this._engine.parseCompatibleModel(
          this.fullGraphGrammar,
        );

        this.codeEditorState.setModel(model);
      }
      this.deploymentId = dataProduct.deploymentId;
      this.setAccessPoints(
        dataProduct.dataProduct.accessPoints.map(
          (accessPoint) => accessPoint.name,
        ),
      );
    } catch (error) {
      assertErrorThrown(error);
      this._application.notificationService.notifyError(
        `unable to fetch access points: ${error.message}`,
      );
    }
  }

  *fetchEnvironment(access_token: string | undefined): GeneratorFn<void> {
    this.ingestEnvLoadingState.inProgress();
    const ingestServerConfigs =
      (yield this._platformServerClient.getIngestEnvironmentSummaries(
        access_token,
      )) as IngestDeploymentServerConfig[];
    this.setAllEnvironments(ingestServerConfigs);
    this.ingestEnvLoadingState.complete();
  }

  async initializeQuery() {
    const query = new V1_ClassInstance();
    query.type = V1_ClassInstanceType.DATA_PRODUCT_ACCESSOR;
    const dataProductAccessor = new V1_DataProductAccessor();
    dataProductAccessor.path = [
      guaranteeNonNullable(this.selectedDataProduct),
      guaranteeNonNullable(this.selectedAccessPoint),
    ];
    dataProductAccessor.parameters = [];
    query.value = dataProductAccessor;
    this.codeEditorState.initialize(
      await this._engine.getValueSpecificationCode(query),
    );
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
      Boolean(this.selectedEnvironment) &&
      !this.codeEditorState.hasErrors
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
    const selectedEnv = guaranteeNonNullable(this.selectedEnvironment);
    rawSource.environment = guaranteeNonNullable(
      getIngestDeploymentServerConfigName(selectedEnv),
      'Unable to resolve env env string',
    );
    if (this.origin === V1_DataProductOriginType.SDLC_DEPLOYMENT) {
      const lakehouseOrigin = new RawLakehouseSdlcOrigin();
      lakehouseOrigin.dpCoordinates = guaranteeNonNullable(this.dpCoordinates);
      rawSource.origin = lakehouseOrigin;
    } else {
      rawSource.origin = new RawLakehouseAdhocOrigin();
    }
    rawSource.paths = this.paths;
    rawSource.warehouse = guaranteeNonNullable(this.warehouse);
    rawSource.deploymentId = this.deploymentId;
    rawSource.query = this.codeEditorState.code;

    return Promise.resolve(
      RawLakehouseConsumerDataCubeSource.serialization.toJson(rawSource),
    );
  }
}
