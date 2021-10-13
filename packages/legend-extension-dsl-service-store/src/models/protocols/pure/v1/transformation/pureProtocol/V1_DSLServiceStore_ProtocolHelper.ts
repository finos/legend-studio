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

import type { PlainObject } from '@finos/legend-shared';
import {
  UnsupportedOperationError,
  usingConstantValueSchema,
  usingModelSchema,
} from '@finos/legend-shared';
import type { ModelSchema } from 'serializr';
import {
  alias,
  createModelSchema,
  primitive,
  list,
  optional,
  SKIP,
  custom,
  serialize,
  deserialize,
  object,
} from 'serializr';
import { V1_ServiceStore } from '../../model/packageableElements/store/serviceStore/model/V1_ServiceStore';
import { V1_Service } from '../../model/packageableElements/store/serviceStore/model/V1_Service';
import { V1_ServiceGroup } from '../../model/packageableElements/store/serviceStore/model/V1_ServiceGroup';
import type { V1_ServiceStoreElement } from '../../model/packageableElements/store/serviceStore/model/V1_ServiceStoreElement';
import { V1_ServiceParameter } from '../../model/packageableElements/store/serviceStore/model/V1_ServiceParameter';
import type { V1_TypeReference } from '../../model/packageableElements/store/serviceStore/model/V1_TypeReference';
import { V1_BooleanTypeReference } from '../../model/packageableElements/store/serviceStore/model/V1_BooleanTypeReference';
import { V1_ComplexTypeReference } from '../../model/packageableElements/store/serviceStore/model/V1_ComplexTypeReference';
import { V1_FloatTypeReference } from '../../model/packageableElements/store/serviceStore/model/V1_FloatTypeReference';
import { V1_IntegerTypeReference } from '../../model/packageableElements/store/serviceStore/model/V1_IntegerTypeReference';
import { V1_StringTypeReference } from '../../model/packageableElements/store/serviceStore/model/V1_StringTypeReference';
import { V1_SerializationFormat } from '../../model/packageableElements/store/serviceStore/model/V1_SerializationFormat';
import { V1_ServiceStoreConnection } from '../../model/packageableElements/store/serviceStore/connection/V1_ServicestoreConnection';
import { V1_RootServiceStoreClassMapping } from '../../model/packageableElements/store/serviceStore/mapping/V1_RootServiceStoreClassMapping';
import { V1_LocalMappingProperty } from '../../model/packageableElements/store/serviceStore/mapping/V1_LocalMappingProperty';
import { V1_ServiceMapping } from '../../model/packageableElements/store/serviceStore/mapping/V1_ServiceMapping';
import { V1_ServicePtr } from '../../model/packageableElements/store/serviceStore/model/V1_ServicePtr';
import { V1_ServiceGroupPtr } from '../../model/packageableElements/store/serviceStore/model/V1_ServiceGroupPtr';
import type { V1_ServiceParameterMapping } from '../../model/packageableElements/store/serviceStore/mapping/V1_ServiceParameterMapping';
import type { PureProtocolProcessorPlugin } from '@finos/legend-graph';
import { V1_Multiplicity, V1_rawLambdaModelSchema } from '@finos/legend-graph';
import { V1_ParameterIndexedParameterMapping } from '../../model/packageableElements/store/serviceStore/mapping/V1_ParameterIndexedParameterMapping';
import { V1_PropertyIndexedParameterMapping } from '../../model/packageableElements/store/serviceStore/mapping/V1_PropertyIndexedParameterMapping';
import type { V1_SecurityScheme } from '../../model/packageableElements/store/serviceStore/model/V1_SecurityScheme';
import type { SecurityScheme_PureProtocolPlugin_Extension } from '../../../SecurityScheme_PureProtocolPlugin_Extension';

export const V1_SERVICE_STORE_ELEMENT_PROTOCOL_TYPE = 'serviceStore';
export const V1_SERVICE_STORE_MAPPING_PROTOCOL_TYPE = 'serviceStore';
export const V1_SERVICE_STORE_CONNECTION_PROTOCOL_TYPE = 'serviceStore';

enum V1_ServiceStoreElementType {
  SERVICE = 'service',
  SERVICE_GROUP = 'serviceGroup',
}

enum V1_ReferenceType {
  BOOLEAN_TYPE_REFERENCE = 'boolean',
  COMPLEX_TYPE_REFERENCE = 'complex',
  FLOAT_TYPE_REFERENCE = 'float',
  INTEGER_TYPE_REFERENCE = 'integer',
  STRING_TYPE_REFERENCE = 'string',
}

enum V1_ServiceParameterMappingType {
  PROPERTY_INDEXED_PARAMETER_MAPPING = 'property',
  PARAMETER_INDEXED_PARAMETER_MAPPING = 'parameter',
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
): PlainObject<V1_TypeReference> | typeof SKIP => {
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
  return SKIP;
};

