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

import type { V1_IngestEnvironmentClassification } from '@finos/legend-graph';
import { SerializationFactory } from '@finos/legend-shared';
import { createModelSchema, primitive } from 'serializr';

export class IngestDeploymentServerConfig {
  ingestEnvironmentUrn!: string;
  environmentClassification!: V1_IngestEnvironmentClassification;
  ingestServerUrl!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(IngestDeploymentServerConfig, {
      ingestEnvironmentUrn: primitive(),
      environmentClassification: primitive(),
      ingestServerUrl: primitive(),
    }),
  );
}

export class ProducerEnvironment {
  producerEnvironmentUrn!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(ProducerEnvironment, {
      producerEnvironmentUrn: primitive(),
    }),
  );
}
