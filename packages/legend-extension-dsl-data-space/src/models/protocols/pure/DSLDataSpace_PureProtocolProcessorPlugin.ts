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
import { V1_DataSpace } from './v1/model/packageableElements/dataSpace/V1_DataSpace';
import type { PlainObject } from '@finos/legend-shared';
import { isNonNullable, assertType } from '@finos/legend-shared';
import { deserialize, serialize } from 'serializr';
import {
  V1_dataSpaceModelSchema,
  V1_DATA_SPACE_ELEMENT_PROTOCOL_TYPE,
} from './v1/transformation/pureProtocol/V1_DSLDataSpace_ProtocolHelper';
import { getDataSpace } from '../../../graphManager/DSLDataSpace_GraphManagerHelper';
import { DataSpace } from '../../metamodels/pure/model/packageableElements/dataSpace/DataSpace';
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
  V1_buildTaggedValue,
  V1_transformStereotype,
  V1_transformTaggedValue,
  PureProtocolProcessorPlugin,
  V1_ElementBuilder,
  V1_initPackageableElement,
} from '@finos/legend-graph';

const DATA_SPACE_ELEMENT_CLASSIFIER_PATH =
  'meta::pure::metamodel::dataSpace::DataSpace';

export class DSLDataSpace_PureProtocolProcessorPlugin extends PureProtocolProcessorPlugin {
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
      new V1_ElementBuilder<V1_DataSpace>({
        elementClassName: 'DataSpace',
        _class: V1_DataSpace,
        firstPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): PackageableElement => {
          assertType(elementProtocol, V1_DataSpace);
          const element = new DataSpace(elementProtocol.name);
          const path = context.currentSubGraph.buildPath(
            elementProtocol.package,
            elementProtocol.name,
          );
          context.currentSubGraph.setOwnElementInExtension(
            path,
            element,
            DataSpace,
          );
          return element;
        },
        secondPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): void => {
          assertType(elementProtocol, V1_DataSpace);
          const path = context.graph.buildPath(
            elementProtocol.package,
            elementProtocol.name,
          );
          const element = getDataSpace(path, context.graph);
          element.stereotypes = elementProtocol.stereotypes
            .map((stereotype) => context.resolveStereotype(stereotype))
            .filter(isNonNullable);
          element.taggedValues = elementProtocol.taggedValues
            .map((taggedValue) => V1_buildTaggedValue(taggedValue, context))
            .filter(isNonNullable);
          element.groupId = elementProtocol.groupId;
          element.artifactId = elementProtocol.artifactId;
          element.versionId = elementProtocol.versionId;
          element.mapping = elementProtocol.mapping;
          element.runtime = elementProtocol.runtime;
          element.description = elementProtocol.description;
          element.supportEmail = elementProtocol.supportEmail;
          element.diagrams = elementProtocol.diagrams ?? [];
        },
      }),
    ];
  }

  override V1_getExtraElementClassifierPathGetters(): V1_ElementProtocolClassifierPathGetter[] {
    return [
      (elementProtocol: V1_PackageableElement): string | undefined => {
        if (elementProtocol instanceof V1_DataSpace) {
          return DATA_SPACE_ELEMENT_CLASSIFIER_PATH;
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
        if (elementProtocol instanceof V1_DataSpace) {
          return serialize(V1_dataSpaceModelSchema, elementProtocol);
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
        if (json._type === V1_DATA_SPACE_ELEMENT_PROTOCOL_TYPE) {
          return deserialize(V1_dataSpaceModelSchema, json);
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
        if (metamodel instanceof DataSpace) {
          const protocol = new V1_DataSpace();
          V1_initPackageableElement(protocol, metamodel);
          protocol.stereotypes = metamodel.stereotypes.map(
            V1_transformStereotype,
          );
          protocol.taggedValues = metamodel.taggedValues.map(
            V1_transformTaggedValue,
          );
          protocol.groupId = metamodel.groupId;
          protocol.artifactId = metamodel.artifactId;
          protocol.versionId = metamodel.versionId;
          protocol.mapping = metamodel.mapping;
          protocol.runtime = metamodel.runtime;
          protocol.description = metamodel.description;
          protocol.supportEmail = metamodel.supportEmail;
          protocol.diagrams = metamodel.diagrams;
          return protocol;
        }
        return undefined;
      },
    ];
  }
}
