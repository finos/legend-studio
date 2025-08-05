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
  ActionState,
  guaranteeNonNullable,
  type PlainObject,
} from '@finos/legend-shared';
import type { LegendDataCubeApplicationStore } from '../../LegendDataCubeBaseStore.js';
import type { LegendDataCubeDataCubeEngine } from '../../LegendDataCubeDataCubeEngine.js';
import { LegendDataCubeSourceLoaderState } from './LegendDataCubeSourceLoaderState.js';
import { LegendDataCubeSourceBuilderType } from './LegendDataCubeSourceBuilderState.js';
import type { DataCubeAlertService } from '@finos/legend-data-cube';
import type { PersistentDataCube } from '@finos/legend-graph';
import { RawIngestDefinitionDataCubeSource } from '../../model/IngestDefinitionDataCubeSource.js';
import { LakehouseIngestServerClient } from '@finos/legend-server-lakehouse';

export class IngestDefinitionDataCubeSourceLoaderState extends LegendDataCubeSourceLoaderState {
  readonly processState = ActionState.create();

  private ingestDefinition: PlainObject | undefined;
  private lakehouseIngestServerClient: LakehouseIngestServerClient;

  constructor(
    application: LegendDataCubeApplicationStore,
    engine: LegendDataCubeDataCubeEngine,
    alertService: DataCubeAlertService,
    sourceData: PlainObject,
    persistentDataCube: PersistentDataCube,
    onSuccess: () => Promise<void>,
    onError: (error: unknown) => Promise<void>,
  ) {
    super(
      application,
      engine,
      alertService,
      sourceData,
      persistentDataCube,
      onSuccess,
      onError,
    );
    this.lakehouseIngestServerClient = new LakehouseIngestServerClient(
      undefined,
    );
  }

  override get isValid(): boolean {
    return Boolean(this.ingestDefinition);
  }

  override get label() {
    return LegendDataCubeSourceBuilderType.INGEST_DEFINTION;
  }

  async loadIngestDefinition(access_token: string | undefined) {
    const rawSource = RawIngestDefinitionDataCubeSource.serialization.fromJson(
      this.sourceData,
    );
    this.ingestDefinition =
      await this.lakehouseIngestServerClient.getIngestDefinitionDetail(
        rawSource.ingestDefinitionUrn,
        rawSource.ingestServerUrl,
        access_token,
      );
  }

  override async load(source: PlainObject | undefined) {
    const deserializedSource =
      RawIngestDefinitionDataCubeSource.serialization.fromJson(
        guaranteeNonNullable(source),
      );

    this._engine.registerIngestDefinition(this.ingestDefinition);

    return RawIngestDefinitionDataCubeSource.serialization.toJson(
      deserializedSource,
    );
  }
}
