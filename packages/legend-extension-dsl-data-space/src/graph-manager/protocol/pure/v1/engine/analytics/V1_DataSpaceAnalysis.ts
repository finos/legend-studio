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

import {
  type V1_Multiplicity,
  type V1_PureModelContextData,
  type V1_DatasetSpecification,
  type PureProtocolProcessorPlugin,
  V1_multiplicityModelSchema,
  V1_deserializeDatasetSpecification,
  V1_pureModelContextDataPropSchema,
  V1_MappingModelCoverageAnalysisResult,
} from '@finos/legend-graph';
import {
  type PlainObject,
  SerializationFactory,
  optionalCustom,
  UnsupportedOperationError,
  customListWithSchema,
  usingConstantValueSchema,
  isString,
  isNonNullable,
  optionalCustomUsingModelSchema,
  usingModelSchema,
} from '@finos/legend-shared';
import {
  type ModelSchema,
  createModelSchema,
  custom,
  deserialize,
  list,
  object,
  optional,
  primitive,
  SKIP,
} from 'serializr';
import type { V1_DataSpaceSupportInfo } from '../../model/packageableElements/dataSpace/V1_DSL_DataSpace_DataSpace.js';
import { V1_deserializeSupportInfo } from '../../transformation/pureProtocol/V1_DSL_DataSpace_ProtocolHelper.js';

class V1_DataSpaceTaggedValueInfo {
  profile!: string;
  tag!: string;
  value!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataSpaceTaggedValueInfo, {
      profile: primitive(),
      tag: primitive(),
      value: primitive(),
    }),
  );
}

class V1_DataSpaceStereotypeInfo {
  profile!: string;
  value!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataSpaceStereotypeInfo, {
      profile: primitive(),
      value: primitive(),
    }),
  );
}

class V1_DataSpaceExecutionContextAnalysisResult {
  name!: string;
  title?: string | undefined;
  description?: string | undefined;
  mapping!: string;
  defaultRuntime!: string;
  compatibleRuntimes!: string[];
  mappingModelCoverageAnalysisResult!: V1_MappingModelCoverageAnalysisResult;
  datasets: V1_DatasetSpecification[] = [];
  runtimeMetadata?: V1_DataSpaceExecutionContextRuntimeMetadata;
}

class V1_DataSpaceExecutionContextRuntimeMetadata {
  storePath?: string;
  connectionPath?: string;
  connectionType?: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataSpaceExecutionContextRuntimeMetadata, {
      storePath: optional(primitive()),
      connectionPath: optional(primitive()),
      connectionType: optional(primitive()),
    }),
  );
}

const V1_dataSpaceExecutionContextAnalysisResultModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_DataSpaceExecutionContextAnalysisResult> =>
  createModelSchema(V1_DataSpaceExecutionContextAnalysisResult, {
    compatibleRuntimes: list(primitive()),
    datasets: list(
      custom(
        () => SKIP,
        (val: PlainObject<V1_DatasetSpecification>) =>
          V1_deserializeDatasetSpecification(val, plugins),
      ),
    ),
    defaultRuntime: primitive(),
    description: optional(primitive()),
    mappingModelCoverageAnalysisResult: usingModelSchema(
      V1_MappingModelCoverageAnalysisResult.serialization.schema,
    ),
    mapping: primitive(),
    name: primitive(),
    title: optional(primitive()),
    runtimeMetadata: usingModelSchema(
      V1_DataSpaceExecutionContextRuntimeMetadata.serialization.schema,
    ),
  });

export class V1_DataSpaceBasicDocumentationEntry {
  name!: string;
  docs: string[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataSpaceBasicDocumentationEntry, {
      docs: list(primitive()),
      name: primitive(),
    }),
  );
}

export class V1_DataSpacePropertyDocumentationEntry extends V1_DataSpaceBasicDocumentationEntry {
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
  multiplicity?: V1_Multiplicity | undefined;

  static override readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataSpacePropertyDocumentationEntry, {
      docs: list(primitive()),
      milestoning: optional(primitive()),
      multiplicity: optionalCustomUsingModelSchema(V1_multiplicityModelSchema),
      name: primitive(),
      type: optional(primitive()),
    }),
  );
}

export class V1_DataSpaceModelDocumentationEntry extends V1_DataSpaceBasicDocumentationEntry {
  path!: string;

  static override readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataSpaceModelDocumentationEntry, {
      docs: list(primitive()),
      name: primitive(),
      path: primitive(),
    }),
  );
}

export class V1_DataSpaceClassDocumentationEntry extends V1_DataSpaceModelDocumentationEntry {
  properties: V1_DataSpacePropertyDocumentationEntry[] = [];
  milestoning?: string | undefined;