const V1_deserializeTypeReference = (
  json: PlainObject<V1_TypeReference>,
): V1_TypeReference | typeof SKIP => {
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
      return SKIP;
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
  enumeration: optional(primitive()),
  location: primitive(),
  name: primitive(),
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
        plugin as SecurityScheme_PureProtocolPlugin_Extension
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
        plugin as SecurityScheme_PureProtocolPlugin_Extension
      ).V1_getExtraSecuritySchemeProtocolDeserializers?.() ?? [],
  );
  for (const deserializer of extraSecuritySchemeProtocolDeserializers) {
    const protocol = deserializer(json);
    if (protocol) {
      return protocol;
    }
  }
  throw new UnsupportedOperationError(
    `Can't deserialize authentication strategy of type '${json._type}': no compatible deserializer available from plugins`,
  );
};

const V1_serviceModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_Service> =>
  createModelSchema(V1_Service, {
    _type: usingConstantValueSchema(V1_ServiceStoreElementType.SERVICE),
    id: primitive(),
    requestBody: optional(
      custom(
        (val) => V1_serializeTypeReference(val),
        (val) => V1_deserializeTypeReference(val),
      ),
    ),
    method: primitive(),
    parameters: list(usingModelSchema(V1_serviceParameterModelSchema)),
    path: primitive(),
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
          if (val instanceof V1_Service) {
            return serialize(V1_serviceModelSchema(plugins), val);
          } else if (val instanceof V1_ServiceGroup) {
            return serialize(V1_serviceGroupModelSchema(plugins), val);
          }
          throw new UnsupportedOperationError(
            `Can't serialize service store element: no compatible serializer available from plugins`,
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
                `Can't deserialize service store element of type '${val._type}': no compatible deserializer available from plugins`,
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
  if (protocol instanceof V1_Service) {
    return serialize(V1_serviceModelSchema(plugins), protocol);
  } else if (protocol instanceof V1_ServiceGroup) {
    return serialize(V1_serviceGroupModelSchema(plugins), protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize service store element: no compatible serializer available from plugins`,
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
        `Can't deserialize service store element of type '${json._type}': no compatible deserializer available from plugins`,
      );
    }
  }
};

const V1_serviceGroupPtrModelSchema = createModelSchema(V1_ServiceGroupPtr, {
  serviceStore: primitive(),
  serviceGroup: primitive(),
  parent: optional(object(V1_ServiceGroupPtr)),
});

const V1_servicePtrModelSchema = createModelSchema(V1_ServicePtr, {
  service: primitive(),
  serviceStore: primitive(),
  parent: optional(usingModelSchema(V1_serviceGroupPtrModelSchema)),
});

const V1_parameterIndexedParameterMappingModelSchema = createModelSchema(
  V1_ParameterIndexedParameterMapping,
  {
    _type: usingConstantValueSchema(
      V1_ServiceParameterMappingType.PARAMETER_INDEXED_PARAMETER_MAPPING,
    ),
    serviceParameter: primitive(),
    transform: usingModelSchema(V1_rawLambdaModelSchema),
  },
);

const V1_propertyIndexedParameterMappingModelSchema = createModelSchema(
  V1_PropertyIndexedParameterMapping,
  {
    _type: usingConstantValueSchema(
      V1_ServiceParameterMappingType.PROPERTY_INDEXED_PARAMETER_MAPPING,
    ),
    property: primitive(),
    serviceParameter: primitive(),
  },
);

const V1_serializeServiceParameterMapping = (
  protocol: V1_ServiceParameterMapping,
): PlainObject<V1_ServiceParameterMapping> => {
  if (protocol instanceof V1_ParameterIndexedParameterMapping) {
    return serialize(V1_parameterIndexedParameterMappingModelSchema, protocol);
  } else if (protocol instanceof V1_PropertyIndexedParameterMapping) {
    return serialize(V1_propertyIndexedParameterMappingModelSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize service parameter mapping: no compatible serializer available from plugins`,
    protocol,
  );
};

const V1_deserializeServiceParameterMapping = (
  json: PlainObject<V1_ServiceParameterMapping>,
): V1_ServiceParameterMapping => {
  switch (json._type) {
    case 'parameter':
      return deserialize(V1_parameterIndexedParameterMappingModelSchema, json);
    case 'property':
      return deserialize(V1_propertyIndexedParameterMappingModelSchema, json);
    default: {
      throw new UnsupportedOperationError(
        `Can't deserialize service store element of type '${json._type}': no compatible deserializer available from plugins`,
      );
    }
  }
};

const V1_serviceMappingModelSchema = createModelSchema(V1_ServiceMapping, {
  parameterMappings: list(
    custom(
      (val) => V1_serializeServiceParameterMapping(val),
      (val) => V1_deserializeServiceParameterMapping(val),
    ),
  ),
  service: usingModelSchema(V1_servicePtrModelSchema),
});

const V1_localMappingPropertyModelSchema = createModelSchema(
  V1_LocalMappingProperty,
  {
    name: primitive(),
    type: primitive(),
    multiplicity: object(V1_Multiplicity),
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
    name: primitive(),
    package: primitive(),
  });

export const V1_rootServiceStoreClassMappingModelSchema = createModelSchema(
  V1_RootServiceStoreClassMapping,
  {
    _type: usingConstantValueSchema(V1_SERVICE_STORE_MAPPING_PROTOCOL_TYPE),
    class: primitive(),
    localMappingProperties: list(
      usingModelSchema(V1_localMappingPropertyModelSchema),
    ),
    root: primitive(),
    servicesMapping: list(usingModelSchema(V1_serviceMappingModelSchema)),
    id: optional(primitive()),
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
