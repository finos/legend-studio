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
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import type { DataCubeAlertService } from '@finos/legend-data-cube';
import type { LegendDataCubeApplicationStore } from '../../LegendDataCubeBaseStore.js';
import type { LegendDataCubeDataCubeEngine } from '../../LegendDataCubeDataCubeEngine.js';
import { type LakehouseContractServerClient } from '@finos/legend-server-lakehouse';
import {
  resolveVersion,
  VersionedProjectData,
  type DepotServerClient,
} from '@finos/legend-server-depot';
import {
  V1_SdlcDeploymentDataProductOrigin,
  type V1_EntitlementsDataProductLite,
  type V1_EntitlementsDataProductLiteResponse,
  V1_EntitlementsLakehouseEnvironmentType,
  V1_DataProductOriginType,
  V1_AdHocDeploymentDataProductOrigin,
  V1_LegendSDLC,
  V1_serializePureModelContext,
  V1_PureModelContextPointer,
  V1_ClassInstance,
  V1_ClassInstanceType,
  V1_DataProductAccessor,
  V1_Protocol,
  V1_PureGraphManager,
  PureClientVersion,
  V1_DataProduct,
  V1_dataProductModelSchema,
  V1_deserializePureModelContextData,
  V1_EntitlementsDataProductLiteModelSchema,
} from '@finos/legend-graph';
import {
  RawLakehouseAdhocOrigin,
  RawLakehouseConsumerDataCubeSource,
  RawLakehouseSdlcOrigin,
} from '../../model/LakehouseConsumerDataCubeSource.js';
import { LegendDataCubeCodeEditorState } from '../LegendDataCubeCodeEditorState.js';
import type { Entity } from '@finos/legend-storage';
import { deserialize } from 'serializr';

export class LakehouseConsumerDataCubeSourceBuilderState extends LegendDataCubeSourceBuilderState {
  warehouse: string | undefined;
  selectedDataProduct: V1_EntitlementsDataProductLite | undefined;
  // accesspoint is an array of id and title
  selectedAccessPoint: [string, string] | undefined;
  paths: string[] = [];
  dataProducts: V1_EntitlementsDataProductLite[] = [];
  accessPoints: Map<string, string | undefined> = new Map();
  dpCoordinates: VersionedProjectData | undefined;
  origin: string | undefined;
  fullGraphGrammar: string | undefined;
  deploymentId: number | undefined;
  envMode: V1_EntitlementsLakehouseEnvironmentType;
  showQueryEditor = false;
  DEFAULT_CONSUMER_WAREHOUSE = 'LAKEHOUSE_CONSUMER_DEFAULT_WH';
  codeEditorState: LegendDataCubeCodeEditorState;

  private readonly _contractServerClient: LakehouseContractServerClient;
  private readonly _depotServerClient: DepotServerClient;
  readonly dataProductLoadingState = ActionState.create();
  readonly ingestEnvLoadingState = ActionState.create();

