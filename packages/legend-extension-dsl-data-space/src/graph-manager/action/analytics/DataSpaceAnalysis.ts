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

import type {
  Multiplicity,
  Mapping,
  PackageableRuntime,
  PureModel,
  DatasetSpecification,
  MappingModelCoverageAnalysisResult,
  FunctionAnalysisInfo,
} from '@finos/legend-graph';
import { prettyCONSTName, uuid } from '@finos/legend-shared';
import type { DataSpaceSupportInfo } from '../../../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
import type { Diagram } from '@finos/legend-extension-dsl-diagram/graph';

export class DataSpaceExecutionContextAnalysisResult {
  name!: string;
  title?: string | undefined;
  description?: string | undefined;
  mapping!: Mapping;
  defaultRuntime!: PackageableRuntime;
  compatibleRuntimes!: PackageableRuntime[];
  datasets: DatasetSpecification[] = [];
  runtimeMetadata?: DataSpaceExecutionContextRuntimeMetadata;
}

export class DataSpaceExecutionContextRuntimeMetadata {
  storePath?: string;
  connectionPath?: string;
  connectionType?: string;
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

export class NormalizedDataSpaceDocumentationEntry {
  readonly uuid = uuid();
  readonly text: string;
  readonly documentation: string;
  readonly elementEntry: DataSpaceModelDocumentationEntry;
  readonly entry: DataSpaceBasicDocumentationEntry;

  constructor(
    text: string,
    documentation: string,
    elementEntry: DataSpaceModelDocumentationEntry,
    entry: DataSpaceBasicDocumentationEntry,
  ) {
    this.text = text;
    this.documentation = documentation;
    this.elementEntry = elementEntry;
    this.entry = entry;
  }

  get humanizedText(): string {
    return prettyCONSTName(this.text);
  }
}

export class DataSpaceBasicDocumentationEntry {
  name!: string;
  docs: string[] = [];

  get humanizedName(): string {
    return prettyCONSTName(this.name);
  }
}

export class DataSpacePropertyDocumentationEntry extends DataSpaceBasicDocumentationEntry {
  milestoning?: string | undefined;
  /**
   * Make this optional for backward compatibility
   *
   * @backwardCompatibility
   */
  type?: string | undefined;
  /**
   * Make this optional for backward compatibility
   *
   * @backwardCompatibility
   */
  multiplicity?: Multiplicity | undefined;
}

export class DataSpaceModelDocumentationEntry extends DataSpaceBasicDocumentationEntry {
  path!: string;
}

export class DataSpaceClassDocumentationEntry extends DataSpaceModelDocumentationEntry {
  properties: DataSpacePropertyDocumentationEntry[] = [];
  milestoning?: string | undefined;
}

export class DataSpaceEnumerationDocumentationEntry extends DataSpaceModelDocumentationEntry {
  enumValues: DataSpaceBasicDocumentationEntry[] = [];
}

export class DataSpaceAssociationDocumentationEntry extends DataSpaceModelDocumentationEntry {
  properties: DataSpacePropertyDocumentationEntry[] = [];
}

export class DataSpaceDiagramAnalysisResult {
  readonly uuid = uuid();
  title!: string;
  description?: string | undefined;
  diagram!: Diagram;
}

export abstract class DataSpaceExecutableInfo {
  id!: string;
  executionContextKey!: string;
  query!: string;
}

export class DataSpaceTemplateExecutableInfo extends DataSpaceExecutableInfo {}

export class DataSpaceFunctionPointerExecutableInfo extends DataSpaceExecutableInfo {
  function!: string;
}

export class DataSpaceServiceExecutableInfo extends DataSpaceExecutableInfo {
  pattern!: string;
  mapping?: string | undefined;
  runtime?: string | undefined;
  datasets: DatasetSpecification[] = [];
}

export class DataSpaceMultiExecutionServiceExecutableInfo extends DataSpaceExecutableInfo {
  pattern!: string;
  keyedExecutableInfos: DataSpaceMultiExecutionServiceKeyedExecutableInfo[] =
    [];
}

export class DataSpaceMultiExecutionServiceKeyedExecutableInfo {
  key!: string;
  mapping?: string | undefined;
  runtime?: string | undefined;
  datasets: DatasetSpecification[] = [];
}

export abstract class DataSpaceExecutableResult {}

export class DataSpaceExecutableTDSResultColumn {
  readonly uuid = uuid();

  name!: string;
  type?: string | undefined;
  relationalType?: string | undefined;
  documentation?: string | undefined;

  // TODO: we need to think of how we want to support sample values, should we rely on the type here
  // or should we rely on actual execution result on test data?
  sampleValues?: string | undefined;
}

export class DataSpaceExecutableTDSResult extends DataSpaceExecutableResult {
  columns: DataSpaceExecutableTDSResultColumn[] = [];
}

export class DataSpaceExecutableAnalysisResult {
  readonly uuid = uuid();

  title!: string;
  description?: string | undefined;
  executable?: string;
  info?: DataSpaceExecutableInfo | undefined;
  result!: DataSpaceExecutableResult;
}

export class DataSpaceAnalysisResult {
  name!: string;
  package!: string;
  path!: string;

  taggedValues: DataSpaceTaggedValueInfo[] = [];
  stereotypes: DataSpaceStereotypeInfo[] = [];

  title?: string | undefined;
  description?: string | undefined;

  graph!: PureModel;

  executionContextsIndex!: Map<string, DataSpaceExecutionContextAnalysisResult>;
  defaultExecutionContext!: DataSpaceExecutionContextAnalysisResult;

  elementDocs: NormalizedDataSpaceDocumentationEntry[] = [];

  elements: string[] = [];

  diagrams: DataSpaceDiagramAnalysisResult[] = [];

  executables: DataSpaceExecutableAnalysisResult[] = [];

  supportInfo?: DataSpaceSupportInfo | undefined;

  mappingToMappingCoverageResult?: Map<
    string,
    MappingModelCoverageAnalysisResult
  >;

  functionInfos?: Map<string, FunctionAnalysisInfo>;
  dependencyFunctionInfos?: Map<string, FunctionAnalysisInfo>;

  get displayName(): string {
    return this.title ?? prettyCONSTName(this.name);
  }
}
