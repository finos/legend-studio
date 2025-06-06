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

import { primitive, createModelSchema, list, optional } from 'serializr';
import { SerializationFactory } from '@finos/legend-shared';

export class DeploymentResult {
  activatorIdentifier!: string;
  successful!: boolean;
  errors: string[] = [];
  actionResults: string[] = [];
  deployed: string | undefined;
  deploymentLocation: string | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DeploymentResult, {
      activatorIdentifier: primitive(),
      successful: primitive(),
      errors: list(primitive()),
      actionResults: list(primitive()),
      deployed: optional(primitive()),
      deploymentLocation: optional(primitive()),
    }),
  );
}
