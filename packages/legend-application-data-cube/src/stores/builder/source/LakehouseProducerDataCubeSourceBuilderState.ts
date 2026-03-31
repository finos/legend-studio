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
  guaranteeType,
  type PlainObject,
  ActionState,
} from '@finos/legend-shared';
import type { DataCubeAlertService } from '@finos/legend-data-cube';
import type { LegendDataCubeApplicationStore } from '../../LegendDataCubeBaseStore.js';
import type { LegendDataCubeDataCubeEngine } from '../../LegendDataCubeDataCubeEngine.js';
import {
  IcebergConfig,
  RawLakehouseProducerDataCubeSource,
} from '../../model/LakehouseProducerDataCubeSource.js';
import {
  IngestDeploymentServerConfig,
  type LakehouseIngestServerClient,
  type LakehousePlatformServerClient,
  type LakehouseContractServerClient,
} from '@finos/legend-server-lakehouse';
import {
  V1_AWSSnowflakeIngestEnvironment,
  V1_AWSSnowflakeProducerEnvironment,
  V1_deserializeIngestEnvironment,
  V1_deserializeProducerEnvironment,
  V1_OpenCatalog,
  type V1_IngestDefinition,
  V1_EntitlementsLakehouseEnvironmentType,
  type V1_EntitlementsUserEnvResponse,
  V1_deserializePureModelContext,
  V1_PureModelContextData,
  V1_IngestEnvironmentClassification,
} from '@finos/legend-graph';

export class LakehouseProducerDataCubeSourceBuilderState extends LegendDataCubeSourceBuilderState {
  deploymentId: number | undefined;
  warehouse: string | undefined;
  ingestDefinition: PlainObject<V1_IngestDefinition> | undefined;
  selectedIngestUrn: string | undefined;
  ingestionServerUrl: string | undefined;
  selectedTable: string | undefined;
  paths: string[];
  ingestUrns: string[] = [];
  tables: string[] = [];
  datasetGroup: string | undefined;
  icebergEnabled: boolean | undefined;
  enableIceberg: boolean;
  databaseName: string | undefined;
  catalogUrl: string | undefined;
  milestoning: boolean;
  envMode: V1_EntitlementsLakehouseEnvironmentType;
  userEntitledLakehouseEnv: string | undefined;
  allLakehouseEnvironments: IngestDeploymentServerConfig[] = [];
  selectedLakehouseEnv: IngestDeploymentServerConfig | undefined;
  producerEnvironments: string[] = [];
  selectedProducerEnv: string | undefined;
  user: string | undefined;
  readonly initialLoadState = ActionState.create();
  readonly fetchProducerEnvironmentsState = ActionState.create();

  private LAKEHOUSE_SECTION = '###Lakehouse';

  readonly _platformServerClient: LakehousePlatformServerClient;
  readonly _ingestServerClient: LakehouseIngestServerClient;
  readonly _contractServerClient: LakehouseContractServerClient;

  constructor(
    application: LegendDataCubeApplicationStore,
    engine: LegendDataCubeDataCubeEngine,
    platformServerClient: LakehousePlatformServerClient,
    ingestServerClient: LakehouseIngestServerClient,
    contractServerClient: LakehouseContractServerClient,
    alertService: DataCubeAlertService,
  ) {
    super(application, engine, alertService);
    this._platformServerClient = platformServerClient;
    this._ingestServerClient = ingestServerClient;
    this._contractServerClient = contractServerClient;

    makeObservable(this, {
      deploymentId: observable,
      warehouse: observable,
      ingestUrns: observable,
      selectedIngestUrn: observable,
      tables: observable,
      datasetGroup: observable,
      selectedTable: observable,
      icebergEnabled: observable,
      enableIceberg: observable,
      envMode: observable,
      userEntitledLakehouseEnv: observable,
      allLakehouseEnvironments: observable,
      selectedLakehouseEnv: observable,
      producerEnvironments: observable,
      selectedProducerEnv: observable,

      setDeploymentId: action,
      setSelectedIngestUrn: action,
      setWarehouse: action,
      setIngestUrns: action,
      setTables: action,
      setDatasetGroup: action,
      setSelectedTable: action,
      setEnableIceberg: action,
      setEnvMode: action,
      setSelectedLakehouseEnv: action,
      setSelectedProducerEnv: action,
      initialLoad: flow,
      fetchProducerEnvironments: flow,
    });

    this.selectedIngestUrn = '';
    this.selectedTable = '';
    this.warehouse = undefined;
    this.paths = [];
    this.enableIceberg = false;
    this.milestoning = false;
    this.envMode = V1_EntitlementsLakehouseEnvironmentType.PRODUCTION;
  }

