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
import type { PlainObject } from '@finos/legend-studio-shared';
import { UnsupportedOperationError } from '@finos/legend-studio-shared';
import type { V1_PackageableConnection } from '../../model/packageableElements/connection/V1_PackageableConnection';
import type { V1_Diagram } from '../../model/packageableElements/diagram/V1_Diagram';
import type { V1_Association } from '../../model/packageableElements/domain/V1_Association';
import type { V1_Class } from '../../model/packageableElements/domain/V1_Class';
import type { V1_Enumeration } from '../../model/packageableElements/domain/V1_Enumeration';
import type { V1_Measure } from '../../model/packageableElements/domain/V1_Measure';
import type { V1_Profile } from '../../model/packageableElements/domain/V1_Profile';
import type { V1_FileGenerationSpecification } from '../../model/packageableElements/fileGeneration/V1_FileGenerationSpecification';
import type { V1_ConcreteFunctionDefinition } from '../../model/packageableElements/function/V1_ConcreteFunctionDefinition';
import type { V1_GenerationSpecification } from '../../model/packageableElements/generationSpecification/V1_GenerationSpecification';
import type { V1_Mapping } from '../../model/packageableElements/mapping/V1_Mapping';
import type {
  V1_PackageableElement,
  V1_PackageableElementVisitor,
} from '../../model/packageableElements/V1_PackageableElement';
import type { V1_PackageableRuntime } from '../../model/packageableElements/runtime/V1_PackageableRuntime';
import type { V1_SectionIndex } from '../../model/packageableElements/section/V1_SectionIndex';
import type { V1_Service } from '../../model/packageableElements/service/V1_Service';
import type { V1_FlatData } from '../../model/packageableElements/store/flatData/model/V1_FlatData';
import type { V1_Database } from '../../model/packageableElements/store/relational/model/V1_Database';
import type { V1_ServiceStore } from '../../model/packageableElements/store/relational/V1_ServiceStore';
import {
  V1_flatDataModelSchema,
  V1_FLAT_DATA_ELEMENT_PROTOCOL_TYPE,
  V1_serviceStoreModelSchema,
  V1_SERVICE_STORE_ELEMENT_PROTOCOL_TYPE,
} from './serializationHelpers/V1_StoreSerializationHelper';
import {
  V1_mappingModelSchema,
  V1_MAPPING_ELEMENT_PROTOCOL_TYPE,
} from './serializationHelpers/V1_MappingSerializationHelper';
import {
  V1_diagramModelSchema,
  V1_DIAGRAM_ELEMENT_PROTOCOL_TYPE,
} from './serializationHelpers/V1_DiagramSerializationHelper';
import {
  V1_servicedModelSchema,
  V1_SERVICE_ELEMENT_PROTOCOL_TYPE,
} from './serializationHelpers/V1_ServiceSerializationHelper';
import {
  V1_PACKAGEABLE_RUNTIME_ELEMENT_PROTOCOL_TYPE,
  V1_packageableRuntimeModelSchema,
} from './serializationHelpers/V1_RuntimeSerializationHelper';
import {
  V1_PACKAGEABLE_CONNECTION_ELEMENT_PROTOCOL_TYPE,
  V1_packageableConnectionModelSchema,
} from './serializationHelpers/V1_ConnectionSerializationHelper';
import {
  V1_FILE_GENERATION_ELEMENT_PROTOCOL_TYPE,
  V1_fileGenerationModelSchema,
} from './serializationHelpers/V1_FileGenerationSerializationHelper';
import {
  V1_GENERATION_SPECIFICATION_ELEMENT_PROTOCOL_TYPE,
  V1_generationSpecificationsModelSchema,
} from './serializationHelpers/V1_GenerationSpecificationSerializationHelper';
import {
  V1_SECTION_INDEX_ELEMENT_PROTOCOL_TYPE,
  V1_sectionIndexModelSchema,
} from './serializationHelpers/V1_SectionIndexSerializationHelper';
import {
  V1_databaseModelSchema,
  V1_DATABASE_ELEMENT_PROTOCOL_TYPE,
} from './serializationHelpers/V1_DatabaseSerializationHelper';
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
} from './serializationHelpers/V1_DomainSerializationHelper';
import type {
  PureProtocolProcessorPlugin,
  V1_ElementProtocolSerializer,
} from '../../../PureProtocolProcessorPlugin';

