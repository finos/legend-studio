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
import { createModelSchema, list, optional, primitive } from 'serializr';

export class V1_DataProductArtifactDataProduct {
  path!: string;
  deploymentId!: string;
  description: string | undefined;
  title: string | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataProductArtifactDataProduct, {
      path: primitive(),
      deploymentId: primitive(),
      description: optional(primitive()),
      title: optional(primitive()),
    }),
  );
}

export class V1_DataProductArtifactResourceBuilder {
  reproducible!: boolean;
  targetEnvironment!: string;
  script!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataProductArtifactResourceBuilder, {
      reproducible: primitive(),
      targetEnvironment: primitive(),
      script: primitive(),
    }),
  );
}

export class V1_DataProductArtifactAccessPointImplementation {
  id!: string;
  resourceBuilder!: V1_DataProductArtifactResourceBuilder;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataProductArtifactAccessPointImplementation, {
      id: primitive(),
      resourceBuilder: usingModelSchema(
        V1_DataProductArtifactResourceBuilder.serialization.schema,
      ),
    }),
  );
}

export class V1_DataProductArtifactAccessPointGroup {
  id!: string;
  description: string | undefined;
  accessPointImplementations: V1_DataProductArtifactAccessPointImplementation[] =
    [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataProductArtifactAccessPointGroup, {
      id: primitive(),
      description: optional(primitive()),
      accessPointImplementations: list(
        usingModelSchema(
          V1_DataProductArtifactAccessPointImplementation.serialization.schema,
        ),
      ),
    }),
  );
}

export class V1_DataProductArtifactGeneration {
  dataProduct!: V1_DataProductArtifactDataProduct;
  accessPointGroups: V1_DataProductArtifactAccessPointGroup[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataProductArtifactGeneration, {
      dataProduct: usingModelSchema(
        V1_DataProductArtifactDataProduct.serialization.schema,
      ),
      accessPointGroups: list(
        usingModelSchema(
          V1_DataProductArtifactAccessPointGroup.serialization.schema,
        ),
      ),
    }),
  );
}

export class V1_DataProductDefinitionAndArtifact {
  definition!: string;
  artifact!: V1_DataProductArtifactGeneration;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataProductDefinitionAndArtifact, {
      definition: primitive(),
      artifact: usingModelSchema(
        V1_DataProductArtifactGeneration.serialization.schema,
      ),
    }),
  );
}
