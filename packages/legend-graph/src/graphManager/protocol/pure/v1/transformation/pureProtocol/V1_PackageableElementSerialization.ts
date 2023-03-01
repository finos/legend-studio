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

import { serialize, deserialize } from 'serializr';
import {
  type PlainObject,
  UnsupportedOperationError,
  assertErrorThrown,
  guaranteeIsString,
} from '@finos/legend-shared';
import type { V1_PackageableConnection } from '../../model/packageableElements/connection/V1_PackageableConnection.js';
import type { V1_Association } from '../../model/packageableElements/domain/V1_Association.js';
import type { V1_Class } from '../../model/packageableElements/domain/V1_Class.js';
import type { V1_Enumeration } from '../../model/packageableElements/domain/V1_Enumeration.js';
import type { V1_Measure } from '../../model/packageableElements/domain/V1_Measure.js';
import type { V1_Profile } from '../../model/packageableElements/domain/V1_Profile.js';
import type { V1_FileGenerationSpecification } from '../../model/packageableElements/fileGeneration/V1_FileGenerationSpecification.js';
import type { V1_ConcreteFunctionDefinition } from '../../model/packageableElements/function/V1_ConcreteFunctionDefinition.js';
import type { V1_GenerationSpecification } from '../../model/packageableElements/generationSpecification/V1_GenerationSpecification.js';
import type { V1_Mapping } from '../../model/packageableElements/mapping/V1_Mapping.js';
import type {
  V1_PackageableElement,
  V1_PackageableElementVisitor,
} from '../../model/packageableElements/V1_PackageableElement.js';
import type { V1_PackageableRuntime } from '../../model/packageableElements/runtime/V1_PackageableRuntime.js';
import type { V1_SectionIndex } from '../../model/packageableElements/section/V1_SectionIndex.js';
import type { V1_Service } from '../../model/packageableElements/service/V1_Service.js';
import type { V1_FlatData } from '../../model/packageableElements/store/flatData/model/V1_FlatData.js';
import type { V1_Database } from '../../model/packageableElements/store/relational/model/V1_Database.js';
import {
  V1_flatDataModelSchema,
  V1_FLAT_DATA_ELEMENT_PROTOCOL_TYPE,
} from './serializationHelpers/V1_StoreSerializationHelper.js';
import {
  V1_mappingModelSchema,
  V1_MAPPING_ELEMENT_PROTOCOL_TYPE,
} from './serializationHelpers/V1_MappingSerializationHelper.js';
import {
  V1_serviceModelSchema,
  V1_SERVICE_ELEMENT_PROTOCOL_TYPE,
} from './serializationHelpers/V1_ServiceSerializationHelper.js';
import {
  V1_PACKAGEABLE_RUNTIME_ELEMENT_PROTOCOL_TYPE,
  V1_packageableRuntimeModelSchema,
} from './serializationHelpers/V1_RuntimeSerializationHelper.js';
import {
  V1_PACKAGEABLE_CONNECTION_ELEMENT_PROTOCOL_TYPE,
  V1_packageableConnectionModelSchema,
} from './serializationHelpers/V1_ConnectionSerializationHelper.js';
import {
  V1_FILE_GENERATION_ELEMENT_PROTOCOL_TYPE,
  V1_fileGenerationModelSchema,
  V1_SCHEMA_GENERATION_ELEMENT_PROTOCOL_TYPE,
  V1_schemaGenerationModelSchema,
} from './serializationHelpers/V1_FileGenerationSerializationHelper.js';
import {
  V1_GENERATION_SPECIFICATION_ELEMENT_PROTOCOL_TYPE,
  V1_generationSpecificationsModelSchema,
} from './serializationHelpers/V1_GenerationSpecificationSerializationHelper.js';
import {
  V1_SECTION_INDEX_ELEMENT_PROTOCOL_TYPE,
  V1_sectionIndexModelSchema,
} from './serializationHelpers/V1_SectionIndexSerializationHelper.js';
import {
  V1_databaseModelSchema,
  V1_DATABASE_ELEMENT_PROTOCOL_TYPE,
} from './serializationHelpers/V1_DatabaseSerializationHelper.js';
import {
  V1_associationSchema,
  V1_ASSOCIATION_ELEMENT_PROTOCOL_TYPE,
  V1_classSchema,
  V1_CLASS_ELEMENT_PROTOCOL_TYPE,
  V1_enumerationSchema,
  V1_ENUMERATION_ELEMENT_PROTOCOL_TYPE,
  V1_functionSchema,
  V1_FUNCTION_ELEMENT_PROTOCOL_TYPE,
  V1_measureSchema,
  V1_MEASURE_ELEMENT_PROTOCOL_TYPE,
  V1_profileSchema,
  V1_PROFILE_ELEMENT_PROTOCOL_TYPE,
} from './serializationHelpers/V1_DomainSerializationHelper.js';
import type {
  PureProtocolProcessorPlugin,
  V1_ElementProtocolSerializer,
} from '../../../PureProtocolProcessorPlugin.js';
import { createPath } from '../../../../../../graph/MetaModelUtils.js';
import type { V1_DataElement } from '../../model/packageableElements/data/V1_DataElement.js';
import {
  V1_dataElementModelSchema,
  V1_DATA_ELEMENT_PROTOCOL_TYPE,
} from './serializationHelpers/V1_DataElementSerializationHelper.js';
import type { V1_SchemaGenerationSpecification } from '../../model/packageableElements/fileGeneration/V1_SchemaGenerationSpecification.js';