  static override readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataSpaceClassDocumentationEntry, {
      docs: list(primitive()),
      milestoning: optional(primitive()),
      name: primitive(),
      path: primitive(),
      properties: list(object(V1_DataSpacePropertyDocumentationEntry)),
    }),
  );
}

export class V1_DataSpaceEnumerationDocumentationEntry extends V1_DataSpaceModelDocumentationEntry {
  enumValues: V1_DataSpaceBasicDocumentationEntry[] = [];

  static override readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataSpaceEnumerationDocumentationEntry, {
      enumValues: list(object(V1_DataSpaceBasicDocumentationEntry)),
      docs: list(primitive()),
      name: primitive(),
      path: primitive(),
    }),
  );
}

export class V1_DataSpaceAssociationDocumentationEntry extends V1_DataSpaceModelDocumentationEntry {
  properties: V1_DataSpacePropertyDocumentationEntry[] = [];

  static override readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataSpaceAssociationDocumentationEntry, {
      docs: list(primitive()),
      name: primitive(),
      path: primitive(),
      properties: list(object(V1_DataSpacePropertyDocumentationEntry)),
    }),
  );
}

enum V1_DataSpaceModelDocumentationEntryType {
  MODEL = 'model',
  CLASS = 'class',
  ENUMERATION = 'enumeration',
  ASSOCIATION = 'association',
}

