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
  deserializeMap,
  optionalCustomList,
  optionalCustomUsingModelSchema,
  SerializationFactory,
  UnsupportedOperationError,
  usingConstantValueSchema,
  usingModelSchema,
  type PlainObject,
} from '@finos/legend-shared';
import {
  createModelSchema,
  custom,
  deserialize,
  list,
  object,
  optional,
  primitive,
  serialize,
  SKIP,
} from 'serializr';
import type { V1_GenericType } from '../../model/packageableElements/type/V1_GenericType.js';
import {
  V1_deserializeGenericType,
  V1_genericTypeModelSchema,
} from '../../transformation/pureProtocol/serializationHelpers/V1_TypeSerializationHelper.js';
import type { V1_RelationElement } from '../../model/data/V1_EmbeddedData.js';
import { V1_relationElementModelSchema } from '../../transformation/pureProtocol/serializationHelpers/V1_DataElementSerializationHelper.js';
import { V1_pureModelContextDataPropSchema } from '../../transformation/pureProtocol/V1_PureProtocolSerialization.js';
import type { V1_PureModelContextData } from '../../model/context/V1_PureModelContextData.js';
import type { V1_Multiplicity } from '../../model/packageableElements/domain/V1_Multiplicity.js';
import { V1_multiplicityModelSchema } from '../../transformation/pureProtocol/serializationHelpers/V1_CoreSerializationHelper.js';

export enum V1_DataProductTypeEnum {
  INTERNAL = 'internalDataProductType',
  EXTERNAL = 'externalDataProductType',
}

export enum V1_ResourceBuilderType {
  DATABASE_DDL = 'databaseDDL',
  FUNCTION_ACCESS_POINT = 'functionAccessPoint',
}

export enum V1_SampleQueryType {
  IN_LINE_SAMPLE_QUERY = 'inLineSampleQuery',
  PACKAGEABLE_ELEMENT_SAMPLE_QUERY = 'packageableElementSampleQuery',
}

export enum V1_DatabaseDDLImplementationType {
  VIEW = 'VIEW',
  TABLE = 'TABLE',
  PROCEDURE = 'PROCEDURE',
}

export abstract class V1_Artifact_DataProductType {}

export class V1_Artifact_ExternalDataProductType extends V1_Artifact_DataProductType {
  link: string | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_Artifact_ExternalDataProductType, {
      _type: usingConstantValueSchema(V1_DataProductTypeEnum.EXTERNAL),
      link: optional(primitive()),
    }),
  );
}

export class V1_Artifact_InternalDataProductType extends V1_Artifact_DataProductType {
  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_Artifact_InternalDataProductType, {
      _type: usingConstantValueSchema(V1_DataProductTypeEnum.INTERNAL),
    }),
  );
}

export const V1_serializeDataProductType = (
  DataProductType: V1_Artifact_DataProductType,
): PlainObject<V1_Artifact_DataProductType> => {
  if (DataProductType instanceof V1_Artifact_ExternalDataProductType) {
    return V1_Artifact_ExternalDataProductType.serialization.toJson(
      DataProductType,
    );
  } else if (DataProductType instanceof V1_Artifact_InternalDataProductType) {
    return V1_Artifact_InternalDataProductType.serialization.toJson(
      DataProductType,
    );
  }
  throw new UnsupportedOperationError();
};

export const V1_deserializeDataProductType = (
  json: PlainObject<V1_Artifact_DataProductType>,
): V1_Artifact_DataProductType => {
  switch (json._type) {
    case V1_DataProductTypeEnum.EXTERNAL:
      return V1_Artifact_ExternalDataProductType.serialization.fromJson(json);
    case V1_DataProductTypeEnum.INTERNAL:
      return V1_Artifact_InternalDataProductType.serialization.fromJson(json);
    default:
      throw new Error(`Unknown V1_DataProductType type: ${json._type}`);
  }
};

