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

export class V1_DataProductArtifactDataProduct {
  path!: string;
  deploymentId!: string;
  description: string | undefined;
  title: string | undefined;
}

export class V1_DataProductArtifactResourceBuilder {
  reproducible!: boolean;
  targetEnvironment!: string;
  script!: string;
}

export class V1_DataProductArtifactAccessPointImplementation {
  id!: string;
  resourceBuilder!: V1_DataProductArtifactResourceBuilder;
}

export class V1_DataProductArtifactAccessPointGroup {
  id!: string;
  description: string | undefined;
  accessPointImplementations: V1_DataProductArtifactAccessPointImplementation[] =
    [];
}

export class V1_DataProductArtifactGeneration {
  dataProduct!: V1_DataProductArtifactDataProduct;
  accessPointGroups: V1_DataProductArtifactAccessPointGroup[] = [];
}

export class V1_DataProductDefinitionAndArtifact {
  definition!: string;
  artifact!: V1_DataProductArtifactGeneration;
}