function V1_deserializeModelDocumentationEntry(
  json: PlainObject<V1_DataSpaceModelDocumentationEntry>,
): V1_DataSpaceModelDocumentationEntry {
  switch (json._type) {
    case V1_DataSpaceModelDocumentationEntryType.MODEL:
      return V1_DataSpaceModelDocumentationEntry.serialization.fromJson(json);
    case V1_DataSpaceModelDocumentationEntryType.CLASS:
      return V1_DataSpaceClassDocumentationEntry.serialization.fromJson(json);
    case V1_DataSpaceModelDocumentationEntryType.ENUMERATION:
      return V1_DataSpaceEnumerationDocumentationEntry.serialization.fromJson(
        json,
      );
    case V1_DataSpaceModelDocumentationEntryType.ASSOCIATION:
      return V1_DataSpaceAssociationDocumentationEntry.serialization.fromJson(
        json,
      );
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize model documentation entry of type '${json._type}'`,
      );
  }
}

export class V1_DataSpaceDiagramAnalysisResult {
  title!: string;
  description?: string | undefined;
  diagram!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataSpaceDiagramAnalysisResult, {
      description: optional(primitive()),
      diagram: primitive(),
      title: primitive(),
    }),
  );
}

export abstract class V1_DataSpaceExecutableInfo {
  query!: string;
}

const V1_DATA_SPACE_TEMPLATE_EXECUTABLE_INFO_TYPE = 'templateExecutableInfo';
const V1_DATA_SPACE_FUNCTION_POINTER_EXECUTABLE_INFO_TYPE =
  'functionPointerExecutableInfo';
const V1_DATA_SPACE_SERVICE_EXECUTABLE_INFO_TYPE = 'service';
const V1_DATA_SPACE_MULTI_EXECUTION_SERVICE_EXECUTABLE_INFO_TYPE =
  'multiExecutionService';

export class V1_DataSpaceTemplateExecutableInfo extends V1_DataSpaceExecutableInfo {
  id!: string;
  executionContextKey!: string;
}

export class V1_DataSpaceFunctionPointerExecutableInfo extends V1_DataSpaceExecutableInfo {
  id!: string;
  executionContextKey!: string;
  function!: string;
}

const V1_DataSpaceTemplateExecutableInfoModelSchema =
  (): ModelSchema<V1_DataSpaceTemplateExecutableInfo> =>
    createModelSchema(V1_DataSpaceTemplateExecutableInfo, {
      _type: usingConstantValueSchema(
        V1_DATA_SPACE_TEMPLATE_EXECUTABLE_INFO_TYPE,
      ),
      id: primitive(),
      executionContextKey: primitive(),
    });

const V1_DataSpaceFunctionPointerExecutableInfoModelSchema =
  (): ModelSchema<V1_DataSpaceFunctionPointerExecutableInfo> =>
    createModelSchema(V1_DataSpaceFunctionPointerExecutableInfo, {
      _type: usingConstantValueSchema(
        V1_DATA_SPACE_FUNCTION_POINTER_EXECUTABLE_INFO_TYPE,
      ),
      id: primitive(),
      executionContextKey: primitive(),
      function: primitive(),
    });

export class V1_DataSpaceServiceExecutableInfo extends V1_DataSpaceExecutableInfo {
  pattern!: string;
  mapping?: string | undefined;
  runtime?: string | undefined;
  datasets: V1_DatasetSpecification[] = [];
}

const V1_dataSpaceServiceExecutableInfoModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_DataSpaceServiceExecutableInfo> =>
  createModelSchema(V1_DataSpaceServiceExecutableInfo, {
    _type: usingConstantValueSchema(V1_DATA_SPACE_SERVICE_EXECUTABLE_INFO_TYPE),
    datasets: list(
      custom(
        () => SKIP,
        (val: PlainObject<V1_DatasetSpecification>) =>
          V1_deserializeDatasetSpecification(val, plugins),
      ),
    ),
    mapping: optional(primitive()),
    pattern: primitive(),
    query: primitive(),
    runtime: optional(primitive()),
  });

export class V1_DataSpaceMultiExecutionServiceKeyedExecutableInfo {
  key!: string;
  mapping?: string | undefined;
  runtime?: string | undefined;
  datasets: V1_DatasetSpecification[] = [];
}

const V1_dataSpaceMultiExecutionServiceKeyedExecutableInfoModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_DataSpaceMultiExecutionServiceKeyedExecutableInfo> =>
  createModelSchema(V1_DataSpaceMultiExecutionServiceKeyedExecutableInfo, {
    datasets: list(
      custom(
        () => SKIP,
        (val: PlainObject<V1_DatasetSpecification>) =>
          V1_deserializeDatasetSpecification(val, plugins),
      ),
    ),
    key: primitive(),
    mapping: optional(primitive()),
    runtime: optional(primitive()),
  });

export class V1_DataSpaceMultiExecutionServiceExecutableInfo extends V1_DataSpaceExecutableInfo {
  pattern!: string;
  keyedExecutableInfos: V1_DataSpaceMultiExecutionServiceKeyedExecutableInfo[] =
    [];
}

const V1_dataSpaceMultiExecutionServiceExecutableInfoModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_DataSpaceMultiExecutionServiceExecutableInfo> =>
  createModelSchema(V1_DataSpaceMultiExecutionServiceExecutableInfo, {
    _type: usingConstantValueSchema(
      V1_DATA_SPACE_MULTI_EXECUTION_SERVICE_EXECUTABLE_INFO_TYPE,
    ),
    keyedExecutableInfoList: list(
      usingModelSchema(
        V1_dataSpaceMultiExecutionServiceKeyedExecutableInfoModelSchema(
          plugins,
        ),
      ),
    ),
    pattern: primitive(),
  });

const V1_deserializeDataSpaceExecutableInfo = (
  plugins: PureProtocolProcessorPlugin[],
  json: PlainObject<V1_DataSpaceExecutableInfo>,
): V1_DataSpaceExecutableInfo => {
  switch (json._type) {
    case V1_DATA_SPACE_TEMPLATE_EXECUTABLE_INFO_TYPE:
      return deserialize(V1_DataSpaceTemplateExecutableInfoModelSchema(), json);
    case V1_DATA_SPACE_FUNCTION_POINTER_EXECUTABLE_INFO_TYPE:
      return deserialize(
        V1_DataSpaceFunctionPointerExecutableInfoModelSchema(),
        json,
      );
    case V1_DATA_SPACE_SERVICE_EXECUTABLE_INFO_TYPE:
      return deserialize(
        V1_dataSpaceServiceExecutableInfoModelSchema(plugins),
        json,
      );
    case V1_DATA_SPACE_MULTI_EXECUTION_SERVICE_EXECUTABLE_INFO_TYPE:
      return deserialize(
        V1_dataSpaceMultiExecutionServiceExecutableInfoModelSchema(plugins),
        json,
      );
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize data space executable info of type '${json._type}'`,
      );
  }
};

export abstract class V1_DataSpaceExecutableResult {}

const V1_DATA_SPACE_EXECUTABLE_TDS_RESULT_TYPE = 'tds';

export class V1_DataSpaceExecutableTDSResultColumn {
  name!: string;
  documentation?: string | undefined;
  type?: string | undefined;
  relationalType?: string | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataSpaceExecutableTDSResultColumn, {
      documentation: optional(primitive()),
      name: primitive(),
      relationalType: optional(primitive()),
      type: optional(primitive()),
    }),
  );
}

export class V1_DataSpaceExecutableTDSResult extends V1_DataSpaceExecutableResult {
  columns: V1_DataSpaceExecutableTDSResultColumn[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataSpaceExecutableTDSResult, {
      _type: usingConstantValueSchema(
        V1_DATA_SPACE_SERVICE_EXECUTABLE_INFO_TYPE,
      ),
      columns: list(
        object(V1_DataSpaceExecutableTDSResultColumn.serialization.schema),
      ),
    }),
  );
}