export class V1_DataProductInfo {
  path!: string;
  deploymentId: string | undefined;
  description: string | undefined;
  title: string | undefined;
  dataProductType: V1_Artifact_DataProductType | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataProductInfo, {
      path: primitive(),
      deploymentId: primitive(),
      description: optional(primitive()),
      title: optional(primitive()),
      dataProductType: custom(
        (val) => (val ? V1_serializeDataProductType(val) : undefined),
        (val) => (val ? V1_deserializeDataProductType(val) : undefined),
      ),
    }),
  );
}

export abstract class V1_ResourceBuilder {}

export class V1_DatabaseDDL extends V1_ResourceBuilder {
  reproducible!: boolean;
  targetEnvironment!: string;
  script!: string;
  classification: string | undefined;
  resourceType!: V1_DatabaseDDLImplementationType;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DatabaseDDL, {
      _type: usingConstantValueSchema(V1_ResourceBuilderType.DATABASE_DDL),
      reproducible: primitive(),
      targetEnvironment: primitive(),
      script: primitive(),
      classification: optional(primitive()),
      resourceType: primitive(),
    }),
  );
}

export class V1_FunctionAccessPoint extends V1_ResourceBuilder {
  functionGrammar!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_FunctionAccessPoint, {
      _type: usingConstantValueSchema(
        V1_ResourceBuilderType.FUNCTION_ACCESS_POINT,
      ),
      functionGrammar: primitive(),
    }),
  );
}

export const V1_serializeResourceBuilder = (
  resourceBuilder: V1_ResourceBuilder,
): PlainObject<V1_ResourceBuilder> => {
  if (resourceBuilder instanceof V1_DatabaseDDL) {
    return V1_DatabaseDDL.serialization.toJson(resourceBuilder);
  } else if (resourceBuilder instanceof V1_FunctionAccessPoint) {
    return V1_FunctionAccessPoint.serialization.toJson(resourceBuilder);
  }
  throw new UnsupportedOperationError();
};

export const V1_deserializeResourceBuilder = (
  json: PlainObject<V1_ResourceBuilder>,
): V1_ResourceBuilder => {
  switch (json._type) {
    case V1_ResourceBuilderType.DATABASE_DDL:
      return V1_DatabaseDDL.serialization.fromJson(json);
    case V1_ResourceBuilderType.FUNCTION_ACCESS_POINT:
      return V1_FunctionAccessPoint.serialization.fromJson(json);
    default:
      throw new Error(`Unknown V1_ResourceBuilder type: ${json._type}`);
  }
};

export class V1_AccessPointImplementation {
  id!: string;
  description: string | undefined;
  resourceBuilder!: V1_ResourceBuilder;
  relationElement: V1_RelationElement | undefined;
  lambdaGenericType: V1_GenericType | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_AccessPointImplementation, {
      id: primitive(),
      description: optional(primitive()),
      resourceBuilder: custom(
        V1_serializeResourceBuilder,
        V1_deserializeResourceBuilder,
      ),
      relationElement: optional(
        custom(
          (val) => serialize(V1_relationElementModelSchema, val),
          (val) => deserialize(V1_relationElementModelSchema, val),
        ),
      ),
      lambdaGenericType: custom(
        (val) => serialize(V1_genericTypeModelSchema, val),
        (val) => V1_deserializeGenericType(val),
      ),
    }),
  );
}

export class V1_DatasetSpecification {
  name!: string;
  type!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DatasetSpecification, {
      name: primitive(),
      type: primitive(),
    }),
  );
}

export class V1_RuntimeGenerationInfo {
  path!: string;
  storePath?: string;
  connectionType?: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_RuntimeGenerationInfo, {
      path: primitive(),
      storePath: optional(primitive()),
      connectionType: optional(primitive()),
    }),
  );
}

export class V1_DiagramInfo {
  title!: string;
  description?: string;
  diagram!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DiagramInfo, {
      title: primitive(),
      description: optional(primitive()),
      diagram: primitive(),
    }),
  );
}

export class V1_MappingGenerationInfo {
  path!: string;
  model!: V1_PureModelContextData;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_MappingGenerationInfo, {
      path: primitive(),
      model: V1_pureModelContextDataPropSchema,
    }),
  );
}

