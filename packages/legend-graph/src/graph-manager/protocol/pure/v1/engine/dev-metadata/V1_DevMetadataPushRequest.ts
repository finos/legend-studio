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

import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';
import { createModelSchema, optional, primitive, raw } from 'serializr';
import type { V1_PureModelContext } from '../../model/context/V1_PureModelContext.js';
import { V1_pureModelContextPropSchema } from '../../transformation/pureProtocol/V1_PureProtocolSerialization.js';

export class V1_MetadatProject {
  versionId: string | undefined;
  groupId!: string;
  artifactId!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_MetadatProject, {
      groupId: primitive(),
      artifactId: primitive(),
      versionId: optional(primitive()),
    }),
  );
}

export class V1_MetadataRequestOptions {
  includeArtifacts: boolean | undefined;
  buildOverrides: Record<string, string> | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_MetadataRequestOptions, {
      includeArtifacts: optional(primitive()),
      buildOverrides: optional(raw()),
    }),
  );
}

export class V1_DevMetadataPushRequest {
  model!: V1_PureModelContext;
  options: V1_MetadataRequestOptions | undefined;
  project!: V1_MetadatProject;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DevMetadataPushRequest, {
      model: V1_pureModelContextPropSchema,
      options: usingModelSchema(V1_MetadataRequestOptions.serialization.schema),
      project: usingModelSchema(V1_MetadatProject.serialization.schema),
    }),
  );
}
