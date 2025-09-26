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

import { action, makeObservable, observable } from 'mobx';
import {
  LegendDataCubeSourceBuilderState,
  LegendDataCubeSourceBuilderType,
} from './LegendDataCubeSourceBuilderState.js';
import {
  guaranteeNonNullable,
  guaranteeType,
  type PlainObject,
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
  ProducerEnvironment,
  type LakehouseIngestServerClient,
  type LakehousePlatformServerClient,
} from '@finos/legend-server-lakehouse';
import {
  V1_AWSSnowflakeIngestEnvironment,
  V1_AWSSnowflakeProducerEnvironment,
  V1_deserializeIngestEnvironment,
  V1_deserializeProducerEnvironment,
  V1_OpenCatalog,
  type V1_IngestDefinition,
  V1_deserializePureModelContext,
  V1_PureModelContextData,
} from '@finos/legend-graph';
import type { UserManagerSettings } from 'oidc-client-ts';
import { SecondaryOAuthClient } from '../../model/SecondaryOauthClient.js';

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

  userManagerSettings: UserManagerSettings | undefined;

  private LAKEHOUSE_SECTION = '###Lakehouse';

  readonly _platformServerClient: LakehousePlatformServerClient;
  readonly _ingestServerClient: LakehouseIngestServerClient;

  constructor(
    application: LegendDataCubeApplicationStore,
    engine: LegendDataCubeDataCubeEngine,
    platformServerClient: LakehousePlatformServerClient,
    ingestServerClient: LakehouseIngestServerClient,
    alertService: DataCubeAlertService,
  ) {
    super(application, engine, alertService);
    this._platformServerClient = platformServerClient;
    this._ingestServerClient = ingestServerClient;

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

      setDeploymentId: action,
      setSelectedIngestUrn: action,
      setWarehouse: action,
      setIngestUrns: action,
      setTables: action,
      setDatasetGroup: action,
      setSelectedTable: action,
      setIcebergEnabled: action,
    });

    this.selectedIngestUrn = '';
    this.selectedTable = '';
    this.warehouse = undefined;
    this.paths = [];
    this.enableIceberg = false;
    this.milestoning = false;
  }

  setDeploymentId(deploymentId: number | undefined): void {
    this.deploymentId = deploymentId;
    this.setWarehouse(`LAKEHOUSE_PRODUCER_${deploymentId}_QUERY_WH`);
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

  setIcebergEnabled(enable: boolean) {
    this.enableIceberg = enable;
  }

  setUserManagerSettings(settings: UserManagerSettings) {
    this.userManagerSettings = settings;
  }

  async fetchIngestUrns(access_token: string | undefined) {
    //TODO: we should retry this method if access token is invalid
    this.resetDeployment(this.deploymentId);
    try {
      const producerServer =
        await this._platformServerClient.findProducerServer(
          guaranteeNonNullable(this.deploymentId),
          'DEPLOYMENT',
          access_token,
        );
      const ingestServerUrl =
        IngestDeploymentServerConfig.serialization.fromJson(
          producerServer,
        ).ingestServerUrl;
      this.ingestionServerUrl = ingestServerUrl;

      const producerUrn = await this._ingestServerClient.getProducerEnvironment(
        guaranteeNonNullable(this.deploymentId),
        ingestServerUrl,
        access_token,
      );
      const producer = ProducerEnvironment.serialization.fromJson(producerUrn);

      await this.fetchProducerEnvironmentDetails(
        producer,
        ingestServerUrl,
        access_token,
      );

      const ingestDefinitions =
        await this._ingestServerClient.getIngestDefinitions(
          producer.producerEnvironmentUrn,
          ingestServerUrl,
          access_token,
        );
      this.setIngestUrns(ingestDefinitions);
      return;
    } catch (error) {
      throw error;
    }
  }

  private async fetchProducerEnvironmentDetails(
    producer: ProducerEnvironment,
    ingestServerUrl: string,
    access_token: string | undefined,
  ) {
    const producerEnvPlainObject =
      await this._ingestServerClient.getProducerEnvironmentDetails(
        producer.producerEnvironmentUrn,
        ingestServerUrl,
        access_token,
      );

    const producerEnv = guaranteeType(
      V1_deserializeProducerEnvironment(producerEnvPlainObject),
      V1_AWSSnowflakeProducerEnvironment,
    );
    this.icebergEnabled = producerEnv.icebergEnabled;

    if (this.icebergEnabled) {
      this.setIcebergEnabled(this.icebergEnabled);
      await this.fetchIcebergCatalogDetails(access_token);
    }

    this.databaseName = producerEnv.databaseName;
  }

  async fetchDatasets(access_token: string | undefined) {
    this.setTables([]);
    this.setSelectedTable(undefined);
    try {
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
    } catch (error) {
      throw error;
    }
  }

  decoratedIngest(ingestUrn: string) {
    return ingestUrn.split('~').pop();
  }

  async fetchIcebergCatalogDetails(access_token: string | undefined) {
    try {
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
    } catch (error) {
      throw error;
    }
  }

  createPath() {
    this.paths = [];
    this.paths.push(
      guaranteeNonNullable(
        this.decoratedIngest(guaranteeNonNullable(this.selectedIngestUrn)),
      ),
      guaranteeNonNullable(this.selectedTable),
    );
  }

  createIcebergPath() {
    this.paths = [];
    this.paths.push(
      guaranteeNonNullable(this.databaseName),
      guaranteeNonNullable(this.datasetGroup),
      this.milestoning
        ? `${guaranteeNonNullable(this.selectedTable)}_MILESTONED`
        : guaranteeNonNullable(this.selectedTable),
    );
  }

  reset() {
    this.setDeploymentId(undefined);
    this.setIngestUrns([]);
    this.setSelectedIngestUrn(undefined);
    this.setTables([]);
    this.setSelectedTable(undefined);
    this.setDatasetGroup(undefined);
    this.setWarehouse(undefined);
  }

  resetDeployment(deploymentId: number | undefined) {
    this.setDeploymentId(deploymentId);
    this.setIngestUrns([]);
    this.setSelectedIngestUrn(undefined);
    this.setTables([]);
    this.setDatasetGroup(undefined);
    this.setSelectedTable(undefined);
  }

  override get label(): LegendDataCubeSourceBuilderType {
    return LegendDataCubeSourceBuilderType.LAKEHOUSE_PRODUCER;
  }

  override get isValid(): boolean {
    return (
      Boolean(this.warehouse) &&
      Boolean(this.selectedIngestUrn) &&
      Boolean(this.selectedTable) &&
      Boolean(this.deploymentId)
    );
  }

  override async generateSourceData(): Promise<PlainObject> {
    // register ingest definition

    const rawSource = new RawLakehouseProducerDataCubeSource();
    // build data cube source
    if (this.enableIceberg) {
      const oauthClient = new SecondaryOAuthClient(
        guaranteeNonNullable(this.userManagerSettings),
      );
      this.milestoning =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.ingestDefinition as any).writeMode._type === 'batch_milestoned';
      this.createIcebergPath();
      const icebergConfig = new IcebergConfig();
      icebergConfig.catalogUrl = guaranteeNonNullable(this.catalogUrl);

      const token = await oauthClient.getToken();

      const refId = await this._engine.ingestIcebergTable(
        guaranteeNonNullable(this.warehouse),
        this.paths,
        guaranteeNonNullable(this.catalogUrl),
        undefined,
        token,
      );
      icebergConfig.icebergRef = refId.dbReference;
      rawSource.icebergConfig = icebergConfig;
    } else {
      this.createPath();
      this._engine.registerIngestDefinition(this.ingestDefinition);
    }
    rawSource.ingestDefinitionUrn = guaranteeNonNullable(
      this.selectedIngestUrn,
    );
    rawSource.ingestServerUrl = guaranteeNonNullable(this.ingestionServerUrl);
    rawSource.paths = this.paths;
    rawSource.warehouse = guaranteeNonNullable(this.warehouse);

    return Promise.resolve(
      RawLakehouseProducerDataCubeSource.serialization.toJson(rawSource),
    );
  }
}
