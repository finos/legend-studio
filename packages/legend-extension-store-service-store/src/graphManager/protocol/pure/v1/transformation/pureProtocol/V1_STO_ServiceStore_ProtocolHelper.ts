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
  type PlainObject,
  optionalCustom,
  UnsupportedOperationError,
  usingConstantValueSchema,
  usingModelSchema,
  serializeMap,
  deserializeMap,
  customList,
} from '@finos/legend-shared';
import {
  type ModelSchema,
  alias,
  createModelSchema,
  primitive,
  list,
  optional,
  custom,
  serialize,
  deserialize,
  object,
  raw,
} from 'serializr';
import { V1_ServiceStore } from '../../model/packageableElements/store/serviceStore/model/V1_STO_ServiceStore_ServiceStore.js';
import { V1_ServiceStoreService } from '../../model/packageableElements/store/serviceStore/model/V1_STO_ServiceStore_ServiceStoreService.js';
import { V1_ServiceGroup } from '../../model/packageableElements/store/serviceStore/model/V1_STO_ServiceStore_ServiceGroup.js';
import type { V1_ServiceStoreElement } from '../../model/packageableElements/store/serviceStore/model/V1_STO_ServiceStore_ServiceStoreElement.js';
import { V1_ServiceParameter } from '../../model/packageableElements/store/serviceStore/model/V1_STO_ServiceStore_ServiceParameter.js';
import {
  type V1_TypeReference,
  V1_BooleanTypeReference,
  V1_ComplexTypeReference,
  V1_FloatTypeReference,
  V1_IntegerTypeReference,
  V1_StringTypeReference,
} from '../../model/packageableElements/store/serviceStore/model/V1_STO_ServiceStore_TypeReference.js';
import { V1_SerializationFormat } from '../../model/packageableElements/store/serviceStore/model/V1_STO_ServiceStore_SerializationFormat.js';
import { V1_ServiceStoreConnection } from '../../model/packageableElements/store/serviceStore/connection/V1_STO_ServiceStore_ServicestoreConnection.js';
import { V1_RootServiceStoreClassMapping } from '../../model/packageableElements/store/serviceStore/mapping/V1_STO_ServiceStore_RootServiceStoreClassMapping.js';
import { V1_LocalMappingProperty } from '../../model/packageableElements/store/serviceStore/mapping/V1_STO_ServiceStore_LocalMappingProperty.js';
import { V1_ServiceMapping } from '../../model/packageableElements/store/serviceStore/mapping/V1_STO_ServiceStore_ServiceMapping.js';
import { V1_ServiceStoreServicePtr } from '../../model/packageableElements/store/serviceStore/model/V1_STO_ServiceStore_ServiceStoreServicePtr.js';
import { V1_ServiceGroupPtr } from '../../model/packageableElements/store/serviceStore/model/V1_STO_ServiceStore_ServiceGroupPtr.js';
import {
  type PureProtocolProcessorPlugin,
  V1_Multiplicity,
  V1_externalFormatDataModelSchema,
  V1_rawLambdaModelSchema,
} from '@finos/legend-graph';
import type { V1_SecurityScheme } from '../../model/packageableElements/store/serviceStore/model/V1_STO_ServiceStore_SecurityScheme.js';
import type { STO_ServiceStore_PureProtocolPlugin_Extension } from '../../../STO_ServiceStore_PureProtocolPlugin_Extension.js';
import { V1_ServiceRequestBuildInfo } from '../../model/packageableElements/store/serviceStore/mapping/V1_STO_ServiceStore_ServiceRequestBuildInfo.js';
import { V1_ServiceRequestParametersBuildInfo } from '../../model/packageableElements/store/serviceStore/mapping/V1_STO_ServiceStore_ServiceRequestParametersBuildInfo.js';
import { V1_ServiceRequestParameterBuildInfo } from '../../model/packageableElements/store/serviceStore/mapping/V1_STO_ServiceStore_ServiceRequestParameterBuildInfo.js';
import { V1_ServiceRequestBodyBuildInfo } from '../../model/packageableElements/store/serviceStore/mapping/V1_STO_ServiceStore_ServiceRequestBodyBuildInfo.js';
import { V1_EqualToJsonPattern } from '../../model/data/contentPattern/V1_STO_ServiceStore_EqualToJsonPattern.js';
import { V1_EqualToPattern } from '../../model/data/contentPattern/V1_STO_ServiceStore_EqualToPattern.js';
import type { V1_StringValuePattern } from '../../model/data/contentPattern/V1_STO_ServiceStore_StringValuePattern.js';
import { V1_ServiceRequestPattern } from '../../model/data/V1_STO_ServiceStore_ServiceRequestPattern.js';
import { V1_ServiceResponseDefinition } from '../../model/data/V1_STO_ServiceStore_ServiceResponseDefinition.js';
import { V1_ServiceStubMapping } from '../../model/data/V1_STO_ServiceStore_ServiceStubMapping.js';
import { V1_ServiceStoreEmbeddedData } from '../../model/data/V1_STO_ServiceStore_ServiceStoreEmbeddedData.js';

