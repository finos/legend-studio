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

import packageJson from '../../../../package.json' with { type: 'json' };
import { V1_Text } from './v1/model/packageableElements/text/V1_DSL_Text_Text.js';
import {
  type PlainObject,
  guaranteeNonNullable,
  assertType,
} from '@finos/legend-shared';
import { deserialize, serialize } from 'serializr';
import {
  V1_textModelSchema,
  V1_TEXT_ELEMENT_PROTOCOL_TYPE,
} from './v1/transformation/pureProtocol/V1_DSL_Text_ProtocolHelper.js';
import { getOwnText } from '../../DSL_Text_GraphManagerHelper.js';
import { Text } from '../../../graph/metamodel/pure/model/packageableElements/text/DSL_Text_Text.js';
import {
  type PackageableElement,
  type V1_ElementProtocolClassifierPathGetter,
  type V1_ElementProtocolDeserializer,
  type V1_ElementProtocolSerializer,
  type V1_ElementTransformer,
  type V1_GraphBuilderContext,
  type V1_GraphTransformerContext,
  type V1_PackageableElement,
  PureProtocolProcessorPlugin,
  V1_ElementBuilder,
  V1_initPackageableElement,
  V1_buildFullPath,
} from '@finos/legend-graph';

const TEXT_ELEMENT_CLASSIFIER_PATH = 'meta::pure::metamodel::text::Text';

export class DSL_Text_PureProtocolProcessorPlugin extends PureProtocolProcessorPlugin {
  constructor() {
    super(
      packageJson.extensions.pureProtocolProcessorPlugin,
      packageJson.version,
    );
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
          const path = V1_buildFullPath(
            elementProtocol.package,
            elementProtocol.name,
          );
          context.currentSubGraph.setOwnElementInExtension(path, element, Text);
          return element;
        },
        secondPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): void => {
          assertType(elementProtocol, V1_Text);
          const path = V1_buildFullPath(
            elementProtocol.package,
            elementProtocol.name,
          );
          const element = getOwnText(path, context.currentSubGraph);
          element.type = elementProtocol.type;
          element.content = guaranteeNonNullable(
            elementProtocol.content,
            `Text element 'content' field is missing`,
          );
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
        plugins: PureProtocolProcessorPlugin[],
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
        plugins: PureProtocolProcessorPlugin[],
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
          protocol.package = metamodel.package?.path ?? '';
          protocol.content = metamodel.content;
          protocol.type = metamodel.type;
          return protocol;
        }
        return undefined;
      },
    ];
  }
}
