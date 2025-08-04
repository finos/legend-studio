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
import { guaranteeNonNullable, type PlainObject } from '@finos/legend-shared';
import type { DataCubeAlertService } from '@finos/legend-data-cube';
import type { LegendDataCubeApplicationStore } from '../../LegendDataCubeBaseStore.js';
import type { LegendDataCubeDataCubeEngine } from '../../LegendDataCubeDataCubeEngine.js';
import { RawIngestDefinitionDataCubeSource } from '../../model/IngestDefinitionDataCubeSource.js';
import {
  IngestDeploymentServerConfig,
  ProducerEnvironment,
  type LakehouseIngestServerClient,
  type LakehousePlatformServerClient,
} from '@finos/legend-server-lakehouse';
import type { V1_IngestDefinition } from '@finos/legend-graph';

export class IngestDefinitionDataCubeSourceBuilderState extends LegendDataCubeSourceBuilderState {
  deploymentId: number | undefined;
  warehouse: string | undefined;
  ingestDefinition: PlainObject<V1_IngestDefinition> | undefined;
  selectedIngestUrn: string | undefined;
  ingestionServerUrl: string | undefined;
  selectedTable: string | undefined;
  paths: string[];
  ingestUrns: string[] = [];
  tables: string[] = [];

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
      selectedTable: observable,

      setDeploymentId: action,
      setSelectedIngestUrn: action,
      setWarehouse: action,
      setIngestUrns: action,
      setTables: action,
      setSelectedTable: action,
    });

    this.selectedIngestUrn = '';
    this.selectedTable = '';
    this.warehouse = undefined;
    this.paths = [];
  }

  setDeploymentId(deploymentId: number | undefined): void {
    this.deploymentId = deploymentId;
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

  setSelectedTable(selectedTable: string | undefined) {
    this.selectedTable = selectedTable;
  }

  async fetchIngestUrns(access_token: string | undefined) {
    //TODO: we should retry this method if access token is invalid
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

  async fetchDatasets(access_token: string | undefined) {
    this.setTables([]);
    this.setSelectedTable(undefined);
    try {
      const plainObjectDef =
        await this._ingestServerClient.getIngestDefinitionDetail(
          guaranteeNonNullable(this.selectedIngestUrn),
          this.ingestionServerUrl,
          access_token,
        );
      this.ingestDefinition = Object.values(plainObjectDef)[0] as PlainObject;

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

  createPath() {
    this.paths.push(
      guaranteeNonNullable(
        this.decoratedIngest(guaranteeNonNullable(this.selectedIngestUrn)),
      ),
      guaranteeNonNullable(this.selectedTable),
    );
  }

  reset() {
    this.setDeploymentId(undefined);
    this.setIngestUrns([]);
    this.setSelectedIngestUrn(undefined);
    this.setTables([]);
    this.setSelectedTable(undefined);
    this.setWarehouse(undefined);
  }

  override get label(): LegendDataCubeSourceBuilderType {
    return LegendDataCubeSourceBuilderType.INGEST_DEFINTION;
  }

  override get isValid(): boolean {
    return (
      Boolean(this.warehouse) &&
      Boolean(this.selectedIngestUrn) &&
      Boolean(this.selectedTable) &&
      Boolean(this.deploymentId)
    );
  }

  override generateSourceData(): Promise<PlainObject> {
    // register ingest definition
    this._engine.registerIngestDefinition(this.ingestDefinition);

    // build data cube source
    this.createPath();
    const rawSource = new RawIngestDefinitionDataCubeSource();
    rawSource.ingestDefinitionUrn = guaranteeNonNullable(
      this.selectedIngestUrn,
    );
    rawSource.ingestServerUrl = guaranteeNonNullable(this.ingestionServerUrl);
    rawSource.paths = this.paths;
    rawSource.warehouse = guaranteeNonNullable(this.warehouse);

    return Promise.resolve(
      RawIngestDefinitionDataCubeSource.serialization.toJson(rawSource),
    );
  }
}
