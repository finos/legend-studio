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

import { SerializationFactory, type PlainObject } from '@finos/legend-shared';
import { createModelSchema, primitive } from 'serializr';

export enum IngestDefinitionValidationResponseStatus {
  NOT_CHECKED = 'NOT_CHECKED',
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
}

export class IngestDefinitionValidationOutput {
  status!: IngestDefinitionValidationResponseStatus;
}

export class IngestDefinitionValidationResponse {
  status!: IngestDefinitionValidationResponseStatus;
  content!: PlainObject;

  static readonly serialization = new SerializationFactory(
    createModelSchema(IngestDefinitionValidationResponse, {
      status: primitive(),
    }),
  );
}

export const createIngestDefinitionValidationResponse = (
  json: PlainObject<IngestDefinitionValidationResponse>,
): IngestDefinitionValidationResponse => {
  const ingestDefinitionValidationResponse =
    new IngestDefinitionValidationResponse();
  ingestDefinitionValidationResponse.status =
    json.status as IngestDefinitionValidationResponseStatus;
  ingestDefinitionValidationResponse.content = json;
  return ingestDefinitionValidationResponse;
};

export class IngestDefinitionDeploymentResponse {
  ingestDefinitionUrn!: string;
  write_location: PlainObject | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(IngestDefinitionDeploymentResponse, {
      ingestDefinitionUrn: primitive(),
    }),
  );
}

export class ValidateAndDeploymentResponse {
  validationResponse: IngestDefinitionValidationResponse;
  deploymentResponse: IngestDefinitionDeploymentResponse | undefined;

  constructor(
    validationResponse: IngestDefinitionValidationResponse,
    deploymentResponse: IngestDefinitionDeploymentResponse | undefined,
  ) {
    this.validationResponse = validationResponse;
    this.deploymentResponse = deploymentResponse;
  }
}