  // ===== Shared helpers =====

  private get currentClassification(): V1_IngestEnvironmentClassification {
    return this.envMode === V1_EntitlementsLakehouseEnvironmentType.PRODUCTION
      ? V1_IngestEnvironmentClassification.PROD
      : V1_IngestEnvironmentClassification.PROD_PARALLEL;
  }

  /**
   * Extracts the identifier (last segment after ':') from a producer
   * environment URN. This can be a numeric deployment ID or a user ID.
   */
  private static extractProducerId(urn: string): string | undefined {
    return urn.split(':').pop();
  }

  decoratedIngest(ingestUrn: string): string | undefined {
    return ingestUrn.split('~').pop();
  }

  // ===== Simple setters =====

  setDeploymentId(deploymentId: number | undefined): void {
    this.deploymentId = deploymentId;
    if (deploymentId !== undefined) {
      this.setWarehouse(`LAKEHOUSE_PRODUCER_${deploymentId}_QUERY_WH`);
    }
  }

  setWarehouse(warehouse: string | undefined): void {
    this.warehouse = warehouse;
  }

  setSelectedIngestUrn(selectedIngestUrn: string | undefined) {
    this.selectedIngestUrn = selectedIngestUrn;
  }

  setIngestUrns(ingestUrns: string[]) {
    this.ingestUrns = ingestUrns;
  }

  setTables(tables: string[]) {
    this.tables = tables;
  }

  setDatasetGroup(datasetGroup: string | undefined) {
    this.datasetGroup = datasetGroup;
  }

  setSelectedTable(selectedTable: string | undefined) {
    this.selectedTable = selectedTable;
  }

  setEnableIceberg(enable: boolean) {
    this.enableIceberg = enable;
  }

  setSelectedLakehouseEnv(env: IngestDeploymentServerConfig | undefined) {
    this.selectedLakehouseEnv = env;
  }

  // ===== Reset methods (composable hierarchy) =====

  /**
   * Resets ingest/dataset/iceberg state (everything downstream of producer selection).
   */
  private resetDownstreamState() {
    this.deploymentId = undefined;
    this.user = undefined;
    this.setWarehouse(undefined);
    this.setIngestUrns([]);
    this.setSelectedIngestUrn(undefined);
    this.setTables([]);
    this.setDatasetGroup(undefined);
    this.setSelectedTable(undefined);
    this.icebergEnabled = undefined;
    this.enableIceberg = false;
    this.catalogUrl = undefined;
    this.databaseName = undefined;
    this.ingestDefinition = undefined;
    this.ingestionServerUrl = undefined;
    this.paths = [];
  }

  /**
   * Resets the producer selection and all downstream state.
   */
  private resetProducerSelection() {
    this.producerEnvironments = [];
    this.selectedProducerEnv = undefined;
    this.resetDownstreamState();
  }

  /**
   * Full reset: clears everything including producer environments.
   * Called when mode changes.
   */
  resetAll() {
    this.resetProducerSelection();
  }

  /**
   * Resets downstream state while preserving the deployment ID.
   * Used when refetching URNs for the same producer.
   */
  resetDeployment(deploymentId: number | undefined) {
    this.setDeploymentId(deploymentId);
    this.setIngestUrns([]);
    this.setSelectedIngestUrn(undefined);
    this.setTables([]);
    this.setDatasetGroup(undefined);
    this.setSelectedTable(undefined);
  }

  // ===== State transitions =====

  setEnvMode(
    env: V1_EntitlementsLakehouseEnvironmentType,
    access_token?: string | undefined,
  ) {
    this.envMode = env;
    this.resetAll();
    this.resolveLakehouseEnvironment(access_token);
  }

