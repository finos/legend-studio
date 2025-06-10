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

import { IngestDeploymentServerConfig } from '@finos/legend-server-lakehouse';
import {
  assertNonEmptyString,
  SerializationFactory,
  usingModelSchema,
} from '@finos/legend-shared';
import type { AuthProviderProps } from 'react-oidc-context';
import { createModelSchema, optional, primitive, raw } from 'serializr';

export class IngestDeploymentOIDC {
  redirectPath!: string;
  silentRedirectPath!: string;
  authProviderProps!: AuthProviderProps;

  static readonly serialization = new SerializationFactory(
    createModelSchema(IngestDeploymentOIDC, {
      redirectPath: primitive(),
      silentRedirectPath: primitive(),
      authProviderProps: raw(),
    }),
  );
}

export class IngestionDeploymentConfiguration {
  oidcConfig!: IngestDeploymentOIDC;
  defaultServer!: IngestDeploymentServerConfig;
  useDefaultServer: boolean | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(IngestionDeploymentConfiguration, {
      oidcConfig: usingModelSchema(IngestDeploymentOIDC.serialization.schema),
      defaultServer: usingModelSchema(
        IngestDeploymentServerConfig.serialization.schema,
      ),
      useDefaultServer: optional(primitive()),
    }),
  );
}

export class LegendIngestionConfiguration {
  discoveryUrl!: string;
  deployment!: IngestionDeploymentConfiguration;

  static readonly serialization = new SerializationFactory(
    createModelSchema(LegendIngestionConfiguration, {
      discoveryUrl: primitive(),
      deployment: usingModelSchema(
        IngestionDeploymentConfiguration.serialization.schema,
      ),
    }),
  );
}

export const validateIngestionDeploymentConfiguration = (
  config: LegendIngestionConfiguration,
): void => {
  assertNonEmptyString(
    config.deployment.defaultServer.environmentClassification,
    'Ingestion deployment server environment classification is missing',
  );
  assertNonEmptyString(
    config.deployment.defaultServer.ingestServerUrl,
    'Ingestion deployment server URL is missing',
  );
  assertNonEmptyString(
    config.discoveryUrl,
    'Ingestion discovery URL is missing',
  );
};