export class V1_NativeModelExecutionContextInfo {
  key!: string;
  mapping!: string;
  runtime?: V1_RuntimeGenerationInfo | undefined;
  datasets: V1_DatasetSpecification[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_NativeModelExecutionContextInfo, {
      key: primitive(),
      mapping: primitive(),
      runtime: optionalCustomUsingModelSchema(
        V1_RuntimeGenerationInfo.serialization.schema,
      ),
      datasets: list(
        usingModelSchema(V1_DatasetSpecification.serialization.schema),
      ),
    }),
  );
}

export abstract class V1_SampleQueryInfo {
  id!: string;
  title!: string;
  description?: string;
  executionContextKey!: string;
}

export class V1_InLineSampleQueryInfo extends V1_SampleQueryInfo {
  queryGrammar!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_InLineSampleQueryInfo, {
      _type: usingConstantValueSchema(V1_SampleQueryType.IN_LINE_SAMPLE_QUERY),
      id: primitive(),
      title: primitive(),
      description: optional(primitive()),
      queryGrammar: primitive(),
      executionContextKey: primitive(),
    }),
  );
}

export class V1_PackageableElementSampleQueryInfo extends V1_SampleQueryInfo {
  queryPath!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_PackageableElementSampleQueryInfo, {
      _type: usingConstantValueSchema(
        V1_SampleQueryType.PACKAGEABLE_ELEMENT_SAMPLE_QUERY,
      ),
      id: primitive(),
      title: primitive(),
      description: optional(primitive()),
      queryPath: primitive(),
      executionContextKey: primitive(),
    }),
  );
}

