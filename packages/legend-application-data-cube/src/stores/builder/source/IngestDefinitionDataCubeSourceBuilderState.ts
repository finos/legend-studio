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
  assertErrorThrown,
  guaranteeNonNullable,
  isEmpty,
  type PlainObject,
} from '@finos/legend-shared';
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

export class IngestDefinitionDataCubeSourceBuilderState extends LegendDataCubeSourceBuilderState {
  deploymentId: number | undefined;
  warehouse: string | undefined;
  paths: string[];
  selectedIngestUrn: string;
  ingestionServerUrl: string | undefined;
  ingestUrns: string[] = [];
  tables: string[] = [];
  selectedTable: string;

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
      paths: observable,
      ingestUrns: observable,
      selectedIngestUrn: observable,
      tables: observable,
      selectedTable: observable,
      ingestionServerUrl: observable,
      setDeploymentId: action,
      setSelectedIngestUrn: action,
      setWarehouse: action,
      setPaths: action,
      setIngestUrns: action,
      setTables: action,
      setSelectedTable: action,
      setIngestionServerUrl: action,
    });

    this.selectedIngestUrn = '';
    this.selectedTable = '';
    this.warehouse = undefined;
    this.paths = [];
  }

  setDeploymentId(deploymentId: number): void {
    this.deploymentId = deploymentId;
  }

  setWarehouse(warehouse: string): void {
    this.warehouse = warehouse;
  }

  setPaths(paths: string[]): void {
    this.paths = paths;
  }

  setSelectedIngestUrn(selectedIngestUrn: string) {
    this.selectedIngestUrn = selectedIngestUrn;
  }

  setIngestUrns(ingestUrns: string[]) {
    this.ingestUrns = ingestUrns;
  }

  setTables(tables: string[]) {
    this.tables = tables;
  }

  setSelectedTable(selectedTable: string) {
    this.selectedTable = selectedTable;
  }

  setIngestionServerUrl(url: string) {
    this.ingestionServerUrl = url;
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
      assertErrorThrown(error);
      throw error;
    }
  }

  fetchDatasets() {
    return ['DS_1', 'DS_2'];
  }

  createPath() {
    const parts = this.selectedIngestUrn.split('~');
    this.paths.push(
      guaranteeNonNullable(parts[parts.length - 1]),
      this.selectedTable,
    );
  }

  override get label(): LegendDataCubeSourceBuilderType {
    return LegendDataCubeSourceBuilderType.INGEST_DEFINTION;
  }
  override get isValid(): boolean {
    return (
      !isEmpty(this.warehouse) &&
      !isEmpty(this.selectedIngestUrn) &&
      !isEmpty(this.deploymentId)
    );
  }
  override generateSourceData(): Promise<PlainObject> {
    this.createPath();
    const rawSource = new RawIngestDefinitionDataCubeSource();
    rawSource.ingestDefinitionUrn = this.selectedIngestUrn;
    rawSource.ingestServerUrl = guaranteeNonNullable(this.ingestionServerUrl);
    rawSource.paths = this.paths;
    rawSource.warehouse = guaranteeNonNullable(this.warehouse);
    return Promise.resolve(
      RawIngestDefinitionDataCubeSource.serialization.toJson(rawSource),
    );
  }
}
