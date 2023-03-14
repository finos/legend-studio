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

import { V1_PureModelContextData } from '@finos/legend-graph';
import {
  SerializationFactory,
  optionalCustom,
  type PlainObject,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import {
  createModelSchema,
  custom,
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
  description?: string | undefined;
  mapping!: string;
  defaultRuntime!: string;
  compatibleRuntimes!: string[];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataSpaceExecutionContextAnalysisResult, {
      name: primitive(),
      description: optional(primitive()),
      mapping: primitive(),
      defaultRuntime: primitive(),
      compatibleRuntimes: list(primitive()),
    }),
  );
}

export class V1_DataSpaceBasicDocumentationEntry {
  name!: string;
  docs: string[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataSpaceBasicDocumentationEntry, {
      name: primitive(),
      docs: list(primitive()),
    }),
  );
}

export class V1_DataSpaceModelDocumentationEntry extends V1_DataSpaceBasicDocumentationEntry {
  path!: string;

  static override readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataSpaceModelDocumentationEntry, {
      name: primitive(),
      docs: list(primitive()),
      path: primitive(),
    }),
  );
}

export class V1_DataSpaceClassDocumentationEntry extends V1_DataSpaceModelDocumentationEntry {
  inheritedProperties: V1_DataSpaceBasicDocumentationEntry[] = [];
  properties: V1_DataSpaceBasicDocumentationEntry[] = [];

  static override readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataSpaceClassDocumentationEntry, {
      name: primitive(),
      docs: list(primitive()),
      path: primitive(),
      inheritedProperties: list(object(V1_DataSpaceBasicDocumentationEntry)),
      properties: list(object(V1_DataSpaceBasicDocumentationEntry)),
    }),
  );
}

export class V1_DataSpaceEnumerationDocumentationEntry extends V1_DataSpaceModelDocumentationEntry {
  enumValues: V1_DataSpaceBasicDocumentationEntry[] = [];

  static override readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataSpaceEnumerationDocumentationEntry, {
      name: primitive(),
      docs: list(primitive()),
      enumValues: list(object(V1_DataSpaceBasicDocumentationEntry)),
      path: primitive(),
    }),
  );
}

export class V1_DataSpaceAssociationDocumentationEntry extends V1_DataSpaceModelDocumentationEntry {
  properties: V1_DataSpaceBasicDocumentationEntry[] = [];

  static override readonly serialization = new SerializationFactory(
    createModelSchema(V1_DataSpaceAssociationDocumentationEntry, {
      name: primitive(),
      docs: list(primitive()),
      path: primitive(),
      properties: list(object(V1_DataSpaceBasicDocumentationEntry)),
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

  featuredDiagrams: string[] = [];

  elements: string[] = [];
  elementDocs: V1_DataSpaceModelDocumentationEntry[] = [];

  static readonly serialization = new SerializationFactory(
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

      model: object(V1_PureModelContextData),

      executionContexts: list(
        object(V1_DataSpaceExecutionContextAnalysisResult),
      ),
      defaultExecutionContext: primitive(),

      featuredDiagrams: list(primitive()),

      elements: list(primitive()),
      elementDocs: list(
        custom(() => SKIP, V1_deserializeModelDocumentationEntry),
      ),
    }),
  );
}
