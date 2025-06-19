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
  isString,
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
  V1_associationModelSchema,
  V1_ASSOCIATION_ELEMENT_PROTOCOL_TYPE,
  V1_classModelSchema,
  V1_CLASS_ELEMENT_PROTOCOL_TYPE,
  V1_enumerationModelSchema,
  V1_ENUMERATION_ELEMENT_PROTOCOL_TYPE,
  V1_functionModelSchema,
  V1_FUNCTION_ELEMENT_PROTOCOL_TYPE,
  V1_measureModelSchema,
  V1_MEASURE_ELEMENT_PROTOCOL_TYPE,
  V1_profileModelSchema,
  V1_PROFILE_ELEMENT_PROTOCOL_TYPE,
  V1_INTERNAL__UnknownFunctionActivatorModelSchema,
  V1_snowflakeAppModelSchema,
  V1_snowflakeM2MUdfModelSchema,
  V1_SNOWFLAKE_APP_TYPE,
  V1_SNOWFLAKE_M2M_UDF_TYPE,
  V1_HostedServiceModelSchema,
  V1_HOSTED_SERVICE_TYPE,
  V1_MEM_SQL_TYPE,
  V1_MemSQLModelSchema,
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
import {
  V1_executionEnvModelSchema,
  V1_EXECUTION_ENVIRONMENT_ELEMENT_PROTOCOL_TYPE,
} from './serializationHelpers/V1_ExecutionEnvironmentSerializationHelper.js';
import type { V1_ExecutionEnvironmentInstance } from '../../model/packageableElements/service/V1_ExecutionEnvironmentInstance.js';
import { V1_INTERNAL__UnknownPackageableElement } from '../../model/packageableElements/V1_INTERNAL__UnknownPackageableElement.js';
import type { V1_INTERNAL__UnknownFunctionActivator } from '../../model/packageableElements/function/V1_INTERNAL__UnknownFunctionActivator.js';
import type {
  ClassifierPathMappingMap,
  SubtypeInfo,
} from '../../../../../action/protocol/ProtocolInfo.js';
import { V1_INTERNAL__UnknownStore } from '../../model/packageableElements/store/V1_INTERNAL__UnknownStore.js';
import type { V1_SnowflakeApp } from '../../model/packageableElements/function/V1_SnowflakeApp.js';
import type { V1_SnowflakeM2MUdf } from '../../model/packageableElements/function/V1_SnowflakeM2MUdf.js';
import { V1_INTERNAL__UnknownElement } from '../../model/packageableElements/V1_INTERNAL__UnknownElement.js';
import type { V1_HostedService } from '../../model/packageableElements/function/V1_HostedService.js';
import {
  V1_DATA_PRODUCT_ELEMENT_PROTOCOL_TYPE,
  type V1_DataProduct,
} from '../../model/packageableElements/dataProduct/V1_DataProduct.js';
import { V1_dataProductModelSchema } from './serializationHelpers/V1_DataProductSerializationHelper.js';
import { V1_INGEST_DEFINITION_TYPE } from '../../model/packageableElements/ingest/V1_IngestDefinition.js';
import { V1_createIngestDef } from './serializationHelpers/V1_IngestSerializationHelper.js';
import type { V1_MemSQLFunction } from '../../model/packageableElements/function/V1_MemSQLFunction.js';

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

  visit_INTERNAL__UnknownElement(
    element: V1_INTERNAL__UnknownElement,
  ): PlainObject<V1_PackageableElement> {
    return element.content;
  }

  visit_INTERNAL__UnknownPackageableElement(
    element: V1_INTERNAL__UnknownPackageableElement,
  ): PlainObject<V1_PackageableElement> {
    return element.content;
  }

  visit_IngestDefinition(
    element: V1_INTERNAL__UnknownPackageableElement,
  ): PlainObject<V1_PackageableElement> {
    return this.visit_INTERNAL__UnknownPackageableElement(element);
  }

  visit_INTERNAL__UnknownFunctionActivator(
    element: V1_INTERNAL__UnknownFunctionActivator,
  ): PlainObject<V1_PackageableElement> {
    return element.content;
  }

  visit_SnowflakeApp(
    element: V1_SnowflakeApp,
  ): PlainObject<V1_PackageableElement> {
    return serialize(V1_snowflakeAppModelSchema(this.plugins), element);
  }

  visit_SnowflakeM2MUdf(
    element: V1_SnowflakeM2MUdf,
  ): PlainObject<V1_PackageableElement> {
    return serialize(V1_snowflakeM2MUdfModelSchema(this.plugins), element);
  }

  visit_HostedService(
    element: V1_HostedService,
  ): PlainObject<V1_PackageableElement> {
    return serialize(V1_HostedServiceModelSchema(this.plugins), element);
  }

  visit_MemSQLFunction(
    element: V1_MemSQLFunction,
  ): PlainObject<V1_PackageableElement> {
    return serialize(V1_MemSQLModelSchema(this.plugins), element);
  }

  visit_INTERNAL__UnknownStore(
    element: V1_INTERNAL__UnknownStore,
  ): PlainObject<V1_PackageableElement> {
    return element.content;
  }

  visit_Profile(element: V1_Profile): PlainObject<V1_PackageableElement> {
    return serialize(V1_profileModelSchema, element);
  }

  visit_Enumeration(
    element: V1_Enumeration,
  ): PlainObject<V1_PackageableElement> {
    return serialize(V1_enumerationModelSchema, element);
  }

  visit_Measure(element: V1_Measure): PlainObject<V1_PackageableElement> {
    return serialize(V1_measureModelSchema, element);
  }

  visit_Class(element: V1_Class): PlainObject<V1_PackageableElement> {
    return serialize(V1_classModelSchema, element);
  }

  visit_Association(
    element: V1_Association,
  ): PlainObject<V1_PackageableElement> {
    return serialize(V1_associationModelSchema, element);
  }

  visit_ConcreteFunctionDefinition(
    element: V1_ConcreteFunctionDefinition,
  ): PlainObject<V1_PackageableElement> {
    return serialize(V1_functionModelSchema(this.plugins), element);
  }

  visit_FlatData(element: V1_FlatData): PlainObject<V1_PackageableElement> {
    return serialize(V1_flatDataModelSchema, element);
  }

  visit_Database(element: V1_Database): PlainObject<V1_PackageableElement> {
    return serialize(V1_databaseModelSchema, element);
  }

  visit_DataProduct(
    element: V1_DataProduct,
  ): PlainObject<V1_PackageableElement> {
    return serialize(V1_dataProductModelSchema, element);
  }

  visit_Mapping(element: V1_Mapping): PlainObject<V1_PackageableElement> {
    return serialize(V1_mappingModelSchema(this.plugins), element);
  }

  visit_Service(element: V1_Service): PlainObject<V1_PackageableElement> {
    return serialize(V1_serviceModelSchema(this.plugins), element);
  }

  visit_ExecutionEnvironmentInstance(
    element: V1_ExecutionEnvironmentInstance,
  ): PlainObject<V1_ExecutionEnvironmentInstance> {
    return serialize(V1_executionEnvModelSchema, element);
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
  subtypeInfo?: SubtypeInfo | undefined,
  classifierPathMappingMap?: ClassifierPathMappingMap | undefined,
  classifierPath?: string | undefined,
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
        return deserialize(V1_profileModelSchema, json);
      case V1_ENUMERATION_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_enumerationModelSchema, json);
      case V1_MEASURE_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_measureModelSchema, json);
      case V1_CLASS_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_classModelSchema, json);
      case V1_ASSOCIATION_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_associationModelSchema, json);
      case V1_FUNCTION_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_functionModelSchema(plugins), json);
      case V1_FLAT_DATA_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_flatDataModelSchema, json);
      case V1_DATABASE_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_databaseModelSchema, json);
      case V1_MAPPING_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_mappingModelSchema(plugins), json);
      case V1_SERVICE_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_serviceModelSchema(plugins), json);
      case V1_EXECUTION_ENVIRONMENT_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_executionEnvModelSchema, json);
      case V1_PACKAGEABLE_CONNECTION_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_packageableConnectionModelSchema(plugins), json);
      case V1_PACKAGEABLE_RUNTIME_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_packageableRuntimeModelSchema, json);
      case V1_FILE_GENERATION_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_fileGenerationModelSchema, json);
      case V1_GENERATION_SPECIFICATION_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_generationSpecificationsModelSchema, json);
      case V1_SECTION_INDEX_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_sectionIndexModelSchema, json);
      case V1_DATA_ELEMENT_PROTOCOL_TYPE:
        return deserialize(V1_dataElementModelSchema(plugins), json);
      case V1_SNOWFLAKE_APP_TYPE:
        return deserialize(V1_snowflakeAppModelSchema(plugins), json);
      case V1_SNOWFLAKE_M2M_UDF_TYPE:
        return deserialize(V1_snowflakeM2MUdfModelSchema(plugins), json);
      case V1_HOSTED_SERVICE_TYPE:
        return deserialize(V1_HostedServiceModelSchema(plugins), json);
      case V1_MEM_SQL_TYPE:
        return deserialize(V1_MemSQLModelSchema(plugins), json);
      case V1_DATA_PRODUCT_ELEMENT_PROTOCOL_TYPE:
        // TODO: remove this once we have a proper icon for data product in the metamodel
        const adjustedJson = { ...json, icon: '' };
        return deserialize(V1_dataProductModelSchema, adjustedJson);
      case V1_INGEST_DEFINITION_TYPE:
        return V1_createIngestDef(name, packagePath, json);
      default: {
        for (const deserializer of extraElementProtocolDeserializers) {
          const protocol = deserializer(json, plugins);
          if (protocol) {
            return protocol;
          }
        }

        if (subtypeInfo && isString(json._type)) {
          if (subtypeInfo.functionActivatorSubtypes.includes(json._type)) {
            const protocol = deserialize(
              V1_INTERNAL__UnknownFunctionActivatorModelSchema,
              json,
            );
            protocol.content = json;
            return protocol;
          }
          if (subtypeInfo.storeSubtypes.includes(json._type)) {
            const protocol = new V1_INTERNAL__UnknownStore();
            protocol.name = name;
            protocol.package = packagePath;
            protocol.content = json;
            return protocol;
          }
        }

        if (classifierPathMappingMap && isString(json._type)) {
          if (classifierPathMappingMap.has(json._type)) {
            // Fall back to create unknown stub if supported in engine but not studio
            const protocol = new V1_INTERNAL__UnknownPackageableElement();
            protocol.name = name;
            protocol.package = packagePath;
            protocol.content = json;
            return protocol;
          }
        }

        // Fall back to create unknown stub if not supported in engine
        const protocol = new V1_INTERNAL__UnknownElement();
        protocol.name = name;
        protocol.package = packagePath;
        protocol.content = json;
        protocol.classifierPath = classifierPath ?? '';
        return protocol;
      }
    }
  } catch (error) {
    assertErrorThrown(error);
    error.message = `Can't deserialize element '${elementPath}': ${error.message}`;
    throw error;
  }
};
