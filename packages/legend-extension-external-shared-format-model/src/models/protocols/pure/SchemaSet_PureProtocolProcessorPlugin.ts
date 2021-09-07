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
import { V1_SchemaSet } from './v1/model/packageableElements/V1_SchemaSet';
import type { PlainObject } from '@finos/legend-shared';
import { assertType } from '@finos/legend-shared';
import { deserialize, serialize } from 'serializr';
import {
  V1_schemaSetModelSchema,
  V1_SCHEMA_SET_ELEMENT_PROTOCOL_TYPE,
} from './v1/transformation/pureProtocol/V1_SchemaSet_ProtocolHelper';
import { getSchemaSet } from '../../../graphManager/GraphManagerHelper';
import type {
  GraphPluginManager,
  PackageableElement,
  V1_ElementProtocolClassifierPathGetter,
  V1_ElementProtocolDeserializer,
  V1_ElementProtocolSerializer,
  V1_ElementTransformer,
  V1_GraphBuilderContext,
  V1_GraphTransformerContext,
  V1_PackageableElement,
} from '@finos/legend-graph';
import {
  PureProtocolProcessorPlugin,
  V1_ElementBuilder,
  V1_initPackageableElement,
} from '@finos/legend-graph';
import { SchemaSet } from '../../metamodels/pure/model/packageableElements/SchemaSet';

const SCHEMA_SET_ELEMENT_CLASSIFIER_PATH =
  'meta::external::shared::format::metamodel::SchemaSet';

export class SchemaSet_PureProtocolProcessorPlugin extends PureProtocolProcessorPlugin {
  constructor() {
    super(
      packageJson.extensions.pureProtocolProcessorPlugin,
      packageJson.version,
    );
  }

  install(pluginManager: GraphPluginManager): void {
    pluginManager.registerPureProtocolProcessorPlugin(this);
  }

  override V1_getExtraElementBuilders(): V1_ElementBuilder<V1_PackageableElement>[] {
    return [
      new V1_ElementBuilder<V1_SchemaSet>({
        elementClassName: 'externalFormatSchemaSet',
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
          element.format = elementProtocol.format;
          element.schemas = elementProtocol.schemas;
        },
      }),
    ];
  }

  override V1_getExtraElementClassifierPathGetters(): V1_ElementProtocolClassifierPathGetter[] {
    return [
      (elementProtocol: V1_PackageableElement): string | undefined => {
        if (elementProtocol instanceof V1_SchemaSet) {
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
      ): PlainObject<V1_PackageableElement> | undefined => {
        if (elementProtocol instanceof V1_SchemaSet) {
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
      ): V1_PackageableElement | undefined => {
        if (json._type === V1_SCHEMA_SET_ELEMENT_PROTOCOL_TYPE) {
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
        if (metamodel instanceof SchemaSet) {
          const protocol = new V1_SchemaSet();
          V1_initPackageableElement(protocol, metamodel);
          protocol.name = metamodel.name;
          protocol.package = metamodel.package?.fullPath ?? '';
          protocol.format = metamodel.format;
          protocol.schemas = metamodel.schemas;
          return protocol;
        }
        return undefined;
      },
    ];
  }
}