export class V1_PackageableElementSerializer
  implements V1_PackageableElementVisitor<PlainObject<V1_PackageableElement>>
{
  extraElementProtocolSerializers: V1_ElementProtocolSerializer[] = [];

  constructor(plugins: PureProtocolProcessorPlugin[]) {
    this.extraElementProtocolSerializers = plugins.flatMap(
      (plugin) => plugin.V1_getExtraElementProtocolSerializers?.() ?? [],
    );
  }

  visit_PackageableElement(
    elementProtocol: V1_PackageableElement,
  ): PlainObject<V1_PackageableElement> {
    for (const serializer of this.extraElementProtocolSerializers) {
      const elementProtocolJson = serializer(elementProtocol);
      if (elementProtocolJson) {
        return elementProtocolJson;
      }
    }
    throw new UnsupportedOperationError(
      `Can't serialize protocol for element '${elementProtocol.path}'. No compatible serializer available from plugins.`,
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

  visit_ServiceStore(
    element: V1_ServiceStore,
  ): PlainObject<V1_PackageableElement> {
    return serialize(V1_serviceStoreModelSchema, element);
  }

  visit_Mapping(element: V1_Mapping): PlainObject<V1_PackageableElement> {
    return serialize(V1_mappingModelSchema, element);
  }

  visit_Service(element: V1_Service): PlainObject<V1_PackageableElement> {
    return serialize(V1_servicedModelSchema, element);
  }

  visit_Diagram(element: V1_Diagram): PlainObject<V1_PackageableElement> {
    return serialize(V1_diagramModelSchema, element);
  }

  visit_PackageableRuntime(
    element: V1_PackageableRuntime,
  ): PlainObject<V1_PackageableElement> {
    return serialize(V1_packageableRuntimeModelSchema, element);
  }

  visit_PackageableConnection(
    element: V1_PackageableConnection,
  ): PlainObject<V1_PackageableElement> {
    return serialize(V1_packageableConnectionModelSchema, element);
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
}

export const V1_deserializePackageableElement = (
  json: PlainObject<V1_PackageableElement>,
  plugins: PureProtocolProcessorPlugin[],
): V1_PackageableElement => {
  const extraElementProtocolDeserializers = plugins.flatMap(
    (plugin) => plugin.V1_getExtraElementProtocolDeserializers?.() ?? [],
  );
  switch (json._type) {
    /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
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
    case V1_SERVICE_STORE_ELEMENT_PROTOCOL_TYPE:
      return deserialize(V1_serviceStoreModelSchema, json);
    case V1_MAPPING_ELEMENT_PROTOCOL_TYPE:
      return deserialize(V1_mappingModelSchema, json);
    case V1_SERVICE_ELEMENT_PROTOCOL_TYPE:
      return deserialize(V1_servicedModelSchema, json);
    case V1_DIAGRAM_ELEMENT_PROTOCOL_TYPE:
      return deserialize(V1_diagramModelSchema, json);
    case V1_PACKAGEABLE_CONNECTION_ELEMENT_PROTOCOL_TYPE:
      return deserialize(V1_packageableConnectionModelSchema, json);
    case V1_PACKAGEABLE_RUNTIME_ELEMENT_PROTOCOL_TYPE:
      return deserialize(V1_packageableRuntimeModelSchema, json);
    case V1_FILE_GENERATION_ELEMENT_PROTOCOL_TYPE:
      return deserialize(V1_fileGenerationModelSchema, json);
    case V1_GENERATION_SPECIFICATION_ELEMENT_PROTOCOL_TYPE:
      return deserialize(V1_generationSpecificationsModelSchema, json);
    case V1_SECTION_INDEX_ELEMENT_PROTOCOL_TYPE:
      return deserialize(V1_sectionIndexModelSchema, json);
    default: {
      for (const deserializer of extraElementProtocolDeserializers) {
        const elementProtocol = deserializer(json);
        if (elementProtocol) {
          return elementProtocol;
        }
      }
      throw new UnsupportedOperationError(
        `Can't deserialize element of type '${json._type}'. No compatible deserializer available from plugins.`,
      );
    }
  }
};
