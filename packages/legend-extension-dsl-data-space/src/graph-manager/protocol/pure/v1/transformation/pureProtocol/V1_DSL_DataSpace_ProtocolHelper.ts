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
import {
  V1_stereotypePtrModelSchema,
  V1_taggedValueModelSchema,
  V1_packageableElementPointerModelSchema,
  V1_PackageableElementPointer,
  V1_rawLambdaModelSchema,
  V1_dataElementReferenceModelSchema,
} from '@finos/legend-graph';
import {
  type PlainObject,
  UnsupportedOperationError,
  usingConstantValueSchema,
  usingModelSchema,
  optionalCustomListWithSchema,
  customListWithSchema,
  isString,
  isNonNullable,
} from '@finos/legend-shared';
import {
  type V1_DataSpaceSupportInfo,
  type V1_DataSpaceExecutable,
  V1_DataSpace,
  V1_DataSpaceExecutionContext,
  V1_DataSpaceSupportEmail,
  V1_DataSpaceSupportCombinedInfo,
  V1_DataSpaceDiagram,
  V1_DataSpaceElementPointer,
  V1_DataSpaceTemplateExecutable,
  V1_DataSpacePackageableElementExecutable,
} from '../../model/packageableElements/dataSpace/V1_DSL_DataSpace_DataSpace.js';
import { V1_MappingIncludeDataSpace } from '../../model/packageableElements/mapping/V1_DSL_DataSpace_MappingIncludeDataSpace.js';

export const V1_DATA_SPACE_ELEMENT_PROTOCOL_TYPE = 'dataSpace';
const V1_DATA_SPACE_SUPPORT_EMAIL_TYPE = 'email';
const V1_DATA_SPACE_SUPPORT_COMBINED_INFO_TYPE = 'combined';
const V1_DATA_SPACE_PACKAGEABLE_ELEMENT_EXECUTABLE =
  'dataSpacePackageableElementExecutable';
const V1_DATA_SPACE_TEMPLATE_EXECUTABLE = 'dataSpaceTemplateExecutable';

const V1_dataSpaceExecutionContextModelSchema = createModelSchema(
  V1_DataSpaceExecutionContext,
  {
    defaultRuntime: usingModelSchema(V1_packageableElementPointerModelSchema),
    description: optional(primitive()),
    mapping: usingModelSchema(V1_packageableElementPointerModelSchema),
    name: primitive(),
    title: optional(primitive()),
    testData: optional(usingModelSchema(V1_dataElementReferenceModelSchema)),
  },
);

const V1_dataSpaceSupportEmailModelSchema = createModelSchema(
  V1_DataSpaceSupportEmail,
  {
    _type: usingConstantValueSchema(V1_DATA_SPACE_SUPPORT_EMAIL_TYPE),
    address: primitive(),
    documentationUrl: optional(primitive()),
  },
);

const V1_dataSpaceSupportCombinedInfoModelSchema = createModelSchema(
  V1_DataSpaceSupportCombinedInfo,
  {
    _type: usingConstantValueSchema(V1_DATA_SPACE_SUPPORT_COMBINED_INFO_TYPE),
    emails: optional(list(primitive())),
    faqUrl: optional(primitive()),
    documentationUrl: optional(primitive()),
    supportUrl: optional(primitive()),
    website: optional(primitive()),
  },
);

const V1_serializeSupportInfo = (
  protocol: V1_DataSpaceSupportInfo | undefined,
): PlainObject<V1_DataSpaceSupportInfo> | typeof SKIP => {
  if (!protocol) {
    return SKIP;
  }
  if (protocol instanceof V1_DataSpaceSupportEmail) {
    return serialize(V1_dataSpaceSupportEmailModelSchema, protocol);
  } else if (protocol instanceof V1_DataSpaceSupportCombinedInfo) {
    return serialize(V1_dataSpaceSupportCombinedInfoModelSchema, protocol);
  }
  throw new UnsupportedOperationError(`Can't serialize support info`, protocol);
};

export const V1_deserializeSupportInfo = (
  json: PlainObject<V1_DataSpaceSupportInfo> | undefined,
): V1_DataSpaceSupportInfo | undefined => {
  if (!json) {
    return undefined;
  }
  switch (json._type) {
    case V1_DATA_SPACE_SUPPORT_EMAIL_TYPE:
      return deserialize(V1_dataSpaceSupportEmailModelSchema, json);
    case V1_DATA_SPACE_SUPPORT_COMBINED_INFO_TYPE:
      return deserialize(V1_dataSpaceSupportCombinedInfoModelSchema, json);
    default: {
      throw new UnsupportedOperationError(
        `Can't deserialize support info of type '${json._type}'`,
      );
    }
  }
};

const V1_dataSpaceElementPointerModelSchema = createModelSchema(
  V1_DataSpaceElementPointer,
  {
    exclude: optional(primitive()),
    path: primitive(),
  },
);

const V1_dataSpacePackageableElementExecutableModelSchema = createModelSchema(
  V1_DataSpacePackageableElementExecutable,
  {
    _type: usingConstantValueSchema(
      V1_DATA_SPACE_PACKAGEABLE_ELEMENT_EXECUTABLE,
    ),
    description: optional(primitive()),
    executionContextKey: optional(primitive()),
    id: optional(primitive()),
    title: primitive(),
    executable: usingModelSchema(V1_packageableElementPointerModelSchema),
  },
);

