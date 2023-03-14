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

import type { Diagram } from '@finos/legend-extension-dsl-diagram';
import type {
  Mapping,
  PackageableRuntime,
  PureModel,
} from '@finos/legend-graph';
import { uuid } from '@finos/legend-shared';
import type { DataSpaceSupportInfo } from '../../../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';

export class DataSpaceExecutionContextAnalysisResult {
  name!: string;
  description?: string | undefined;
  mapping!: Mapping;
  defaultRuntime!: PackageableRuntime;
  compatibleRuntimes!: PackageableRuntime[];
}

export class DataSpaceTaggedValueInfo {
  readonly _UUID = uuid();

  profile!: string;
  tag!: string;
  value!: string;
}

export class DataSpaceStereotypeInfo {
  readonly _UUID = uuid();

  profile!: string;
  value!: string;
}

export class DataSpaceDocumentationEntry {
  readonly uuid = uuid();
  readonly elementPath: string;
  readonly subElementText?: string | undefined;
  readonly doc: string;

  constructor(
    elementPath: string,
    subElementText: string | undefined,
    documentation: string,
  ) {
    this.elementPath = elementPath;
    this.subElementText = subElementText;
    this.doc = documentation;
  }
}

export class DataSpaceAnalysisResult {
  name!: string;
  package!: string;
  path!: string;
  taggedValues: DataSpaceTaggedValueInfo[] = [];
  stereotypes: DataSpaceStereotypeInfo[] = [];
  title?: string | undefined;
  description?: string | undefined;
  supportInfo?: DataSpaceSupportInfo | undefined;

  graph!: PureModel;

  executionContextsIndex!: Map<string, DataSpaceExecutionContextAnalysisResult>;
  defaultExecutionContext!: DataSpaceExecutionContextAnalysisResult;

  featuredDiagrams: Diagram[] = [];

  elementDocs: DataSpaceDocumentationEntry[] = [];
}
