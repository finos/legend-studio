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
  V1_ElementBuilder,
  PureProtocolProcessorPlugin,
  V1_initPackageableElement,
} from '@finos/legend-studio';
import { V1_Text } from './v1/model/packageableElements/V1_Text';
import type { PlainObject } from '@finos/legend-studio-shared';
import { assertType } from '@finos/legend-studio-shared';
import type {
  PluginManager,
  PackageableElement,
  V1_PackageableElement,
  V1_ElementProtocolDeserializer,
  V1_ElementProtocolSerializer,
  V1_ElementTransformer,
  V1_GraphBuilderContext,
  V1_ElementProtocolClassifierPathGetter,
  V1_GraphTransformerContext,
} from '@finos/legend-studio';
import { deserialize, serialize } from 'serializr';
import {
  V1_textModelSchema,
  V1_TEXT_ELEMENT_PROTOCOL_TYPE,
} from './v1/transformation/pureProtocol/V1_DSLText_ProtocolHelper';
import { getText } from '../../metamodels/pure/graph/DSLText_GraphManagerHelper';
import {
  Text,
  TEXT_TYPE,
} from '../../metamodels/pure/model/packageableElements/Text';

const TEXT_ELEMENT_CLASSIFIER_PATH = 'meta::pure::metamodel::text::Text';

export class DSLText_PureProtocolProcessorPlugin extends PureProtocolProcessorPlugin {
  constructor() {
    super(
      `${packageJson.pluginPrefix}-pure-protocol-processor`,
      packageJson.version,
    );
  }

  install(pluginManager: PluginManager): void {
    pluginManager.registerPureProtocolProcessorPlugin(this);
  }

  override V1_getExtraElementBuilders(): V1_ElementBuilder<V1_PackageableElement>[] {
    return [
      new V1_ElementBuilder<V1_Text>({
        elementClassName: 'Text',
        _class: V1_Text,
        firstPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): PackageableElement => {
          assertType(elementProtocol, V1_Text);
          const element = new Text(elementProtocol.name);
          const path = context.currentSubGraph.buildPackageString(
            elementProtocol.package,
            elementProtocol.name,
          );
          context.currentSubGraph.setElementInExtension(path, element, Text);
          return element;
        },
        secondPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): void => {
          assertType(elementProtocol, V1_Text);
          const path = context.graph.buildPackageString(
            elementProtocol.package,
            elementProtocol.name,
          );
          const element = getText(path, context.graph);
          element.type =
            Object.values(TEXT_TYPE).find(
              (type) => type === elementProtocol.type,
            ) ?? TEXT_TYPE.PLAIN_TEXT;
          element.content = elementProtocol.content;
        },
      }),
    ];
  }

  override V1_getExtraElementClassifierPathGetters(): V1_ElementProtocolClassifierPathGetter[] {
    return [
      (elementProtocol: V1_PackageableElement): string | undefined => {
        if (elementProtocol instanceof V1_Text) {
          return TEXT_ELEMENT_CLASSIFIER_PATH;
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
        if (elementProtocol instanceof V1_Text) {
          return serialize(V1_textModelSchema, elementProtocol);
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
        if (json._type === V1_TEXT_ELEMENT_PROTOCOL_TYPE) {
          return deserialize(V1_textModelSchema, json);
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
        if (metamodel instanceof Text) {
          const protocol = new V1_Text();
          V1_initPackageableElement(protocol, metamodel);
          protocol.name = metamodel.name;
          protocol.package = metamodel.package?.fullPath ?? '';
          protocol.content = metamodel.content;
          protocol.type = metamodel.type;
          return protocol;
        }
        return undefined;
      },
    ];
  }
}
