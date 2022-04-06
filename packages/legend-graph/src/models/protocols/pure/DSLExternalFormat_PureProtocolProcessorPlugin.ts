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

import packageJson from '../../../../package.json';
import {
  type PlainObject,
  assertType,
  guaranteeNonEmptyString,
  assertNonNullable,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { deserialize, serialize } from 'serializr';
import type { PureModel } from '../../../graph/PureModel';
import {
  getBinding,
  getSchemaSet,
} from '../../../graphManager/DSLExternalFormat_GraphManagerHelper';
import type { Connection } from '../../metamodels/pure/packageableElements/connection/Connection';
import type { Mapping } from '../../metamodels/pure/packageableElements/mapping/Mapping';
import type { PackageableElement } from '../../metamodels/pure/packageableElements/PackageableElement';
import {
  PackageableElementReference,
  toOptionalPackageableElementReference,
} from '../../metamodels/pure/packageableElements/PackageableElementReference';
import type { Runtime } from '../../metamodels/pure/packageableElements/runtime/Runtime';
import { ExternalFormatConnection } from '../../metamodels/pure/packageableElements/externalFormat/connection/DSLExternalFormat_ExternalFormatConnection';
import { UrlStream } from '../../metamodels/pure/packageableElements/externalFormat/connection/DSLExternalFormat_UrlStream';
import { Schema } from '../../metamodels/pure/packageableElements/externalFormat/schemaSet/DSLExternalFormat_Schema';
import { SchemaSet } from '../../metamodels/pure/packageableElements/externalFormat/schemaSet/DSLExternalFormat_SchemaSet';
import { Binding } from '../../metamodels/pure/packageableElements/externalFormat/store/DSLExternalFormat_Binding';
import { ModelUnit } from '../../metamodels/pure/packageableElements/externalFormat/store/DSLExternalFormat_ModelUnit';
import type { Store } from '../../metamodels/pure/packageableElements/store/Store';
import type {
  DSLMapping_PureProtocolProcessorPlugin_Extension,
  V1_ConnectionBuilder,
  V1_ConnectionProtocolDeserializer,
  V1_ConnectionProtocolSerializer,
  V1_ConnectionTransformer,
} from './DSLMapping_PureProtocolProcessorPlugin_Extension';
import {
  type V1_ElementProtocolClassifierPathGetter,
  type V1_ElementProtocolDeserializer,
  type V1_ElementProtocolSerializer,
  type V1_ElementTransformer,
  type V1_ExecutionInputGetter,
  PureProtocolProcessorPlugin,
} from './PureProtocolProcessorPlugin';
import type { V1_PureModelContextData } from './v1/model/context/V1_PureModelContextData';
import type { V1_Connection } from './v1/model/packageableElements/connection/V1_Connection';
import { V1_ExternalFormatConnection } from './v1/model/packageableElements/externalFormat/connection/V1_DSLExternalFormat_ExternalFormatConnection';
import { V1_UrlStream } from './v1/model/packageableElements/externalFormat/connection/V1_DSLExternalFormat_UrlStream';
import { V1_Schema } from './v1/model/packageableElements/externalFormat/schemaSet/V1_DSLExternalFormat_Schema';
import { V1_SchemaSet } from './v1/model/packageableElements/externalFormat/schemaSet/V1_DSLExternalFormat_SchemaSet';
import { V1_Binding } from './v1/model/packageableElements/externalFormat/store/V1_DSLExternalFormat_Binding';
import { V1_ModelUnit } from './v1/model/packageableElements/externalFormat/store/V1_DSLExternalFormat_ModelUnit';
import type { V1_PackageableElement } from './v1/model/packageableElements/V1_PackageableElement';
import {
  V1_initPackageableElement,
  V1_transformElementReference,
} from './v1/transformation/pureGraph/from/V1_CoreTransformerHelper';
import type { V1_GraphTransformerContext } from './v1/transformation/pureGraph/from/V1_GraphTransformerContext';
import {
  V1_resolveBinding,
  V1_resolveSchemaSet,
} from './v1/transformation/pureGraph/to/V1_DSLExternalFormat_GraphBuilderHelper';
import { V1_ElementBuilder } from './v1/transformation/pureGraph/to/V1_ElementBuilder';
import type { V1_GraphBuilderContext } from './v1/transformation/pureGraph/to/V1_GraphBuilderContext';
import {
  V1_bindingModelSchema,
  V1_BINDING_ELEMENT_PROTOCOL_TYPE,
  V1_externalFormatConnectionModelSchema,
  V1_EXTERNAL_FORMAT_CONNECTION_ELEMENT_PROTOCOL_TYPE,
  V1_schemaSetModelSchema,
  V1_SCHEMA_SET_ELEMENT_PROTOCOL_TYPE,
} from './v1/transformation/pureProtocol/serializationHelpers/V1_DSLExternalFormat_ProtocolHelper';

const BINDING_ELEMENT_CLASSIFIER_PATH =
  'meta::external::shared::format::binding::Binding';
const SCHEMA_SET_ELEMENT_CLASSIFIER_PATH =
  'meta::external::shared::format::metamodel::SchemaSet';

export class DSLExternalFormat_PureProtocolProcessorPlugin
  extends PureProtocolProcessorPlugin
  implements DSLMapping_PureProtocolProcessorPlugin_Extension
{
  constructor() {
    super(
      packageJson.extensions.dsl_external_format_pureProtocolProcessorPlugin,
      packageJson.version,
    );
  }

  override V1_getExtraElementBuilders(): V1_ElementBuilder<V1_PackageableElement>[] {
    return [
      new V1_ElementBuilder<V1_Binding>({
        elementClassName: Binding.name,
        _class: V1_Binding,
        firstPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): PackageableElement => {
          assertType(elementProtocol, V1_Binding);
          const element = new Binding(elementProtocol.name);
          const path = context.currentSubGraph.buildPath(
            elementProtocol.package,
            elementProtocol.name,
          );
          context.currentSubGraph.setOwnStore(path, element);
          return element;
        },
        secondPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): void => {
          assertType(elementProtocol, V1_Binding);
          const path = context.graph.buildPath(
            elementProtocol.package,
            elementProtocol.name,
          );
          const element = getBinding(path, context.graph);
          const schemaSet = elementProtocol.schemaSet
            ? V1_resolveSchemaSet(elementProtocol.schemaSet, context)
            : undefined;
          element.schemaId = elementProtocol.schemaId;
          element.schemaSet = toOptionalPackageableElementReference(schemaSet);

          element.contentType = guaranteeNonEmptyString(
            elementProtocol.contentType,
            `Binding 'contentType' '${elementProtocol.contentType}' is not supported`,
          );
          assertNonNullable(
            elementProtocol.modelUnit,
            `Binding 'modelUnit' field is missing`,
          );
          const modelUnit = new ModelUnit();
          modelUnit.packageableElementIncludes =
            elementProtocol.modelUnit.packageableElementIncludes.map((e) =>
              context.resolveElement(e, true),
            );
          modelUnit.packageableElementExcludes =
            elementProtocol.modelUnit.packageableElementExcludes.map((e) =>
              context.resolveElement(e, true),
            );
          element.modelUnit = modelUnit;
        },
      }),
      new V1_ElementBuilder<V1_SchemaSet>({
        elementClassName: SchemaSet.name,
        _class: V1_SchemaSet,
        firstPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): PackageableElement => {
          assertType(elementProtocol, V1_SchemaSet);
          const element = new SchemaSet(elementProtocol.name);
          const path = context.currentSubGraph.buildPath(
            elementProtocol.package,
            elementProtocol.name,
          );
          context.currentSubGraph.setOwnElementInExtension(
            path,
            element,
            SchemaSet,
          );
          return element;
        },
        secondPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): void => {
          assertType(elementProtocol, V1_SchemaSet);
          const path = context.graph.buildPath(
            elementProtocol.package,
            elementProtocol.name,
          );
          const element = getSchemaSet(path, context.graph);
          element.format = guaranteeNonEmptyString(elementProtocol.format);
          element.schemas = elementProtocol.schemas.map((schema) => {
            const schemaElement = new Schema();
            schemaElement.content = guaranteeNonEmptyString(
              schema.content,
              `Schema 'content' field is missing or empty`,
            );
            schemaElement.id = schema.id;
            schemaElement.location = schema.location;
            return schemaElement;
          });
        },
      }),
    ];
  }

  override V1_getExtraElementClassifierPathGetters(): V1_ElementProtocolClassifierPathGetter[] {
    return [
      (elementProtocol: V1_PackageableElement): string | undefined => {
        if (elementProtocol instanceof V1_Binding) {
          return BINDING_ELEMENT_CLASSIFIER_PATH;
        } else if (elementProtocol instanceof V1_SchemaSet) {
          return SCHEMA_SET_ELEMENT_CLASSIFIER_PATH;
        }
        return undefined;
      },
    ];
  }

  override V1_getExtraElementProtocolSerializers(): V1_ElementProtocolSerializer[] {
    return [
      (
        elementProtocol: V1_PackageableElement,
        plugins: PureProtocolProcessorPlugin[],
      ): PlainObject<V1_PackageableElement> | undefined => {
        if (elementProtocol instanceof V1_Binding) {
          return serialize(V1_bindingModelSchema, elementProtocol);
        } else if (elementProtocol instanceof V1_SchemaSet) {
          return serialize(V1_schemaSetModelSchema, elementProtocol);
        }
        return undefined;
      },
    ];
  }

  override V1_getExtraElementProtocolDeserializers(): V1_ElementProtocolDeserializer[] {
    return [
      (
        json: PlainObject<V1_PackageableElement>,
        plugins: PureProtocolProcessorPlugin[],
      ): V1_PackageableElement | undefined => {
        if (json._type === V1_BINDING_ELEMENT_PROTOCOL_TYPE) {
          return deserialize(V1_bindingModelSchema, json);
        } else if (json._type === V1_SCHEMA_SET_ELEMENT_PROTOCOL_TYPE) {
          return deserialize(V1_schemaSetModelSchema, json);
        }
        return undefined;
      },
    ];
  }

  override V1_getExtraElementTransformers(): V1_ElementTransformer[] {
    return [
      (
        metamodel: PackageableElement,
        context: V1_GraphTransformerContext,
      ): V1_PackageableElement | undefined => {
        if (metamodel instanceof Binding) {
          const protocol = new V1_Binding();
          V1_initPackageableElement(protocol, metamodel);
          protocol.name = metamodel.name;
          protocol.package = metamodel.package?.fullPath ?? '';
          protocol.schemaId = metamodel.schemaId;
          protocol.schemaSet = metamodel.schemaSet.valueForSerialization;
          protocol.contentType = metamodel.contentType;
          const modelUnit = new V1_ModelUnit();
          modelUnit.packageableElementExcludes =
            metamodel.modelUnit.packageableElementExcludes.map((path) =>
              path instanceof PackageableElementReference
                ? path.valueForSerialization ?? ''
                : path,
            );
          modelUnit.packageableElementIncludes =
            metamodel.modelUnit.packageableElementIncludes.map((path) =>
              path instanceof PackageableElementReference
                ? path.valueForSerialization ?? ''
                : path,
            );
          protocol.modelUnit = modelUnit;
          protocol.includedStores = [];
          return protocol;
        } else if (metamodel instanceof SchemaSet) {
          const protocol = new V1_SchemaSet();
          V1_initPackageableElement(protocol, metamodel);
          protocol.name = metamodel.name;
          protocol.package = metamodel.package?.fullPath ?? '';
          protocol.format = metamodel.format;
          protocol.schemas = metamodel.schemas.map((schema) => {
            const schemaProtocol = new V1_Schema();
            schemaProtocol.content = schema.content;
            schemaProtocol.id = schema.id;
            schemaProtocol.location = schema.location;
            return schemaProtocol;
          });
          return protocol;
        }
        return undefined;
      },
    ];
  }

  override V1_getExtraExecutionInputGetters(): V1_ExecutionInputGetter[] {
    return [
      (
        graph: PureModel,
        mapping: Mapping,
        runtime: Runtime,
        protocolGraph: V1_PureModelContextData,
      ): V1_PackageableElement[] =>
        protocolGraph.elements.filter(
          (element) => element instanceof V1_SchemaSet,
        ),
    ];
  }

  override V1_getExtraSourceInformationKeys(): string[] {
    return ['contentSourceInformation'];
  }

  V1_getExtraConnectionBuilders(): V1_ConnectionBuilder[] {
    return [
      (
        connection: V1_Connection,
        context: V1_GraphBuilderContext,
        store?: PackageableElementReference<Store> | undefined,
      ): Connection | undefined => {
        if (connection instanceof V1_ExternalFormatConnection) {
          const Store = !store
            ? V1_resolveBinding(
                guaranteeNonNullable(
                  connection.store,
                  `External format connection 'store' field is missing`,
                ),
                context,
              )
            : connection.store
            ? V1_resolveBinding(connection.store, context)
            : ((): PackageableElementReference<Binding> => {
                assertType(
                  store.value,
                  Binding,
                  `External format connection store must be a Binding`,
                );
                return store as PackageableElementReference<Binding>;
              })();
          const externalFormatConnection = new ExternalFormatConnection(Store);
          assertNonNullable(
            connection.externalSource,
            `External format connection 'externalSource' field is missing`,
          );
          const urlStream = new UrlStream();
          urlStream.url = guaranteeNonEmptyString(
            connection.externalSource.url,
            `URL stream 'url' field is missing or empty`,
          );
          externalFormatConnection.externalSource = urlStream;
          return externalFormatConnection;
        }
        return undefined;
      },
    ];
  }

  V1_getExtraConnectionTransformers(): V1_ConnectionTransformer[] {
    return [
      (
        metamodel: Connection,
        context: V1_GraphTransformerContext,
      ): V1_Connection | undefined => {
        if (metamodel instanceof ExternalFormatConnection) {
          const connection = new V1_ExternalFormatConnection();
          connection.store = V1_transformElementReference(metamodel.store);
          const urlStream = new V1_UrlStream();
          urlStream.url = metamodel.externalSource.url;
          connection.externalSource = urlStream;
          return connection;
        }
        return undefined;
      },
    ];
  }

  V1_getExtraConnectionProtocolSerializers(): V1_ConnectionProtocolSerializer[] {
    return [
      (
        connectionProtocol: V1_Connection,
      ): PlainObject<V1_Connection> | undefined => {
        if (connectionProtocol instanceof V1_ExternalFormatConnection) {
          return serialize(
            V1_externalFormatConnectionModelSchema,
            connectionProtocol,
          );
        }
        return undefined;
      },
    ];
  }

  V1_getExtraConnectionProtocolDeserializers(): V1_ConnectionProtocolDeserializer[] {
    return [
      (json: PlainObject<V1_Connection>): V1_Connection | undefined => {
        if (
          json._type === V1_EXTERNAL_FORMAT_CONNECTION_ELEMENT_PROTOCOL_TYPE
        ) {
          return deserialize(V1_externalFormatConnectionModelSchema, json);
        }
        return undefined;
      },
    ];
  }
}