export const V1_SERVICE_STORE_ELEMENT_PROTOCOL_TYPE = 'serviceStore';
export const V1_SERVICE_STORE_MAPPING_PROTOCOL_TYPE = 'serviceStore';
export const V1_SERVICE_STORE_CONNECTION_PROTOCOL_TYPE = 'serviceStore';
export const V1_SERVICE_STORE_EMBEDDED_DATA_PROTOCOL_TYPE = 'serviceStore';

enum V1_ServiceStoreElementType {
  SERVICE = 'service',
  SERVICE_GROUP = 'serviceGroup',
}

export enum V1_StringValuePatternType {
  EQUAL_TO_PATTERN = 'equalTo',
  EQUAL_TO_JSON_PATTERN = 'equalToJson',
}

enum V1_ReferenceType {
  BOOLEAN_TYPE_REFERENCE = 'boolean',
  COMPLEX_TYPE_REFERENCE = 'complex',
  FLOAT_TYPE_REFERENCE = 'float',
  INTEGER_TYPE_REFERENCE = 'integer',
  STRING_TYPE_REFERENCE = 'string',
}

const V1_booleanTypeReferenceModelSchema = createModelSchema(
  V1_BooleanTypeReference,
  {
    _type: usingConstantValueSchema(V1_ReferenceType.BOOLEAN_TYPE_REFERENCE),
    list: primitive(),
  },
);

const V1_floatTypeReferenceModelSchema = createModelSchema(
  V1_FloatTypeReference,
  {
    _type: usingConstantValueSchema(V1_ReferenceType.FLOAT_TYPE_REFERENCE),
    list: primitive(),
  },
);

const V1_integerTypeReferenceModelSchema = createModelSchema(
  V1_IntegerTypeReference,
  {
    _type: usingConstantValueSchema(V1_ReferenceType.INTEGER_TYPE_REFERENCE),
    list: primitive(),
  },
);

const V1_stringTypeReferenceModelSchema = createModelSchema(
  V1_StringTypeReference,
  {
    _type: usingConstantValueSchema(V1_ReferenceType.STRING_TYPE_REFERENCE),
    list: primitive(),
  },
);

const V1_complexTypeReferenceModelSchema = createModelSchema(
  V1_ComplexTypeReference,
  {
    _type: usingConstantValueSchema(V1_ReferenceType.COMPLEX_TYPE_REFERENCE),
    binding: primitive(),
    list: primitive(),
    type: primitive(),
  },
);

const V1_serializeTypeReference = (
  protocol: V1_TypeReference,
): PlainObject<V1_TypeReference> => {
  if (protocol instanceof V1_BooleanTypeReference) {
    return serialize(V1_booleanTypeReferenceModelSchema, protocol);
  } else if (protocol instanceof V1_ComplexTypeReference) {
    return serialize(V1_complexTypeReferenceModelSchema, protocol);
  } else if (protocol instanceof V1_FloatTypeReference) {
    return serialize(V1_floatTypeReferenceModelSchema, protocol);
  } else if (protocol instanceof V1_IntegerTypeReference) {
    return serialize(V1_integerTypeReferenceModelSchema, protocol);
  } else if (protocol instanceof V1_StringTypeReference) {
    return serialize(V1_stringTypeReferenceModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize type reference`,
    protocol,
  );
};

const V1_deserializeTypeReference = (
  json: PlainObject<V1_TypeReference>,
): V1_TypeReference => {
  switch (json._type) {
    case V1_ReferenceType.STRING_TYPE_REFERENCE:
      return deserialize(V1_stringTypeReferenceModelSchema, json);
    case V1_ReferenceType.BOOLEAN_TYPE_REFERENCE:
      return deserialize(V1_booleanTypeReferenceModelSchema, json);
    case V1_ReferenceType.FLOAT_TYPE_REFERENCE:
      return deserialize(V1_floatTypeReferenceModelSchema, json);
    case V1_ReferenceType.COMPLEX_TYPE_REFERENCE:
      return deserialize(V1_complexTypeReferenceModelSchema, json);
    case V1_ReferenceType.INTEGER_TYPE_REFERENCE:
      return deserialize(V1_integerTypeReferenceModelSchema, json);
    default: {
      throw new UnsupportedOperationError(
        `Can't deserialize type reference of type '${json._type}'`,
      );
    }
  }
};