class V1_PackageableElementSerializer
  implements V1_PackageableElementVisitor<PlainObject<V1_PackageableElement>>
{
  extraElementProtocolSerializers: V1_ElementProtocolSerializer[] = [];
  plugins: PureProtocolProcessorPlugin[];

  constructor(plugins: PureProtocolProcessorPlugin[]) {
    this.extraElementProtocolSerializers = plugins.flatMap(
      (plugin) => plugin.V1_getExtraElementProtocolSerializers?.() ?? [],
    );
    this.plugins = plugins;
  }

  visit_PackageableElement(
    elementProtocol: V1_PackageableElement,
  ): PlainObject<V1_PackageableElement> {
    for (const serializer of this.extraElementProtocolSerializers) {
      const elementProtocolJson = serializer(elementProtocol, this.plugins);
      if (elementProtocolJson) {
        return elementProtocolJson;
      }
    }
    throw new UnsupportedOperationError(
      `Can't serialize protocol for element '${elementProtocol.path}': no compatible serializer available from plugins`,
    );
  }

  visit_Profile(element: V1_Profile): PlainObject<V1_PackageableElement> {
    return serialize(V1_profileSchema, element);
  }

  visit_Enumeration(
    element: V1_Enumeration,
  ): PlainObject<V1_PackageableElement> {
    return serialize(V1_enumerationSchema, element);
  }

  visit_Measure(element: V1_Measure): PlainObject<V1_PackageableElement> {
    return serialize(V1_measureSchema, element);
  }

  visit_Class(element: V1_Class): PlainObject<V1_PackageableElement> {
    return serialize(V1_classSchema, element);
  }

  visit_Association(
    element: V1_Association,
  ): PlainObject<V1_PackageableElement> {
    return serialize(V1_associationSchema, element);
  }

  visit_ConcreteFunctionDefinition(
    element: V1_ConcreteFunctionDefinition,
  ): PlainObject<V1_PackageableElement> {
    return serialize(V1_functionSchema, element);
  }

  visit_FlatData(element: V1_FlatData): PlainObject<V1_PackageableElement> {
    return serialize(V1_flatDataModelSchema, element);
  }

  visit_Database(element: V1_Database): PlainObject<V1_PackageableElement> {
    return serialize(V1_databaseModelSchema, element);
  }

  visit_Mapping(element: V1_Mapping): PlainObject<V1_PackageableElement> {
    return serialize(V1_mappingModelSchema(this.plugins), element);
  }

  visit_Service(element: V1_Service): PlainObject<V1_PackageableElement> {
    return serialize(V1_serviceModelSchema(this.plugins), element);
  }

  visit_PackageableRuntime(
    element: V1_PackageableRuntime,
  ): PlainObject<V1_PackageableElement> {
    return serialize(V1_packageableRuntimeModelSchema, element);
  }

  visit_PackageableConnection(
    element: V1_PackageableConnection,
  ): PlainObject<V1_PackageableElement> {
    return serialize(
      V1_packageableConnectionModelSchema(this.plugins),
      element,
    );
  }

  visit_SchemaGeneration(
    element: V1_SchemaGenerationSpecification,
  ): PlainObject<V1_PackageableElement> {
    return serialize(V1_schemaGenerationModelSchema, element);
  }

  visit_FileGeneration(
    element: V1_FileGenerationSpecification,
  ): PlainObject<V1_PackageableElement> {
    return serialize(V1_fileGenerationModelSchema, element);
  }

  visit_GenerationSpecification(
    element: V1_GenerationSpecification,
  ): PlainObject<V1_PackageableElement> {
    return serialize(V1_generationSpecificationsModelSchema, element);
  }

  visit_SectionIndex(
    element: V1_SectionIndex,
  ): PlainObject<V1_PackageableElement> {
    return serialize(V1_sectionIndexModelSchema, element);
  }

  visit_DataElement(
    element: V1_DataElement,
  ): PlainObject<V1_PackageableElement> {
    return serialize(V1_dataElementModelSchema(this.plugins), element);
  }
}

