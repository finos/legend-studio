/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import packageJson from '../../../../package.json' with { type: 'json' };
import V1_SYSTEM_MODELS from './v1/V1_STO_GraphQL_SystemModels.json' with { type: 'json' };
import { V1_GraphQLStore } from './v1/model/packageableElements/store/graphQL/model/V1_STO_GraphQL_GraphQLStore.js';
import {
  type PlainObject,
  assertNonEmptyString,
  assertNonNullable,
  assertType,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { deserialize, serialize } from 'serializr';
import {
  V1_graphQLStoreModelSchema,
  V1_GRAPHQL_STORE_ELEMENT_PROTOCOL_TYPE,
  V1_rootGraphQLClassMappingModelSchema,
  V1_GRAPHQL_STORE_MAPPING_PROTOCOL_TYPE,
  V1_graphQLConnectionModelSchema,
  V1_GRAPHQL_STORE_CONNECTION_PROTOCOL_TYPE,
} from './v1/transformation/pureProtocol/V1_STO_GraphQL_ProtocolHelper.js';
import { getOwnGraphQLStore } from '../../STO_GraphQL_GraphManagerHelper.js';
import { GraphQLStore } from '../../../graph/metamodel/pure/model/packageableElements/store/graphQL/model/STO_GraphQL_GraphQLStore.js';
import {
  type PackageableElement,
  type V1_ElementProtocolClassifierPathGetter,
  type V1_ElementProtocolDeserializer,
  type V1_ElementProtocolSerializer,
  type V1_ElementTransformer,
  type V1_GraphBuilderContext,
  type V1_GraphTransformerContext,
  type V1_PackageableElement,
  type V1_PureModelContextData,
  type V1_ClassMapping,
  type V1_ClassMappingFirstPassBuilder,
  type V1_ClassMappingTransformer,
  type V1_ClassMappingDeserializer,
  type V1_ClassMappingSerializer,
  type Mapping,
  type InstanceSetImplementation,
  type Connection,
  type PackageableElementReference,
  type Store,
  type V1_Connection,
  type V1_ConnectionBuilder,
  type V1_ConnectionProtocolDeserializer,
  type V1_ConnectionProtocolSerializer,
  type V1_ConnectionTransformer,
  type DSL_Mapping_PureProtocolProcessorPlugin_Extension,
  PureProtocolProcessorPlugin,
  fromElementPathToMappingElementId,
  InferableMappingElementIdImplicitValue,
  InferableMappingElementRootExplicitValue,
  V1_ElementBuilder,
  V1_initPackageableElement,
  V1_buildFullPath,
} from '@finos/legend-graph';
import { V1_RootGraphQLClassMapping } from './v1/model/packageableElements/store/graphQL/mapping/V1_STO_GraphQL_RootGraphQLClassMapping.js';
import { RootGraphQLInstanceSetImplementation } from '../../../graph/metamodel/pure/model/packageableElements/store/graphQL/mapping/STO_GraphQL_RootGraphQLInstanceSetImplementation.js';
import { V1_GraphQLConnection } from './v1/model/packageableElements/store/graphQL/connection/V1_STO_GraphQL_GraphQLConnection.js';
import { V1_resolveGraphQLStore } from './v1/transformation/pureGraph/V1_STO_GraphQL_GraphBuilderHelper.js';
import { GraphQLConnection } from '../../../graph/metamodel/pure/model/packageableElements/store/graphQL/connection/STO_GraphQL_GraphQLConnection.js';

const GRAPHQL_STORE_ELEMENT_CLASSIFIER_PATH =
  'meta::external::store::graphQL::metamodel::pure::GraphQLStore';

export class STO_GraphQL_PureProtocolProcessorPlugin
  extends PureProtocolProcessorPlugin
  implements DSL_Mapping_PureProtocolProcessorPlugin_Extension
{
  constructor() {
    super(
      packageJson.extensions.pureProtocolProcessorPlugin,
      packageJson.version,
    );
  }

  override V1_getExtraSystemModels(): PlainObject<V1_PureModelContextData>[] {
    return [V1_SYSTEM_MODELS];
  }

  override V1_getExtraElementBuilders(): V1_ElementBuilder<V1_PackageableElement>[] {
    return [
      new V1_ElementBuilder<V1_GraphQLStore>({
        elementClassName: GraphQLStore.name,
        _class: V1_GraphQLStore,
        firstPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): PackageableElement => {
          assertType(elementProtocol, V1_GraphQLStore);
          const element = new GraphQLStore(elementProtocol.name);
          const path = V1_buildFullPath(
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
          assertType(elementProtocol, V1_GraphQLStore);
          const path = V1_buildFullPath(
            elementProtocol.package,
            elementProtocol.name,
          );
          const element = getOwnGraphQLStore(path, context.currentSubGraph);
          element.schema = elementProtocol.schema;
        },
      }),
    ];
  }

  override V1_getExtraElementClassifierPathGetters(): V1_ElementProtocolClassifierPathGetter[] {
    return [
      (elementProtocol: V1_PackageableElement): string | undefined => {
        if (elementProtocol instanceof V1_GraphQLStore) {
          return GRAPHQL_STORE_ELEMENT_CLASSIFIER_PATH;
        }
        return undefined;
      },
    ];
  }

  override V1_getExtraElementProtocolSerializers(): V1_ElementProtocolSerializer[] {
    return [
      (
        elementProtocol: V1_PackageableElement,
      ): PlainObject<V1_PackageableElement> | undefined => {
        if (elementProtocol instanceof V1_GraphQLStore) {
          return serialize(V1_graphQLStoreModelSchema, elementProtocol);
        }
        return undefined;
      },
    ];
  }

  override V1_getExtraElementProtocolDeserializers(): V1_ElementProtocolDeserializer[] {
    return [
      (
        json: PlainObject<V1_PackageableElement>,
      ): V1_PackageableElement | undefined => {
        if (json._type === V1_GRAPHQL_STORE_ELEMENT_PROTOCOL_TYPE) {
          return deserialize(V1_graphQLStoreModelSchema, json);
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
        if (metamodel instanceof GraphQLStore) {
          const protocol = new V1_GraphQLStore();
          V1_initPackageableElement(protocol, metamodel);
          protocol.name = metamodel.name;
          protocol.package = metamodel.package?.path ?? '';
          protocol.schema = metamodel.schema;
          return protocol;
        }
        return undefined;
      },
    ];
  }

  V1_getExtraClassMappingFirstPassBuilders(): V1_ClassMappingFirstPassBuilder[] {
    return [
      (
        classMapping: V1_ClassMapping,
        context: V1_GraphBuilderContext,
        parent: Mapping,
      ): InstanceSetImplementation | undefined => {
        if (classMapping instanceof V1_RootGraphQLClassMapping) {
          assertNonEmptyString(
            classMapping.class,
            `GraphQL store class mapping 'class' is missing`,
          );
          assertNonNullable(
            classMapping.root,
            `GraphQL store class mapping 'root' field is missing`,
          );
          const targetClass = context.resolveClass(classMapping.class);
          const rootGraphQLInstanceSetImplementation =
            new RootGraphQLInstanceSetImplementation(
              InferableMappingElementIdImplicitValue.create(
                classMapping.id ??
                  fromElementPathToMappingElementId(targetClass.value.path),
                targetClass.value.path,
                classMapping.id,
              ),
              parent,
              targetClass,
              InferableMappingElementRootExplicitValue.create(
                classMapping.root,
              ),
            );
          rootGraphQLInstanceSetImplementation.storePath =
            classMapping.storePath;
          rootGraphQLInstanceSetImplementation.typeName = classMapping.typeName;
          rootGraphQLInstanceSetImplementation.bindingPath =
            classMapping.bindingPath;
          rootGraphQLInstanceSetImplementation.joinAccessorQualifiedProperty =
            classMapping.joinAccessorQualifiedProperty;
          return rootGraphQLInstanceSetImplementation;
        }
        return undefined;
      },
    ];
  }

  V1_getExtraClassMappingSerializers(): V1_ClassMappingSerializer[] {
    return [
      (value) => {
        if (value instanceof V1_RootGraphQLClassMapping) {
          return serialize(V1_rootGraphQLClassMappingModelSchema, value);
        }
        return undefined;
      },
    ];
  }

  V1_getExtraClassMappingDeserializers(): V1_ClassMappingDeserializer[] {
    return [
      (json) => {
        if (json._type === V1_GRAPHQL_STORE_MAPPING_PROTOCOL_TYPE) {
          return deserialize(V1_rootGraphQLClassMappingModelSchema, json);
        }
        return undefined;
      },
    ];
  }

  V1_getExtraClassMappingTransformers(): V1_ClassMappingTransformer[] {
    return [
      (
        setImplementation: InstanceSetImplementation,
      ): V1_ClassMapping | undefined => {
        if (setImplementation instanceof RootGraphQLInstanceSetImplementation) {
          const classMapping = new V1_RootGraphQLClassMapping();
          classMapping.class =
            setImplementation.class.valueForSerialization ?? '';
          classMapping.id = setImplementation.id.valueForSerialization;
          classMapping.root = setImplementation.root.valueForSerialization;
          classMapping.storePath = setImplementation.storePath;
          classMapping.typeName = setImplementation.typeName;
          classMapping.bindingPath = setImplementation.bindingPath;
          classMapping.joinAccessorQualifiedProperty =
            setImplementation.joinAccessorQualifiedProperty;
          return classMapping;
        }
        return undefined;
      },
    ];
  }

  V1_getExtraConnectionBuilders(): V1_ConnectionBuilder[] {
    return [
      (
        connection: V1_Connection,
        context: V1_GraphBuilderContext,
        store?: PackageableElementReference<Store> | undefined,
      ): Connection | undefined => {
        if (connection instanceof V1_GraphQLConnection) {
          const Store = !store
            ? V1_resolveGraphQLStore(
                guaranteeNonNullable(
                  connection.store,
                  `GraphQL connection 'store' field is missing`,
                ),
                context,
              )
            : connection.store
              ? V1_resolveGraphQLStore(connection.store, context)
              : ((): PackageableElementReference<GraphQLStore> => {
                  assertType(
                    store.value,
                    GraphQLStore,
                    'GraphQL connection must have a GraphQLStore as its store',
                  );
                  return store as PackageableElementReference<GraphQLStore>;
                })();
          const graphQLConnection = new GraphQLConnection(Store);
          graphQLConnection.url = connection.url;
          graphQLConnection.authenticationSpecification =
            connection.authenticationSpecification;
          return graphQLConnection;
        }
        return undefined;
      },
    ];
  }

  V1_getExtraConnectionTransformers(): V1_ConnectionTransformer[] {
    return [
      (metamodel: Connection): V1_Connection | undefined => {
        if (metamodel instanceof GraphQLConnection) {
          const connection = new V1_GraphQLConnection();
          connection.store = metamodel.store.valueForSerialization ?? '';
          connection.url = metamodel.url;
          connection.authenticationSpecification =
            metamodel.authenticationSpecification;
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
        if (connectionProtocol instanceof V1_GraphQLConnection) {
          return serialize(V1_graphQLConnectionModelSchema, connectionProtocol);
        }
        return undefined;
      },
    ];
  }

  V1_getExtraConnectionProtocolDeserializers(): V1_ConnectionProtocolDeserializer[] {
    return [
      (json: PlainObject<V1_Connection>): V1_Connection | undefined => {
        if (json._type === V1_GRAPHQL_STORE_CONNECTION_PROTOCOL_TYPE) {
          return deserialize(V1_graphQLConnectionModelSchema, json);
        }
        return undefined;
      },
    ];
  }
}