  constructor(
    application: LegendDataCubeApplicationStore,
    engine: LegendDataCubeDataCubeEngine,
    depotServerClient: DepotServerClient,
    contractServerClient: LakehouseContractServerClient,
    alertService: DataCubeAlertService,
  ) {
    super(application, engine, alertService);
    this._contractServerClient = contractServerClient;
    this._depotServerClient = depotServerClient;

    makeObservable(this, {
      warehouse: observable,
      dataProducts: observable,
      selectedDataProduct: observable,
      envMode: observable,
      accessPoints: observable,
      filteredDataProducts: computed,
      selectedAccessPoint: observable,
      showQueryEditor: observable,
      setShowQueryEditor: action,
      setEnvMode: action,
      loadDataProducts: flow,

      setWarehouse: action,
      setDataProducts: action,
      setSelectedDataProduct: action,
      setAccessPoints: action,
      setSelectedAccessPoint: action,
      resetDataProduct: action,
    });

    this.codeEditorState = new LegendDataCubeCodeEditorState(
      engine,
      alertService,
      undefined,
    );

    this.envMode = V1_EntitlementsLakehouseEnvironmentType.PRODUCTION;

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

  setSelectedDataProduct(
    dataProduct: V1_EntitlementsDataProductLite | undefined,
  ) {
    this.selectedDataProduct = deserialize(
      V1_EntitlementsDataProductLiteModelSchema,
      dataProduct,
    );
  }

  setAccessPoints(accessPoints: Map<string, string | undefined>) {
    this.accessPoints = accessPoints;
  }

  setSelectedAccessPoint(accessPoint: [string, string] | undefined) {
    this.selectedAccessPoint = accessPoint;
  }

  setEnvMode(env: V1_EntitlementsLakehouseEnvironmentType): void {
    this.envMode = env;
  }

  get filteredDataProducts(): V1_EntitlementsDataProductLite[] {
    if (!this.dataProducts.length) {
      return [];
    }
    return this.dataProducts.filter(
      (dp) => dp.lakehouseEnvironment?.type === this.envMode,
    );
  }

  setShowQueryEditor(val: boolean): void {
    this.showQueryEditor = val;
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

  async fetchAccessPoints() {
    try {
      this.resetEnvironment();
      const selectedDp = guaranteeNonNullable(this.selectedDataProduct);
      let v1DataProduct: V1_DataProduct | undefined;
      if (selectedDp.origin instanceof V1_SdlcDeploymentDataProductOrigin) {
        const versionedData = new VersionedProjectData();
        versionedData.groupId = selectedDp.origin.group;
        versionedData.artifactId = selectedDp.origin.artifact;
        versionedData.versionId = selectedDp.origin.version;
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

        v1DataProduct = deserialize(
          V1_dataProductModelSchema(
            this._application.pluginManager.getPureProtocolProcessorPlugins(),
          ),
          (
            (await this._depotServerClient.getVersionEntity(
              selectedDp.origin.group,
              selectedDp.origin.artifact,
              resolveVersion(selectedDp.origin.version),
              guaranteeNonNullable(selectedDp.fullPath),
            )) as unknown as Entity
          ).content,
        );
      } else if (
        selectedDp.origin instanceof V1_AdHocDeploymentDataProductOrigin
      ) {
        this.dpCoordinates = undefined;
        this.origin = V1_DataProductOriginType.AD_HOC_DEPLOYMENT;
        this.fullGraphGrammar = selectedDp.origin.definition;

        const model = await this._engine.parseCompatibleModel(
          this.fullGraphGrammar,
        );

        this.codeEditorState.setModel(model);

        v1DataProduct = guaranteeNonNullable(
          V1_deserializePureModelContextData(model)
            .elements.filter((ele) => ele instanceof V1_DataProduct)
            .map((ele) => ele)
            .at(0),
        );
      }
      this.deploymentId = selectedDp.deploymentId;

      const accessPointMap = new Map<string, string | undefined>();
      guaranteeNonNullable(v1DataProduct).accessPointGroups.forEach((apg) => {
        apg.accessPoints.forEach((accessPoint) => {
          accessPointMap.set(accessPoint.id, accessPoint.title);
        });
      });

      this.setAccessPoints(accessPointMap);
    } catch (error) {
      assertErrorThrown(error);
      this._application.notificationService.notifyError(
        `unable to fetch access points: ${error.message}`,
      );
    }
  }

  async initializeQuery() {
    const query = new V1_ClassInstance();
    query.type = V1_ClassInstanceType.DATA_PRODUCT_ACCESSOR;
    const dataProductAccessor = new V1_DataProductAccessor();
    dataProductAccessor.path = [
      guaranteeNonNullable(this.selectedDataProduct?.fullPath),
      guaranteeNonNullable(this.selectedAccessPoint)[0],
    ];
    dataProductAccessor.parameters = [];
    query.value = dataProductAccessor;
    this.codeEditorState.initialize(
      await this._engine.getValueSpecificationCode(query),
    );
  }

  reset() {
    this.setDataProducts([]);
    this.resetDataProduct();
  }

  resetDataProduct() {
    this.setSelectedDataProduct(undefined);
    this.resetEnvironment();
  }

  resetEnvironment() {
    this.setWarehouse(undefined);
    this.setAccessPoints(new Map());
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
      Boolean(this.envMode) &&
      !this.codeEditorState.hasErrors
    );
  }

  override async generateSourceData(): Promise<PlainObject> {
    // build data cube source
    this.paths = [];
    this.paths.push(
      ...[
        guaranteeNonNullable(this.selectedDataProduct?.fullPath),
        guaranteeNonNullable(this.selectedAccessPoint)[0],
      ],
    );

    const rawSource = new RawLakehouseConsumerDataCubeSource();
    if (this.origin === V1_DataProductOriginType.SDLC_DEPLOYMENT) {
      const lakehouseOrigin = new RawLakehouseSdlcOrigin();
      lakehouseOrigin.dpCoordinates = guaranteeNonNullable(this.dpCoordinates);
      rawSource.origin = lakehouseOrigin;
    } else {
      rawSource.origin = new RawLakehouseAdhocOrigin();
    }
    rawSource.paths = this.paths;
    rawSource.environment = guaranteeNonNullable(this.envMode);
    rawSource.warehouse = guaranteeNonNullable(this.warehouse);
    rawSource.deploymentId = this.deploymentId;
    rawSource.query = this.codeEditorState.code;

    return Promise.resolve(
      RawLakehouseConsumerDataCubeSource.serialization.toJson(rawSource),
    );
  }
}