  private resolveLakehouseEnvironment(access_token?: string | undefined) {
    const matchingEnv = this.allLakehouseEnvironments.find(
      (env) =>
        env.environmentName === this.userEntitledLakehouseEnv &&
        env.environmentClassification === this.currentClassification,
    );
    this.setSelectedLakehouseEnv(matchingEnv);
    if (matchingEnv) {
      this.setSelectedProducerEnv(undefined);
      // NOTE: we trigger this but don't await because it's a flow
      this.fetchProducerEnvironments(access_token);
    }
  }

  setSelectedProducerEnv(env: string | undefined) {
    this.selectedProducerEnv = env;
    this.resetDownstreamState();

    if (env) {
      const id =
        LakehouseProducerDataCubeSourceBuilderState.extractProducerId(env);
      if (id) {
        const numericId = Number(id);
        if (!isNaN(numericId)) {
          this.setDeploymentId(numericId);
        } else {
          this.user = id;
          this.setWarehouse(`LAKEHOUSE_PRODUCER_${id.toUpperCase()}_QUERY_WH`);
        }
      }
    }
  }

  get filteredLakehouseEnvironments(): IngestDeploymentServerConfig[] {
    return this.allLakehouseEnvironments.filter(
      (env) =>
        env.environmentName === this.userEntitledLakehouseEnv &&
        env.environmentClassification === this.currentClassification,
    );
  }

  // ===== Data fetching =====

  *initialLoad(access_token?: string | undefined) {
    try {
      this.initialLoadState.inProgress();
      const results =
        (yield this._platformServerClient.getIngestEnvironmentSummaries(
          access_token,
        )) as PlainObject<IngestDeploymentServerConfig>[];
      this.allLakehouseEnvironments = results.map((result) =>
        IngestDeploymentServerConfig.serialization.fromJson(result),
      );

      const entitlementEnvs =
        (yield this._contractServerClient.getUserEntitlementEnvs(
          this._application.identityService.currentUser,
          access_token,
        )) as V1_EntitlementsUserEnvResponse;
      this.userEntitledLakehouseEnv =
        entitlementEnvs.users.at(0)?.lakehouseEnvironment;

      this.resolveLakehouseEnvironment(access_token);
      this.initialLoadState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.initialLoadState.fail();
      throw error;
    }
  }

  *fetchProducerEnvironments(access_token: string | undefined) {
    try {
      if (!this.selectedLakehouseEnv) {
        return;
      }
      this.fetchProducerEnvironmentsState.inProgress();
      const currentUser = this._application.identityService.currentUser;
      const results = (yield this._ingestServerClient.getProducerEnvironments(
        this.selectedLakehouseEnv.ingestServerUrl,
        access_token,
      )) as string[];

      this.producerEnvironments = results.filter((result) => {
        const id =
          LakehouseProducerDataCubeSourceBuilderState.extractProducerId(result);
        if (!id) {
          return false;
        }
        // Keep numeric (deployment) environments and user-matching environments
        return !isNaN(Number(id)) || id === currentUser;
      });
      this.fetchProducerEnvironmentsState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.fetchProducerEnvironmentsState.fail();
      throw error;
    }
  }

  async fetchIngestUrns(access_token: string | undefined) {
    this.resetDeployment(this.deploymentId);
    const ingestServerUrl = guaranteeNonNullable(
      this.selectedLakehouseEnv,
    ).ingestServerUrl;
    this.ingestionServerUrl = ingestServerUrl;

    const producerUrn = guaranteeNonNullable(this.selectedProducerEnv);

    await this.fetchProducerEnvironmentDetails(
      producerUrn,
      ingestServerUrl,
      access_token,
    );

    const ingestDefinitions =
      await this._ingestServerClient.getIngestDefinitions(
        producerUrn,
        ingestServerUrl,
        access_token,
      );
    this.setIngestUrns(ingestDefinitions);
  }

  private async fetchProducerEnvironmentDetails(
    producerUrn: string,
    ingestServerUrl: string,
    access_token: string | undefined,
  ) {
    const producerEnvPlainObject =
      await this._ingestServerClient.getProducerEnvironmentDetails(
        producerUrn,
        ingestServerUrl,
        access_token,
      );

    const producerEnv = guaranteeType(
      V1_deserializeProducerEnvironment(producerEnvPlainObject),
      V1_AWSSnowflakeProducerEnvironment,
    );
    this.icebergEnabled = producerEnv.icebergEnabled;

    if (this.icebergEnabled) {
      this.setEnableIceberg(this.icebergEnabled);
      await this.fetchIcebergCatalogDetails(access_token);
    }

    this.databaseName = producerEnv.databaseName;
  }

