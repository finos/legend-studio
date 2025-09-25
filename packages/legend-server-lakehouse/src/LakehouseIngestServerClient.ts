/**
 * Copyright (c) 2020-present, Goldman Sachs
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
  AbstractServerClient,
  ContentType,
  HttpHeader,
  type PlainObject,
} from '@finos/legend-shared';
import type {
  IngestDefinitionDeploymentResponse,
  IngestDefinitionValidationResponse,
} from './models/LakehouseIngestionDeploymentResponse.js';
import type {
  IngestDeploymentServerConfig,
  ProducerEnvironment,
} from './models/IngestDeploymentServerConfig.js';
import type { AdhocDataProductDeployResponse } from './models/AdhocDataProductDeployResponse.js';
import type {
  V1_IngestEnvironment,
  V1_SandboxDataProductDeploymentResponse,
  V1_IngestDefinition,
} from '@finos/legend-graph';

export class LakehouseIngestServerClient extends AbstractServerClient {
  environmentClassification: string | undefined;

  private DATA_PRODUCT_URL = 'data-product';
  constructor(config: IngestDeploymentServerConfig | undefined) {
    super({});
    if (config) {
      this.baseUrl = config.ingestServerUrl;
      this.environmentClassification = config.environmentClassification;
    }
  }

  private _token = (token?: string) => ({
    Authorization: `Bearer ${token}`,
  });

  private _tokenWithTextPlain = (token?: string) => ({
    [HttpHeader.CONTENT_TYPE]: ContentType.TEXT_PLAIN,
    Authorization: `Bearer ${token}`,
  });

  private _tokenWithAcceptTextPlain = (token?: string) => ({
    [HttpHeader.ACCEPT]: ContentType.TEXT_PLAIN,
    Authorization: `Bearer ${token}`,
  });

  private _dataProduct = (serverUrl?: string | undefined): string =>
    `${serverUrl ?? this.baseUrl}/${this.DATA_PRODUCT_URL}/api/entitlements/sdlc/deploy/definitions`;

  private _ingestDefinitions = (): string =>
    `${this.baseUrl}/api/ingest/sdlc/deploy/definitions`;

  private _ingest = (serverUrl?: string | undefined): string =>
    `${serverUrl ?? this.baseUrl}/api/ingest`;

  changeServer(serverConfig: IngestDeploymentServerConfig): void {
    this.baseUrl = serverConfig.ingestServerUrl;
    this.environmentClassification = serverConfig.environmentClassification;
  }

  validate(
    validateGrammar: string,
    token: string | undefined,
  ): Promise<PlainObject<IngestDefinitionValidationResponse>> {
    return this.post(
      `${this._ingestDefinitions()}/validate`,
      validateGrammar,
      undefined,
      this._tokenWithTextPlain(token),
    );
  }

  deploy(
    deployGrammar: string,
    token: string | undefined,
  ): Promise<IngestDefinitionDeploymentResponse> {
    return this.post(
      `${this._ingestDefinitions()}`,
      deployGrammar,
      undefined,
      this._tokenWithTextPlain(token),
    );
  }

  write_location(urn: string, token: string | undefined): Promise<PlainObject> {
    return this.post(
      `${this._ingest()}/${encodeURIComponent(urn)}/write-location`,
      undefined,
      undefined,
      this._token(token),
    );
  }

  deployDataProduct(
    fullGrammar: string,
    token: string | undefined,
  ): Promise<PlainObject<AdhocDataProductDeployResponse>> {
    return this.post(
      `${this._dataProduct()}`,
      fullGrammar,
      undefined,
      this._token(token),
    );
  }

  getIngestEnvironment = (
    ingestServerUrl: string | undefined,
    token: string | undefined,
  ): Promise<PlainObject<V1_IngestEnvironment>> =>
    this.get(
      `${this._ingest(ingestServerUrl)}/catalog-state/environment`,
      {},
      this._token(token),
    );

  getDeployedIngestDefinitions = (
    ingestServerUrl: string | undefined,
    token: string | undefined,
  ): Promise<PlainObject<V1_SandboxDataProductDeploymentResponse>> =>
    this.get(`${this._dataProduct(ingestServerUrl)}`, {}, this._token(token));

  getProducerEnvironment = (
    deploymentId: number,
    ingestServerUrl: string | undefined,
    token: string | undefined,
  ): Promise<PlainObject<ProducerEnvironment>> =>
    this.get(
      `${this._ingest(ingestServerUrl)}/catalog-state/producer-environments/deployments/${deploymentId}`,
      {},
      this._token(token),
    );

  getIngestDefinitions = (
    producerEnvironmentUrn: string,
    ingestServerUrl: string | undefined,
    token: string | undefined,
  ): Promise<string[]> =>
    this.get(
      `${this._ingest(ingestServerUrl)}/catalog-state/producer-environments/${producerEnvironmentUrn}/definitions`,
      {},
      this._token(token),
    );

  getIngestDefinitionDetail = (
    ingestDefinitionUrn: string,
    ingestServerUrl: string | undefined,
    token: string | undefined,
  ): Promise<PlainObject<V1_IngestDefinition>> =>
    this.get(
      `${this._ingest(ingestServerUrl)}/catalog-state/definitions/details`,
      {},
      this._token(token),
      {
        ingestDefinitionUrn: ingestDefinitionUrn,
      },
    );

  getIngestDefinitionGrammar = (
    ingestDefinitionUrn: string,
    ingestServerUrl: string | undefined,
    token: string | undefined,
  ): Promise<string> =>
    this.get(
      `${this._ingest(ingestServerUrl)}/catalog-state/definitions/${ingestDefinitionUrn}`,
      {},
      this._tokenWithAcceptTextPlain(token),
    );
}
