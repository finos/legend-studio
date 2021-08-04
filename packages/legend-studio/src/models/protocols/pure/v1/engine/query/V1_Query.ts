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

import { SerializationFactory } from '@finos/legend-studio-shared';
import { createModelSchema, list, primitive } from 'serializr';

export class V1_Query {
  name!: string;
  id!: string;
  projectId!: string;
  versionId!: string;
  mapping!: string;
  runtime!: string;
  content!: string;
  owners: string[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_Query, {
      content: primitive(),
      id: primitive(),
      mapping: primitive(),
      name: primitive(),
      owners: list(primitive()),
      projectId: primitive(),
      runtime: primitive(),
      versionId: primitive(),
    }),
  );
}

export class V1_LightQuery {
  name!: string;
  id!: string;
  projectId!: string;
  versionId!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_Query, {
      id: primitive(),
      name: primitive(),
      projectId: primitive(),
      versionId: primitive(),
    }),
  );
}