export const V1_serializePackageableElement = (
  element: V1_PackageableElement,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_PackageableElement> => {
  try {
    return element.accept_PackageableElementVisitor(
      new V1_PackageableElementSerializer(plugins),
    );
  } catch (error) {
    assertErrorThrown(error);
    error.message = `Can't serialize element '${element.path}': ${error.message}`;
    throw error;
  }
};

export const V1_deserializePackageableElement = (
  json: PlainObject<V1_PackageableElement>,
  plugins: PureProtocolProcessorPlugin[],
): V1_PackageableElement => {
  const packagePath = guaranteeIsString(
    json.package,
    `Can't deserialize element: element package is not a string`,
  );
  const name = guaranteeIsString(
    json.name,
    `Can't deserialize element: element name is not a string`,
  );
  const elementPath = createPath(packagePath, name);

  try {
    const extraElementProtocolDeserializers = plugins.flatMap(
      (plugin) => plugin.V1_getExtraElementProtocolDeserializers?.() ?? [],
    );
    switch (json._type) {
      case V1_PROFILE_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_profileSchema, json);
      case V1_ENUMERATION_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_enumerationSchema, json);
      case V1_MEASURE_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_measureSchema, json);
      case V1_CLASS_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_classSchema, json);
      case V1_ASSOCIATION_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_associationSchema, json);
      case V1_FUNCTION_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_functionSchema, json);
      case V1_FLAT_DATA_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_flatDataModelSchema, json);
      case V1_DATABASE_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_databaseModelSchema, json);
      case V1_MAPPING_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_mappingModelSchema(plugins), json);
      case V1_SERVICE_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_serviceModelSchema(plugins), json);
      case V1_PACKAGEABLE_CONNECTION_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_packageableConnectionModelSchema(plugins), json);
      case V1_PACKAGEABLE_RUNTIME_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_packageableRuntimeModelSchema, json);
      case V1_SCHEMA_GENERATION_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_schemaGenerationModelSchema, json);
      case V1_FILE_GENERATION_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_fileGenerationModelSchema, json);
      case V1_GENERATION_SPECIFICATION_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_generationSpecificationsModelSchema, json);
      case V1_SECTION_INDEX_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_sectionIndexModelSchema, json);
      case V1_DATA_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_dataElementModelSchema(plugins), json);
      default: {
        for (const deserializer of extraElementProtocolDeserializers) {
          const elementProtocol = deserializer(json, plugins);
          if (elementProtocol) {
            return elementProtocol;
          }
        }
        throw new UnsupportedOperationError(
          `Can't deserialize element of type '${json._type}': no compatible deserializer available from plugins`,
        );
      }
    }
  } catch (error) {
    assertErrorThrown(error);
    error.message = `Can't deserialize element '${elementPath}': ${error.message}`;
    throw error;
  }
};
