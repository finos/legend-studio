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
import { makeObservable, observable } from 'mobx';
import type {
  IngestDefinitionDeploymentResponse,
  IngestDefinitionValidationResponse,
} from './IngestionDeploymentResponse.js';
import type { IngestDeploymentServerConfig } from '../../application/LegendIngestionConfiguration.js';

export class IngestDeploymentServerClient extends AbstractServerClient {
  environmentClassification: string;
  constructor(config: IngestDeploymentServerConfig) {
    super({
      baseUrl: config.ingestServerUrl,
    });
    this.environmentClassification = config.environmentClassification;
    makeObservable(this, {
      environmentClassification: observable,
      baseUrl: observable,
    });
  }

  private _token = (token?: string) => ({
    Authorization: `Bearer ${token}`,
  });

  private _tokenWithTextPlain = (token?: string) => ({
    [HttpHeader.CONTENT_TYPE]: ContentType.TEXT_PLAIN,
    Authorization: `Bearer ${token}`,
  });

  private _ingest = (): string =>
    `${this.baseUrl}/api/ingest/sdlc/deploy/definitions`;

  changeServer(serverConfig: IngestDeploymentServerConfig): void {
    this.baseUrl = serverConfig.ingestServerUrl;
    this.environmentClassification = serverConfig.environmentClassification;
  }

  validate(
    validateGrammar: string,
    token: string | undefined,
  ): Promise<PlainObject<IngestDefinitionValidationResponse>> {
    return this.post(
      `${this._ingest()}/validate`,
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
      `${this._ingest()}`,
      deployGrammar,
      undefined,
      this._tokenWithTextPlain(token),
    );
  }
}