const V1_deserializeDataSpaceExecutableResult = (
  json: PlainObject<V1_DataSpaceExecutableResult>,
): V1_DataSpaceExecutableResult => {
  switch (json._type) {
    case V1_DATA_SPACE_EXECUTABLE_TDS_RESULT_TYPE:
      return deserialize(
        V1_DataSpaceExecutableTDSResult.serialization.schema,
        json,
      );
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize data space executable result of type '${json._type}'`,
      );
  }
};

export class V1_DataSpaceExecutableAnalysisResult {
  title!: string;
  description?: string | undefined;
  executable?: string;
  info?: V1_DataSpaceExecutableInfo | undefined;
  result!: V1_DataSpaceExecutableResult;
}

const V1_dataSpaceExecutableAnalysisResultModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_DataSpaceExecutableAnalysisResult> =>
  createModelSchema(V1_DataSpaceExecutableAnalysisResult, {
    executable: optional(primitive()),
    description: optional(primitive()),
    info: optionalCustom(
      () => SKIP,
      (val: PlainObject<V1_DataSpaceExecutableInfo>) =>
        V1_deserializeDataSpaceExecutableInfo(plugins, val),
    ),
    result: custom(() => SKIP, V1_deserializeDataSpaceExecutableResult),
    title: primitive(),
  });

export class V1_DataSpaceAnalysisResult {
  name!: string;
  package!: string;
  path!: string;

  taggedValues: V1_DataSpaceTaggedValueInfo[] = [];
  stereotypes: V1_DataSpaceStereotypeInfo[] = [];

  title?: string | undefined;
  description?: string | undefined;
  supportInfo?: V1_DataSpaceSupportInfo | undefined;

  model!: V1_PureModelContextData;

  executionContexts: V1_DataSpaceExecutionContextAnalysisResult[] = [];
  defaultExecutionContext!: string;

  elements: string[] = [];
  elementDocs: V1_DataSpaceModelDocumentationEntry[] = [];

  executables: V1_DataSpaceExecutableAnalysisResult[] = [];
  diagrams: V1_DataSpaceDiagramAnalysisResult[] = [];
}

const V1_dataSpaceAnalysisResultModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_DataSpaceAnalysisResult> =>
  createModelSchema(V1_DataSpaceAnalysisResult, {
    name: primitive(),
    package: primitive(),
    path: primitive(),

    taggedValues: list(object(V1_DataSpaceTaggedValueInfo)),
    stereotypes: list(object(V1_DataSpaceStereotypeInfo)),

    title: optional(primitive()),
    description: optional(primitive()),

    supportInfo: optionalCustom(
      () => SKIP,
      (val) => V1_deserializeSupportInfo(val),
    ),

    model: V1_pureModelContextDataPropSchema,

    executionContexts: customListWithSchema(
      V1_dataSpaceExecutionContextAnalysisResultModelSchema(plugins),
    ),
    mappingModelCoverageAnalysisResult: usingModelSchema(
      V1_MappingModelCoverageAnalysisResult.serialization.schema,
    ),
    defaultExecutionContext: primitive(),

    elements: list(primitive()),
    elementDocs: list(
      custom(() => SKIP, V1_deserializeModelDocumentationEntry),
    ),

    featuredDiagrams: list(primitive()),
    diagrams: customListWithSchema(
      V1_DataSpaceDiagramAnalysisResult.serialization.schema,
    ),
    executables: customListWithSchema(
      V1_dataSpaceExecutableAnalysisResultModelSchema(plugins),
    ),
  });

export const V1_deserializeDataSpaceAnalysisResult = (
  json: PlainObject<V1_DataSpaceAnalysisResult>,
  plugins: PureProtocolProcessorPlugin[],
): V1_DataSpaceAnalysisResult => {
  const result = deserialize(
    V1_dataSpaceAnalysisResultModelSchema(plugins),
    json,
  );
  /**
   * Featured diagrams will be transformed to diagrams, so here we nicely
   * auto-transform it for backward compatibility
   *
   * @backwardCompatibility
   */
  if (json.featuredDiagrams && Array.isArray(json.featuredDiagrams)) {
    const diagramResults = json.featuredDiagrams
      .map((featuredDiagram) => {
        if (isString(featuredDiagram)) {
          const diagramAnalysisResult = new V1_DataSpaceDiagramAnalysisResult();
          diagramAnalysisResult.title = '';
          diagramAnalysisResult.diagram = featuredDiagram;
          return diagramAnalysisResult;
        }
        return undefined;
      })
      .filter(isNonNullable);
    result.diagrams = result.diagrams.concat(diagramResults);
  }
  return result;
};