  async fetchDatasets(access_token: string | undefined) {
    this.setTables([]);
    this.setSelectedTable(undefined);

    const ingestGrammar =
      await this._ingestServerClient.getIngestDefinitionGrammar(
        guaranteeNonNullable(this.selectedIngestUrn),
        this.ingestionServerUrl,
        access_token,
      );

    const ingestPMCDPlainObject = await this._engine.parseCompatibleModel(
      `${this.LAKEHOUSE_SECTION}\n${ingestGrammar}`,
    );

    const ingestDefPMCD = guaranteeType(
      V1_deserializePureModelContext(ingestPMCDPlainObject),
      V1_PureModelContextData,
    );

    this.ingestDefinition = (
      ingestDefPMCD.elements.at(0) as V1_IngestDefinition
    ).content;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.setDatasetGroup((this.ingestDefinition as any).datasetGroup);

    this.setTables(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.ingestDefinition as any).datasets.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (dataset: any) => dataset.name,
      ),
    );
  }

  async fetchIcebergCatalogDetails(access_token: string | undefined) {
    const ingestEnvPlainObject =
      await this._ingestServerClient.getIngestEnvironment(
        this.ingestionServerUrl,
        access_token,
      );
    const ingestEnv = guaranteeType(
      V1_deserializeIngestEnvironment(ingestEnvPlainObject),
      V1_AWSSnowflakeIngestEnvironment,
    );
    this.warehouse = ingestEnv.iceberg.catalog.name;
    this.catalogUrl = guaranteeType(
      ingestEnv.iceberg.catalog,
      V1_OpenCatalog,
    ).proxyUrl;
  }

  // ===== Path builders =====

  createPath() {
    this.paths = [
      guaranteeNonNullable(
        this.decoratedIngest(guaranteeNonNullable(this.selectedIngestUrn)),
      ),
      guaranteeNonNullable(this.selectedTable),
    ];
  }

  createIcebergPath() {
    const table = guaranteeNonNullable(this.selectedTable);
    this.paths = [
      guaranteeNonNullable(this.databaseName),
      guaranteeNonNullable(this.datasetGroup),
      this.milestoning ? `${table}_MILESTONED` : table,
    ];
  }

  // ===== Source generation =====

  override get label(): LegendDataCubeSourceBuilderType {
    return LegendDataCubeSourceBuilderType.LAKEHOUSE_PRODUCER;
  }

  override get isValid(): boolean {
    return (
      Boolean(this.warehouse) &&
      Boolean(this.selectedIngestUrn) &&
      Boolean(this.selectedTable) &&
      Boolean(this.selectedProducerEnv) &&
      Boolean(this.selectedLakehouseEnv) &&
      (Boolean(this.deploymentId) || Boolean(this.user))
    );
  }

  override async generateSourceData(): Promise<PlainObject> {
    const rawSource = new RawLakehouseProducerDataCubeSource();
    if (this.enableIceberg) {
      this.milestoning =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.ingestDefinition as any).writeMode._type === 'batch_milestoned';
      this.createIcebergPath();
      const icebergConfig = new IcebergConfig();
      icebergConfig.catalogUrl = guaranteeNonNullable(this.catalogUrl);
      rawSource.icebergConfig = icebergConfig;
    } else {
      this.createPath();
    }
    rawSource.ingestDefinitionUrn = guaranteeNonNullable(
      this.selectedIngestUrn,
    );
    rawSource.ingestServerUrl = guaranteeNonNullable(this.ingestionServerUrl);
    rawSource.paths = this.paths;
    rawSource.warehouse = guaranteeNonNullable(this.warehouse);
    if (this.deploymentId !== undefined) {
      rawSource.deploymentId = this.deploymentId;
    }
    if (this.user !== undefined) {
      rawSource.user = this.user;
    }

    return Promise.resolve(
      RawLakehouseProducerDataCubeSource.serialization.toJson(rawSource),
    );
  }
}
