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
import type { DataCubeAlertService } from '@finos/legend-data-cube';
import type { PersistentDataCube } from '@finos/legend-graph';
import { RawLakehouseProducerDataCubeSource } from '../../model/LakehouseProducerDataCubeSource.js';
import type { LakehouseIngestServerClient } from '@finos/legend-server-lakehouse';
import { action, makeObservable, observable } from 'mobx';
import { LegendDataCubeSourceBuilderType } from './LegendDataCubeSourceBuilderState.js';

export class LakehouseProducerDataCubeSourceLoaderState extends LegendDataCubeSourceLoaderState {
  readonly processState = ActionState.create();

  ingestDefinition: PlainObject | undefined;
  ingestDefinitionUrn: string;
  ingestServerUrl: string;

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

    this.ingestDefinitionUrn = '';
    this.ingestServerUrl = '';

    makeObservable(this, {
      ingestDefinition: observable,
      setIngestDefintion: action,

      ingestDefinitionUrn: observable,
      setIngestDefinitionUrn: action,
    });
  }

  setIngestDefintion(ingestDefinition: PlainObject | undefined) {
    this.ingestDefinition = ingestDefinition;
  }

  setIngestDefinitionUrn(urn: string) {
    this.ingestDefinitionUrn = urn;
  }

  override get isValid(): boolean {
    return Boolean(this.ingestDefinition);
  }

  override get label() {
    return LegendDataCubeSourceBuilderType.LAKEHOUSE_PRODUCER;
  }

  reset() {
    const rawSource = RawLakehouseProducerDataCubeSource.serialization.fromJson(
      this.sourceData,
    );
    this.setIngestDefinitionUrn(rawSource.ingestDefinitionUrn);
    this.ingestServerUrl = rawSource.ingestServerUrl;
  }

  async loadIngestDefinition(
    access_token: string | undefined,
    lakehouseIngestServerClient: LakehouseIngestServerClient,
  ) {
    this.setIngestDefintion(
      await lakehouseIngestServerClient.getIngestDefinitionDetail(
        this.ingestDefinitionUrn,
        this.ingestServerUrl,
        access_token,
      ),
    );
  }

  override async load(source: PlainObject | undefined) {
    const deserializedSource =
      RawLakehouseProducerDataCubeSource.serialization.fromJson(
        guaranteeNonNullable(source),
      );

    this._engine.registerIngestDefinition(
      Object.values(
        guaranteeNonNullable(this.ingestDefinition),
      )[0] as PlainObject,
    );

    return RawLakehouseProducerDataCubeSource.serialization.toJson(
      deserializedSource,
    );
  }
}
