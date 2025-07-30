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
import { type PlainObject, assertType } from '@finos/legend-shared';
import {
  V1_DataQualityClassValidationsConfiguration,
  V1_DataQualityServiceValidationsConfiguration,
  V1_DataQualityRelationValidationsConfiguration,
  V1_DataQualityValidationsConfiguration,
} from './v1/V1_DataQualityValidationConfiguration.js';
import {
  DataQualityClassValidationsConfiguration,
  DataQualityServiceValidationConfiguration,
  DataQualityRelationValidationConfiguration,
} from '../../../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';
import {
  V1_DATA_QUALITY_PROTOCOL_TYPE,
  V1_DATA_QUALITY_SERVICE_PROTOCOL_TYPE,
  V1_DATA_QUALITY_RELATION_PROTOCOL_TYPE,
  V1_deserializeDataQualityClassValidation,
  V1_deserializeDataQualityServiceValidation,
  V1_deserializeDataQualityRelationValidation,
  V1_serializeDataQualityClassValidation,
  V1_serializeDataQualityServiceValidation,
  V1_serializeDataQualityRelationValidation,
} from './v1/transformation/pureProtocol/V1_DSL_DataQuality_ProtocolHelper.js';
import {
  V1_transformDataQualityClassValidationConfiguration,
  V1_transformDataQualityRelationValidationConfiguration,
} from './v1/transformation/V1_DSL_DataQuality_ValueSpecificationTransformer.js';
import {
  V1_buildDataQualityClassValidationConfiguration,
  V1_buildDataQualityRelationValidationConfiguration,
  V1_buildDataQualityServiceValidationConfiguration,
} from './v1/transformation/V1_DSL_DataQuality_ValueSpecificationBuilderHelper.js';
import { V1_DataQualityRootGraphFetchTree } from './v1/model/graphFetch/V1_DataQualityRootGraphFetchTree.js';
import {
  type V1_ElementProtocolClassifierPathGetter,
  type V1_ElementProtocolDeserializer,
  type V1_ElementProtocolSerializer,
  type V1_ElementTransformer,
  type V1_GraphBuilderContext,
  type V1_GraphTransformerContext,
  type V1_PackageableElement,
  type PackageableElement,
  type V1_GraphFetchTree,
  type V1_GraphFetchSerializer,
  type V1_GraphFetchDeserializer,
  V1_buildFullPath,
  V1_ElementBuilder,
  PureProtocolProcessorPlugin,
} from '@finos/legend-graph';
import { V1_DataQualityPropertyGraphFetchTree } from './v1/model/graphFetch/V1_DataQualityPropertyGraphFetchTree.js';
import { deserialize, serialize } from 'serializr';
import {
  V1_DATA_QUALITY_PROPERTY_GRAPH_FETCH_TREE_TYPE,
  V1_DATA_QUALTIY_ROOT_GRAPH_FETCH_TREE_TYPE,
  V1_propertyGraphFetchTreeModelSchema,
  V1_rootGraphFetchTreeModelSchema,
} from './v1/transformation/V1_DSL_DataQuality_ValueSpecificationSerializer.js';

const DATA_QUALITY_CLASSIFIER_PATH = 'meta::external::dataquality::DataQuality';
const DATA_QUALITY_RELATION_VALIDATION_CLASSIFIER_PATH =
  'meta::external::dataquality::DataQualityRelationValidation';

export class DSL_DataQuality_PureProtocolProcessorPlugin extends PureProtocolProcessorPlugin {
  constructor() {
    super(
      packageJson.extensions.pureProtocolProcessorPlugin,
      packageJson.version,
    );
  }