const V1_serializationFormatModelSchema = createModelSchema(
  V1_SerializationFormat,
  {
    explode: optional(primitive()),
    style: optional(primitive()),
  },
);

const V1_serviceParameterModelSchema = createModelSchema(V1_ServiceParameter, {
  allowReserved: optional(primitive()),
  enumeration: optional(primitive()),
  location: primitive(),
  name: primitive(),
  required: optional(primitive()),
  serializationFormat: optional(
    usingModelSchema(V1_serializationFormatModelSchema),
  ),
  type: custom(
    (val) => V1_serializeTypeReference(val),
    (val) => V1_deserializeTypeReference(val),
  ),
});

const V1_serializeSecurityScheme = (
  protocol: V1_SecurityScheme,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_SecurityScheme> => {
  const extraSecuritySchemeProtocolSerializers = plugins.flatMap(
    (plugin) =>
      (
        plugin as STO_ServiceStore_PureProtocolPlugin_Extension
      ).V1_getExtraSecuritySchemeProtocolSerializers?.() ?? [],
  );
  for (const serializer of extraSecuritySchemeProtocolSerializers) {
    const json = serializer(protocol);
    if (json) {
      return json;
    }
  }
  throw new UnsupportedOperationError(
    `Can't serialize security scheme: no compatible serializer available from plugins`,
    protocol,
  );
};

const V1_deserializeSecurityScheme = (
  json: PlainObject<V1_SecurityScheme>,
  plugins: PureProtocolProcessorPlugin[],
): V1_SecurityScheme => {
  const extraSecuritySchemeProtocolDeserializers = plugins.flatMap(
    (plugin) =>
      (
        plugin as STO_ServiceStore_PureProtocolPlugin_Extension
      ).V1_getExtraSecuritySchemeProtocolDeserializers?.() ?? [],
  );
  for (const deserializer of extraSecuritySchemeProtocolDeserializers) {
    const protocol = deserializer(json);
    if (protocol) {
      return protocol;
    }
  }
  throw new UnsupportedOperationError(
    `Can't deserialize security scheme of type '${json._type}': no compatible deserializer available from plugins`,
  );
};

const V1_serviceModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_ServiceStoreService> =>
  createModelSchema(V1_ServiceStoreService, {
    _type: usingConstantValueSchema(V1_ServiceStoreElementType.SERVICE),
    id: primitive(),
    method: primitive(),
    parameters: list(usingModelSchema(V1_serviceParameterModelSchema)),
    path: primitive(),
    requestBody: optionalCustom(
      V1_serializeTypeReference,
      V1_deserializeTypeReference,
    ),
    response: usingModelSchema(V1_complexTypeReferenceModelSchema),
    security: list(
      custom(
        (val) => V1_serializeSecurityScheme(val, plugins),
        (val) => V1_deserializeSecurityScheme(val, plugins),
      ),
    ),
  });

const V1_serviceGroupModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_ServiceGroup> =>
  createModelSchema(V1_ServiceGroup, {
    _type: usingConstantValueSchema(V1_ServiceStoreElementType.SERVICE_GROUP),
    elements: list(
      custom(
        (val) => {
          if (val instanceof V1_ServiceStoreService) {
            return serialize(V1_serviceModelSchema(plugins), val);
          } else if (val instanceof V1_ServiceGroup) {
            return serialize(V1_serviceGroupModelSchema(plugins), val);
          }
          throw new UnsupportedOperationError(
            `Can't serialize service store element`,
            val,
          );
        },
        (val) => {
          switch (val._type) {
            case V1_ServiceStoreElementType.SERVICE:
              return deserialize(V1_serviceModelSchema(plugins), val);
            case V1_ServiceStoreElementType.SERVICE_GROUP:
              return deserialize(V1_serviceGroupModelSchema(plugins), val);
            default: {
              throw new UnsupportedOperationError(
                `Can't deserialize service store element of type '${val._type}'`,
              );
            }
          }
        },
      ),
    ),
    id: primitive(),
    path: primitive(),
  });

const V1_serializeServiceStoreElement = (
  protocol: V1_ServiceStoreElement,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_ServiceStoreElement> => {
  if (protocol instanceof V1_ServiceStoreService) {
    return serialize(V1_serviceModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_ServiceGroup) {
    return serialize(V1_serviceGroupModelSchema(plugins), protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize service store element`,
    protocol,
  );
};

const V1_deserializeServiceStoreElement = (
  json: PlainObject<V1_ServiceStoreElement>,
  plugins: PureProtocolProcessorPlugin[],
): V1_ServiceStoreElement => {
  switch (json._type) {
    case V1_ServiceStoreElementType.SERVICE:
      return deserialize(V1_serviceModelSchema(plugins), json);
    case V1_ServiceStoreElementType.SERVICE_GROUP:
      return deserialize(V1_serviceGroupModelSchema(plugins), json);
    default: {
      throw new UnsupportedOperationError(
        `Can't deserialize service store element of type '${json._type}'`,
      );
    }
  }
};

const V1_serviceGroupPtrModelSchema = createModelSchema(V1_ServiceGroupPtr, {
  parent: optional(object(V1_ServiceGroupPtr)),
  serviceStore: primitive(),
  serviceGroup: primitive(),
});

const V1_servicePtrModelSchema = createModelSchema(V1_ServiceStoreServicePtr, {
  parent: optional(usingModelSchema(V1_serviceGroupPtrModelSchema)),
  service: primitive(),
  serviceStore: primitive(),
});

const V1_serializeServiceRequestBodyBuildInfo = createModelSchema(
  V1_ServiceRequestBodyBuildInfo,
  {
    transform: usingModelSchema(V1_rawLambdaModelSchema),
  },
);

const V1_serializeServiceRequestParameterBuildInfo = createModelSchema(
  V1_ServiceRequestParameterBuildInfo,
  {
    serviceParameter: primitive(),
    transform: usingModelSchema(V1_rawLambdaModelSchema),
  },
);

const V1_serializeServiceRequestParametersBuildInfo = createModelSchema(
  V1_ServiceRequestParametersBuildInfo,
  {
    parameterBuildInfoList: list(
      usingModelSchema(V1_serializeServiceRequestParameterBuildInfo),
    ),
  },
);

const V1_serializeServiceRequestBuildInfo = createModelSchema(
  V1_ServiceRequestBuildInfo,
  {
    requestBodyBuildInfo: optional(
      usingModelSchema(V1_serializeServiceRequestBodyBuildInfo),
    ),
    requestParametersBuildInfo: optional(
      usingModelSchema(V1_serializeServiceRequestParametersBuildInfo),
    ),
  },
);

const V1_serviceMappingModelSchema = createModelSchema(V1_ServiceMapping, {
  pathOffset: raw(),
  requestBuildInfo: usingModelSchema(V1_serializeServiceRequestBuildInfo),
  service: usingModelSchema(V1_servicePtrModelSchema),
});

const V1_localMappingPropertyModelSchema = createModelSchema(
  V1_LocalMappingProperty,
  {
    multiplicity: object(V1_Multiplicity),
    name: primitive(),
    type: primitive(),
  },
);

export const V1_serviceStoreModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_ServiceStore> =>
  createModelSchema(V1_ServiceStore, {
    _type: usingConstantValueSchema(V1_SERVICE_STORE_ELEMENT_PROTOCOL_TYPE),
    description: optional(primitive()),
    elements: list(
      custom(
        (val) => V1_serializeServiceStoreElement(val, plugins),
        (val) => V1_deserializeServiceStoreElement(val, plugins),
      ),
    ),
    includedStores: list(primitive()),
    name: primitive(),
    package: primitive(),
  });

export const V1_rootServiceStoreClassMappingModelSchema = createModelSchema(
  V1_RootServiceStoreClassMapping,
  {
    _type: usingConstantValueSchema(V1_SERVICE_STORE_MAPPING_PROTOCOL_TYPE),
    class: primitive(),
    id: optional(primitive()),
    localMappingProperties: list(
      usingModelSchema(V1_localMappingPropertyModelSchema),
    ),
    root: primitive(),
    servicesMapping: list(usingModelSchema(V1_serviceMappingModelSchema)),
  },
);

export const V1_serviceStoreConnectionModelSchema = createModelSchema(
  V1_ServiceStoreConnection,
  {
    _type: usingConstantValueSchema(V1_SERVICE_STORE_CONNECTION_PROTOCOL_TYPE),
    baseUrl: primitive(),
    store: alias('element', optional(primitive())),
    name: primitive(),
    package: primitive(),
  },
);

export const V1_equalToJsonPatternModelSchema = createModelSchema(
  V1_EqualToJsonPattern,
  {
    _type: usingConstantValueSchema(
      V1_StringValuePatternType.EQUAL_TO_JSON_PATTERN,
    ),
    expectedValue: primitive(),
  },
);

export const V1_equalToPatternModelSchema = createModelSchema(
  V1_EqualToPattern,
  {
    _type: usingConstantValueSchema(V1_StringValuePatternType.EQUAL_TO_PATTERN),
    expectedValue: primitive(),
  },
);

const V1_serializeStringValuePattern = (
  protocol: V1_StringValuePattern,
): PlainObject<V1_StringValuePattern> => {
  if (protocol instanceof V1_EqualToJsonPattern) {
    return serialize(V1_equalToJsonPatternModelSchema, protocol);
  } else if (protocol instanceof V1_EqualToPattern) {
    return serialize(V1_equalToPatternModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize string value pattern`,
    protocol,
  );
};

const V1_deserializeStringValuePattern = (
  json: PlainObject<V1_StringValuePattern>,
): V1_StringValuePattern => {
  switch (json._type) {
    case V1_StringValuePatternType.EQUAL_TO_JSON_PATTERN:
      return deserialize(V1_equalToJsonPatternModelSchema, json);
    case V1_StringValuePatternType.EQUAL_TO_PATTERN:
      return deserialize(V1_equalToPatternModelSchema, json);
    default: {
      throw new UnsupportedOperationError(
        `Can't deserialize string value pattern of type '${json._type}'`,
      );
    }
  }
};

export const V1_serviceRequestPatternModelSchema = createModelSchema(
  V1_ServiceRequestPattern,
  {
    bodyPatterns: customList(
      V1_serializeStringValuePattern,
      V1_deserializeStringValuePattern,
    ),
    headerParams: optionalCustom(
      (val) => serializeMap(val, V1_serializeStringValuePattern),
      (val) => deserializeMap(val, V1_deserializeStringValuePattern),
    ),
    method: primitive(),
    queryParams: optionalCustom(
      (val) => serializeMap(val, V1_serializeStringValuePattern),
      (val) => deserializeMap(val, V1_deserializeStringValuePattern),
    ),
    url: optional(primitive()),
    urlPath: optional(primitive()),
  },
);

export const V1_serviceResponseDefinitionModelSchema = createModelSchema(
  V1_ServiceResponseDefinition,
  {
    body: usingModelSchema(V1_externalFormatDataModelSchema),
  },
);

export const V1_serviceStubMappingModelSchema = createModelSchema(
  V1_ServiceStubMapping,
  {
    requestPattern: usingModelSchema(V1_serviceRequestPatternModelSchema),
    responseDefinition: usingModelSchema(
      V1_serviceResponseDefinitionModelSchema,
    ),
  },
);

export const V1_serviceStoreEmbeddedDataModelSchema = createModelSchema(
  V1_ServiceStoreEmbeddedData,
  {
    _type: usingConstantValueSchema(
      V1_SERVICE_STORE_EMBEDDED_DATA_PROTOCOL_TYPE,
    ),
    serviceStubMappings: list(
      usingModelSchema(V1_serviceStubMappingModelSchema),
    ),
  },
);
