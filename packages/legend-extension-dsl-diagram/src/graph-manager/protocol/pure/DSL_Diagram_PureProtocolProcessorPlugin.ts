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
import { V1_Diagram } from './v1/model/packageableElements/diagram/V1_DSL_Diagram_Diagram.js';
import { type PlainObject, assertType } from '@finos/legend-shared';
import { deserialize, serialize } from 'serializr';
import {
  V1_diagramModelSchema,
  V1_DIAGRAM_ELEMENT_PROTOCOL_TYPE,
} from './v1/transformation/pureProtocol/V1_DSL_Diagram_ProtocolHelper.js';
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
  V1_buildFullPath,
} from '@finos/legend-graph';
import { V1_transformDiagram } from './v1/transformation/pureGraph/V1_DSL_Diagram_TransformerHelper.js';
import { Diagram } from '../../../graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_Diagram.js';
import { getOwnDiagram } from '../../DSL_Diagram_GraphManagerHelper.js';
import {
  V1_buildClassView,
  V1_buildGeneralizationView,
  V1_buildPropertyView,
} from './v1/transformation/pureGraph/V1_DSL_Diagram_GraphBuilderHelper.js';

const DIAGRAM_ELEMENT_CLASSIFIER_PATH =
  'meta::pure::metamodel::diagram::Diagram';

export const V1_DSL_Diagram_PackageableElementPointerType = 'DIAGRAM';

export class DSL_Diagram_PureProtocolProcessorPlugin extends PureProtocolProcessorPlugin {
  constructor() {
    super(
      packageJson.extensions.pureProtocolProcessorPlugin,
      packageJson.version,
    );
  }

  override V1_getExtraElementBuilders(): V1_ElementBuilder<V1_PackageableElement>[] {
    return [
      new V1_ElementBuilder<V1_Diagram>({
        elementClassName: 'Diagram',
        _class: V1_Diagram,
        firstPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): PackageableElement => {
          assertType(elementProtocol, V1_Diagram);
          const element = new Diagram(elementProtocol.name);
          const path = V1_buildFullPath(
            elementProtocol.package,
            elementProtocol.name,
          );
          context.currentSubGraph.setOwnElementInExtension(
            path,
            element,
            Diagram,
          );
          return element;
        },
        secondPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): void => {
          assertType(elementProtocol, V1_Diagram);
          const path = V1_buildFullPath(
            elementProtocol.package,
            elementProtocol.name,
          );
          const element = getOwnDiagram(path, context.currentSubGraph);
          element.classViews = elementProtocol.classViews.map((classView) =>
            V1_buildClassView(classView, context, element),
          );
          element.propertyViews = elementProtocol.propertyViews.map(
            (propertyView) =>
              V1_buildPropertyView(propertyView, context, element),
          );
          element.generalizationViews = elementProtocol.generalizationViews.map(
            (generalizationView) =>
              V1_buildGeneralizationView(generalizationView, element, context),
          );
        },
      }),
    ];
  }

  override V1_getExtraElementClassifierPathGetters(): V1_ElementProtocolClassifierPathGetter[] {
    return [
      (elementProtocol: V1_PackageableElement): string | undefined => {
        if (elementProtocol instanceof V1_Diagram) {
          return DIAGRAM_ELEMENT_CLASSIFIER_PATH;
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
        if (elementProtocol instanceof V1_Diagram) {
          return serialize(V1_diagramModelSchema, elementProtocol);
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
        if (json._type === V1_DIAGRAM_ELEMENT_PROTOCOL_TYPE) {
          return deserialize(V1_diagramModelSchema, json);
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
        if (metamodel instanceof Diagram) {
          return V1_transformDiagram(metamodel);
        }
        return undefined;
      },
    ];
  }
}