const V1_deserializeSampleQuery = (
  json: PlainObject<V1_SampleQueryInfo>,
): V1_SampleQueryInfo => {
  switch (json._type) {
    case V1_SampleQueryType.IN_LINE_SAMPLE_QUERY:
      return deserialize(V1_InLineSampleQueryInfo.serialization.schema, json);
    case V1_SampleQueryType.PACKAGEABLE_ELEMENT_SAMPLE_QUERY:
      return deserialize(
        V1_PackageableElementSampleQueryInfo.serialization.schema,
        json,
      );
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize data product sample query of type '${json._type}'`,
      );
  }
};

export class V1_NativeModelAccessInfo {
  diagrams: V1_DiagramInfo[] = [];
  model!: V1_PureModelContextData;
  elements: string[] = [];
  defaultExecutionContext!: string;
  elementDocs: V1_ModelDocumentationEntry[] = [];
  mappingGenerations!: Map<string, V1_MappingGenerationInfo>;
  nativeModelExecutionContexts!: V1_NativeModelExecutionContextInfo[];
  sampleQueries?: V1_SampleQueryInfo[] | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_NativeModelAccessInfo, {
      diagrams: list(usingModelSchema(V1_DiagramInfo.serialization.schema)),
      model: V1_pureModelContextDataPropSchema,
      elements: list(primitive()),
      elementDocs: list(
        custom(() => SKIP, V1_deserializeModelDocumentationEntry),
      ),
      defaultExecutionContext: primitive(),
      nativeModelExecutionContexts: list(
        usingModelSchema(
          V1_NativeModelExecutionContextInfo.serialization.schema,
        ),
      ),
      sampleQueries: optionalCustomList(
        () => SKIP as never,
        (val: PlainObject<V1_SampleQueryInfo>) =>
          V1_deserializeSampleQuery(val),
      ),
      mappingGenerations: custom(
        () => SKIP,
        (val) =>
          deserializeMap(val, (_val) =>
            deserialize(V1_MappingGenerationInfo.serialization.schema, _val),
          ),
      ),
    }),
  );
}

export class V1_BasicDocumentationEntry {
  name!: string;
  docs: string[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_BasicDocumentationEntry, {
      docs: list(primitive()),
      name: primitive(),
    }),
  );
}

export class V1_PropertyDocumentationEntry extends V1_BasicDocumentationEntry {
  milestoning?: string | undefined;
  type?: string | undefined;
  multiplicity!: V1_Multiplicity;

  static override readonly serialization = new SerializationFactory(
    createModelSchema(V1_PropertyDocumentationEntry, {
      docs: list(primitive()),
      milestoning: optional(primitive()),
      multiplicity: usingModelSchema(V1_multiplicityModelSchema),
      name: primitive(),
      type: optional(primitive()),
    }),
  );
}

export class V1_ModelDocumentationEntry extends V1_BasicDocumentationEntry {
  path!: string;

  static override readonly serialization = new SerializationFactory(
    createModelSchema(V1_ModelDocumentationEntry, {
      docs: list(primitive()),
      name: primitive(),
      path: primitive(),
    }),
  );
}

export class V1_ClassDocumentationEntry extends V1_ModelDocumentationEntry {
  properties: V1_PropertyDocumentationEntry[] = [];
  milestoning?: string | undefined;

  static override readonly serialization = new SerializationFactory(
    createModelSchema(V1_ClassDocumentationEntry, {
      docs: list(primitive()),
      milestoning: optional(primitive()),
      name: primitive(),
      path: primitive(),
      properties: list(object(V1_PropertyDocumentationEntry)),
    }),
  );
}

export class V1_EnumerationDocumentationEntry extends V1_ModelDocumentationEntry {
  enumValues: V1_BasicDocumentationEntry[] = [];

  static override readonly serialization = new SerializationFactory(
    createModelSchema(V1_EnumerationDocumentationEntry, {
      enumValues: list(object(V1_BasicDocumentationEntry)),
      docs: list(primitive()),
      name: primitive(),
      path: primitive(),
    }),
  );
}

export class V1_AssociationDocumentationEntry extends V1_ModelDocumentationEntry {
  properties: V1_PropertyDocumentationEntry[] = [];

  static override readonly serialization = new SerializationFactory(
    createModelSchema(V1_AssociationDocumentationEntry, {
      docs: list(primitive()),
      name: primitive(),
      path: primitive(),
      properties: list(object(V1_PropertyDocumentationEntry)),
    }),
  );
}

enum V1_ModelDocumentationEntryType {
  MODEL = 'model',
  CLASS = 'class',
  ENUMERATION = 'enumeration',
  ASSOCIATION = 'association',
}

function V1_deserializeModelDocumentationEntry(
  json: PlainObject<V1_ModelDocumentationEntry>,
): V1_ModelDocumentationEntry {
  switch (json._type) {
    case V1_ModelDocumentationEntryType.MODEL:
      return V1_ModelDocumentationEntry.serialization.fromJson(json);
    case V1_ModelDocumentationEntryType.CLASS:
      return V1_ClassDocumentationEntry.serialization.fromJson(json);
    case V1_ModelDocumentationEntryType.ENUMERATION:
      return V1_EnumerationDocumentationEntry.serialization.fromJson(json);
    case V1_ModelDocumentationEntryType.ASSOCIATION:
      return V1_AssociationDocumentationEntry.serialization.fromJson(json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize model documentation entry of type '${json._type}'`,
      );
  }
}

export class V1_AccessPointGroupInfo {
  id!: string;
  description: string | undefined;
  accessPointImplementations: V1_AccessPointImplementation[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_AccessPointGroupInfo, {
      id: primitive(),
      description: optional(primitive()),
      accessPointImplementations: list(
        usingModelSchema(V1_AccessPointImplementation.serialization.schema),
      ),
    }),
  );
}

export class V1_DataProductArtifact {
  dataProduct!: V1_DataProductInfo;
  accessPointGroups: V1_AccessPointGroupInfo[] = [];
  nativeModelAccess?: V1_NativeModelAccessInfo | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataProductArtifact, {
      dataProduct: usingModelSchema(V1_DataProductInfo.serialization.schema),
      accessPointGroups: list(
        usingModelSchema(V1_AccessPointGroupInfo.serialization.schema),
      ),
      nativeModelAccess: optionalCustomUsingModelSchema(
        V1_NativeModelAccessInfo.serialization.schema,
      ),
    }),
  );
}