  override V1_getExtraElementBuilders(): V1_ElementBuilder[] {
    return [
      new V1_ElementBuilder<V1_DataQualityClassValidationsConfiguration>({
        elementClassName: V1_DATA_QUALITY_PROTOCOL_TYPE,
        _class: V1_DataQualityClassValidationsConfiguration,
        firstPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): PackageableElement => {
          assertType(
            elementProtocol,
            V1_DataQualityClassValidationsConfiguration,
          );
          const element = new DataQualityClassValidationsConfiguration(
            elementProtocol.name,
          );
          const path = V1_buildFullPath(
            elementProtocol.package,
            elementProtocol.name,
          );
          context.currentSubGraph.setOwnElementInExtension(
            path,
            element,
            DataQualityClassValidationsConfiguration,
          );
          return element;
        },
        secondPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): void => {
          assertType(
            elementProtocol,
            V1_DataQualityClassValidationsConfiguration,
          );
          V1_buildDataQualityClassValidationConfiguration(
            elementProtocol,
            context,
          );
        },
      }),
      new V1_ElementBuilder<V1_DataQualityRelationValidationsConfiguration>({
        elementClassName: V1_DATA_QUALITY_RELATION_PROTOCOL_TYPE,
        _class: V1_DataQualityRelationValidationsConfiguration,
        firstPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): PackageableElement => {
          assertType(
            elementProtocol,
            V1_DataQualityRelationValidationsConfiguration,
          );
          const element = new DataQualityRelationValidationConfiguration(
            elementProtocol.name,
          );
          const path = V1_buildFullPath(
            elementProtocol.package,
            elementProtocol.name,
          );
          context.currentSubGraph.setOwnElementInExtension(
            path,
            element,
            DataQualityRelationValidationConfiguration,
          );
          return element;
        },
        secondPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): void => {
          assertType(
            elementProtocol,
            V1_DataQualityRelationValidationsConfiguration,
          );
          V1_buildDataQualityRelationValidationConfiguration(
            elementProtocol,
            context,
          );
        },
      }),

      new V1_ElementBuilder<V1_DataQualityServiceValidationsConfiguration>({
        elementClassName: V1_DATA_QUALITY_SERVICE_PROTOCOL_TYPE,
        _class: V1_DataQualityServiceValidationsConfiguration,
        firstPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): PackageableElement => {
          assertType(
            elementProtocol,
            V1_DataQualityServiceValidationsConfiguration,
          );
          const element = new DataQualityServiceValidationConfiguration(
            elementProtocol.name,
          );
          const path = V1_buildFullPath(
            elementProtocol.package,
            elementProtocol.name,
          );
          context.currentSubGraph.setOwnElementInExtension(
            path,
            element,
            DataQualityServiceValidationConfiguration,
          );
          return element;
        },
        secondPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): void => {
          assertType(
            elementProtocol,
            V1_DataQualityServiceValidationsConfiguration,
          );
          V1_buildDataQualityServiceValidationConfiguration(
            elementProtocol,
            context,
          );
        },
      }),
    ];
  }

  override V1_getExtraElementClassifierPathGetters(): V1_ElementProtocolClassifierPathGetter[] {
    return [
      (protocol: V1_PackageableElement): string | undefined => {
        if (
          protocol instanceof V1_DataQualityRelationValidationsConfiguration
        ) {
          return DATA_QUALITY_RELATION_VALIDATION_CLASSIFIER_PATH;
        } else if (protocol instanceof V1_DataQualityValidationsConfiguration) {
          return DATA_QUALITY_CLASSIFIER_PATH;
        }
        return undefined;
      },
    ];
  }

  override V1_getExtraElementProtocolSerializers(): V1_ElementProtocolSerializer[] {
    return [
      (
        protocol: V1_PackageableElement,
        plugins: PureProtocolProcessorPlugin[],
      ): PlainObject | undefined => {
        if (protocol instanceof V1_DataQualityClassValidationsConfiguration) {
          return V1_serializeDataQualityClassValidation(protocol, plugins);
        }
        if (protocol instanceof V1_DataQualityServiceValidationsConfiguration) {
          return V1_serializeDataQualityServiceValidation(protocol, plugins);
        }
        if (
          protocol instanceof V1_DataQualityRelationValidationsConfiguration
        ) {
          return V1_serializeDataQualityRelationValidation(protocol, plugins);
        }
        return undefined;
      },
    ];
  }

  override V1_getExtraGraphFetchProtocolSerializers(): V1_GraphFetchSerializer[] {
    return [
      (
        protocol: V1_GraphFetchTree,
        plugins: PureProtocolProcessorPlugin[],
      ): PlainObject | undefined => {
        if (protocol instanceof V1_DataQualityPropertyGraphFetchTree) {
          return serialize(
            V1_propertyGraphFetchTreeModelSchema(plugins),
            protocol,
          );
        } else if (protocol instanceof V1_DataQualityRootGraphFetchTree) {
          return serialize(V1_rootGraphFetchTreeModelSchema(plugins), protocol);
        }
        return undefined;
      },
    ];
  }

  override V1_getExtraGraphFetchProtocolDeserializers(): V1_GraphFetchDeserializer[] {
    return [
      (
        json: PlainObject,
        plugins: PureProtocolProcessorPlugin[],
      ): V1_GraphFetchTree | undefined => {
        if (json._type === V1_DATA_QUALITY_PROPERTY_GRAPH_FETCH_TREE_TYPE) {
          return deserialize(
            V1_propertyGraphFetchTreeModelSchema(plugins),
            json,
          );
        }
        if (json._type === V1_DATA_QUALTIY_ROOT_GRAPH_FETCH_TREE_TYPE) {
          return deserialize(V1_rootGraphFetchTreeModelSchema(plugins), json);
        }
        return undefined;
      },
    ];
  }

  override V1_getExtraElementProtocolDeserializers(): V1_ElementProtocolDeserializer[] {
    return [
      (
        json: PlainObject,
        plugins: PureProtocolProcessorPlugin[],
      ): V1_PackageableElement | undefined => {
        if (json._type === V1_DATA_QUALITY_PROTOCOL_TYPE) {
          return V1_deserializeDataQualityClassValidation(json, plugins);
        }
        if (json._type === V1_DATA_QUALITY_SERVICE_PROTOCOL_TYPE) {
          return V1_deserializeDataQualityServiceValidation(json, plugins);
        }
        if (json._type === V1_DATA_QUALITY_RELATION_PROTOCOL_TYPE) {
          return V1_deserializeDataQualityRelationValidation(json, plugins);
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
        if (metamodel instanceof DataQualityClassValidationsConfiguration) {
          return V1_transformDataQualityClassValidationConfiguration(
            metamodel,
            context,
          );
        }
        if (metamodel instanceof DataQualityRelationValidationConfiguration) {
          return V1_transformDataQualityRelationValidationConfiguration(
            metamodel,
            context,
          );
        }
        return undefined;
      },
    ];
  }
}
