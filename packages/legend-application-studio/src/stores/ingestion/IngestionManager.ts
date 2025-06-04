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

import type { AppDirNode } from '@finos/legend-graph';
import { IngestDeploymentServerClient } from './IngestDeploymentServerClient.js';
import { IngestDiscoveryServerClient } from './IngestDiscoveryServerClient.js';
import type { GenericLegendApplicationStore } from '@finos/legend-application';
import {
  NetworkClientError,
  type PlainObject,
  assertErrorThrown,
} from '@finos/legend-shared';
import {
  type IngestDefinitionValidationResponse,
  IngestDefinitionDeploymentResponse,
  IngestDefinitionValidationResponseStatus,
  ValidateAndDeploymentResponse,
  createIngestDefinitionValidationResponse,
} from './IngestionDeploymentResponse.js';
import {
  IngestDeploymentServerConfig,
  type LegendIngestionConfiguration,
} from '../../application/LegendIngestionConfiguration.js';
import {
  createAdhocDataProductDeployResponse,
  type AdhocDataProductDeployResponse,
} from './AdhocDataProductDeployResponse.js';

export class IngestionManager {
  private readonly applicationStore: GenericLegendApplicationStore;
  private ingestDiscoveryServerClient: IngestDiscoveryServerClient;
  private ingestDeploymentServerClient: IngestDeploymentServerClient;
  private _currentAppID: number | undefined;
  private _currentLevel: string | undefined;
  private useDefaultServer = false;

  constructor(
    config: LegendIngestionConfiguration,
    applicationStore: GenericLegendApplicationStore,
  ) {
    this.ingestDiscoveryServerClient = new IngestDiscoveryServerClient(
      config.discoveryUrl,
    );
    this.ingestDiscoveryServerClient.setTracerService(
      applicationStore.tracerService,
    );
    this.ingestDeploymentServerClient = new IngestDeploymentServerClient(
      config.deployment.defaultServer,
    );
    this.ingestDeploymentServerClient.setTracerService(
      applicationStore.tracerService,
    );
    this.useDefaultServer = Boolean(config.deployment.useDefaultServer);
    this.applicationStore = applicationStore;
  }

  isCurrentAppDirNode(appDirNode: AppDirNode): boolean {
    return (
      this._currentAppID === appDirNode.appDirId &&
      this._currentLevel === appDirNode.level
    );
  }

  setCurrentAppDirNode(appDirNode: AppDirNode): void {
    this._currentAppID = appDirNode.appDirId;
    this._currentLevel = appDirNode.level;
  }

  async deploy(
    ingestDefinition: string,
    appDirNode: AppDirNode,
    messageCallBack: (message: string) => void,
    token: string | undefined,
  ): Promise<ValidateAndDeploymentResponse> {
    messageCallBack(
      `Discovering associated ingest environment for DID ${appDirNode.appDirId}...`,
    );
    await this.identifyIngestDeploymentServer(appDirNode, token);
    messageCallBack(
      `Validating ingest with server ${this.ingestDeploymentServerClient.baseUrl ?? ''} for realm ${this.ingestDeploymentServerClient.environmentClassification}...`,
    );
    const validateResonse = await this._validate(
      ingestDefinition,
      undefined,
      token,
    );
    const fullResponse = new ValidateAndDeploymentResponse(
      validateResonse,
      undefined,
    );
    if (
      validateResonse.status !==
      IngestDefinitionValidationResponseStatus.SUCCESS
    ) {
      return fullResponse;
    }
    messageCallBack(
      `Validation Success. Deploying ingest with server ${this.ingestDeploymentServerClient.baseUrl ?? ''} for realm ${this.ingestDeploymentServerClient.environmentClassification}...`,
    );
    const deployResponse = await this._deploy(
      ingestDefinition,
      undefined,
      token,
    );
    try {
      messageCallBack(`Deployment Success. Fetching write location...`);
      await this._fetchDeployLocations(deployResponse, token);
    } catch (error) {
      assertErrorThrown(error);
    }

    return fullResponse;
  }

  async deployDataProduct(
    grammarText: string,
    appDirNode: AppDirNode,
    messageCallBack: (message: string) => void,
    token: string | undefined,
  ): Promise<AdhocDataProductDeployResponse> {
    messageCallBack(
      `Discovering associated data product environment for DID ${appDirNode.appDirId}...`,
    );
    await this.identifyIngestDeploymentServer(appDirNode, token);
    messageCallBack(
      `Deploying data product with server ${this.ingestDeploymentServerClient.baseUrl ?? ''} for realm ${this.ingestDeploymentServerClient.environmentClassification}...`,
    );
    const deployResponse =
      await this.ingestDeploymentServerClient.deployDataProduct(
        grammarText,
        token,
      );
    return createAdhocDataProductDeployResponse(deployResponse);
  }

  private async _validate(
    ingestDefinition: string,
    appDirNode: AppDirNode | undefined,
    token: string | undefined,
  ): Promise<IngestDefinitionValidationResponse> {
    if (appDirNode) {
      await this.identifyIngestDeploymentServer(appDirNode, token);
    }
    try {
      const response = await this.ingestDeploymentServerClient.validate(
        ingestDefinition,
        token,
      );
      return createIngestDefinitionValidationResponse(response);
    } catch (error) {
      assertErrorThrown(error);
      if (error instanceof NetworkClientError) {
        return createIngestDefinitionValidationResponse(
          error.payload as PlainObject<IngestDefinitionValidationResponse>,
        );
      }
      throw error;
    }
  }

  private async _deploy(
    ingestDefinition: string,
    appDirNode: AppDirNode | undefined,
    token: string | undefined,
  ): Promise<IngestDefinitionDeploymentResponse> {
    if (appDirNode) {
      await this.identifyIngestDeploymentServer(appDirNode, token);
    }
    // validate
    const response = (await this.ingestDeploymentServerClient.deploy(
      ingestDefinition,
      token,
    )) as unknown as PlainObject<IngestDefinitionDeploymentResponse>;
    return IngestDefinitionDeploymentResponse.serialization.fromJson(response);
  }

  private async _fetchDeployLocations(
    depploymentResponse: IngestDefinitionDeploymentResponse,
    token: string | undefined,
  ): Promise<void> {
    const response = (await this.ingestDeploymentServerClient.write_location(
      depploymentResponse.ingestDefinitionUrn,
      token,
    )) as unknown as PlainObject;
    depploymentResponse.write_location = response;
  }

  private async identifyIngestDeploymentServer(
    appDirNode: AppDirNode,
    token: string | undefined,
  ): Promise<void> {
    // we do not change if current appDirNode is the same as the one we are trying to set
    if (this.useDefaultServer || this.isCurrentAppDirNode(appDirNode)) {
      return;
    }
    const serverConfig = IngestDeploymentServerConfig.serialization.fromJson(
      await this.ingestDiscoveryServerClient.findProducerServer(
        appDirNode.appDirId,
        appDirNode.level,
        token,
      ),
    );
    this.ingestDeploymentServerClient.changeServer(serverConfig);
    this.setCurrentAppDirNode(appDirNode);
  }
}