const V1_dataSpaceTemplateExecutableModelSchema = createModelSchema(
  V1_DataSpaceTemplateExecutable,
  {
    _type: usingConstantValueSchema(V1_DATA_SPACE_TEMPLATE_EXECUTABLE),
    description: optional(primitive()),
    title: primitive(),
    id: primitive(),
    query: usingModelSchema(V1_rawLambdaModelSchema),
    executionContextKey: optional(primitive()),
  },
);

const V1_serializeDataspaceExecutable = (
  protocol: V1_DataSpaceExecutable,
): PlainObject<V1_DataSpaceExecutable> => {
  if (protocol instanceof V1_DataSpaceTemplateExecutable) {
    return serialize(V1_dataSpaceTemplateExecutableModelSchema, protocol);
  } else if (protocol instanceof V1_DataSpacePackageableElementExecutable) {
    return serialize(
      V1_dataSpacePackageableElementExecutableModelSchema,
      protocol,
    );
  }
  throw new UnsupportedOperationError(
    `Can't serialize data product executable`,
    protocol,
  );
};

export const V1_deserializeDataspaceExecutable = (
  json: PlainObject<V1_DataSpaceExecutable>,
): V1_DataSpaceSupportInfo => {
  switch (json._type) {
    case V1_DATA_SPACE_TEMPLATE_EXECUTABLE:
      return deserialize(V1_dataSpaceTemplateExecutableModelSchema, json);
    case V1_DATA_SPACE_PACKAGEABLE_ELEMENT_EXECUTABLE:
    default:
      return deserialize(
        V1_dataSpacePackageableElementExecutableModelSchema,
        json,
      );
  }
};

const V1_dataSpaceDiagramModelSchema = createModelSchema(V1_DataSpaceDiagram, {
  description: optional(primitive()),
  diagram: usingModelSchema(V1_packageableElementPointerModelSchema),
  title: primitive(),
});

const V1_dataSpaceModelSchema = createModelSchema(V1_DataSpace, {
  _type: usingConstantValueSchema(V1_DATA_SPACE_ELEMENT_PROTOCOL_TYPE),
  defaultExecutionContext: primitive(),
  description: optional(primitive()),
  diagrams: list(object(V1_dataSpaceDiagramModelSchema)),
  elements: optionalCustomListWithSchema(V1_dataSpaceElementPointerModelSchema),
  executables: list(
    custom(
      (val) => V1_serializeDataspaceExecutable(val),
      (val) => V1_deserializeDataspaceExecutable(val),
    ),
  ),
  executionContexts: list(object(V1_dataSpaceExecutionContextModelSchema)),
  featuredDiagrams: optionalCustomListWithSchema(
    V1_packageableElementPointerModelSchema,
  ),
  name: primitive(),
  package: primitive(),
  stereotypes: customListWithSchema(V1_stereotypePtrModelSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
  supportInfo: custom(
    (val) => V1_serializeSupportInfo(val),
    (val) => V1_deserializeSupportInfo(val),
  ),
  taggedValues: customListWithSchema(V1_taggedValueModelSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
  title: optional(primitive()),
});

export const V1_serializeDataSpace = (
  protocol: V1_DataSpace,
): PlainObject<V1_DataSpace> => serialize(V1_dataSpaceModelSchema, protocol);

export const V1_deserializeDataSpace = (
  json: PlainObject<V1_DataSpace>,
): V1_DataSpace => {
  const dataSpace = deserialize(V1_dataSpaceModelSchema, json);
  /**
   * Featured diagrams will be transformed to diagrams, so here we nicely
   * auto-transform it for backward compatibility
   *
   * @backwardCompatibility
   */
  if (json.featuredDiagrams && Array.isArray(json.featuredDiagrams)) {
    const diagrams = json.featuredDiagrams
      .map((featuredDiagram) => {
        if (isString(featuredDiagram.path)) {
          const diagram = new V1_DataSpaceDiagram();
          diagram.title = '';
          diagram.diagram = new V1_PackageableElementPointer(
            undefined,
            featuredDiagram.path,
          );
          return diagram;
        }
        return undefined;
      })
      .filter(isNonNullable);
    if (diagrams.length) {
      dataSpace.diagrams =
        dataSpace.diagrams !== undefined
          ? dataSpace.diagrams.concat(diagrams)
          : diagrams;
    }
  }
  return dataSpace;
};

// Mapping Include
export const V1_MAPPING_INCLUDE_DATASPACE_TYPE = 'mappingIncludeDataSpace';

const V1_mappingIncludeDataSpaceModelSchema = createModelSchema(
  V1_MappingIncludeDataSpace,
  {
    _type: usingConstantValueSchema(V1_MAPPING_INCLUDE_DATASPACE_TYPE),
    includedDataSpace: primitive(),
  },
);

export const V1_serializeMappingInclude = (
  protocol: V1_MappingIncludeDataSpace,
): PlainObject<V1_MappingIncludeDataSpace> =>
  serialize(V1_mappingIncludeDataSpaceModelSchema, protocol);

export const V1_deserializeMappingInclude = (
  json: PlainObject<V1_MappingIncludeDataSpace>,
): V1_MappingIncludeDataSpace =>
  deserialize(V1_mappingIncludeDataSpaceModelSchema, json);
