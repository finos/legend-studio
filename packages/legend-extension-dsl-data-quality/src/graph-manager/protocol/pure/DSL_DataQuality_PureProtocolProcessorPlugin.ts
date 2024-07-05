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
import { type PlainObject, assertType } from '@finos/legend-shared';
import {
  V1_DataQualityClassValidationsConfiguration,
  V1_DataQualityServiceValidationsConfiguration,
} from './v1/V1_DataQualityConstraintsConfiguration.js';
import {
  DataQualityClassValidationsConfiguration,
  DataQualityServiceValidationConfiguration,
} from '../../../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';
import {
  getOwnDataQualityClassValidationsConfiguration,
  getOwnDataQualityServiceValidationsConfiguration,
} from '../../DSL_DataQuality_GraphManagerHelper.js';
import {
  V1_DATA_QUALITY_PROTOCOL_TYPE,
  V1_DATA_QUALITY_SERVICE_PROTOCOL_TYPE,
  V1_deserializeDataQualityClassValidation,
  V1_deserializeDataQualityServiceValidation,
  V1_serializeDataQualityClassValidation,
  V1_serializeDataQualityServiceValidation,
} from './v1/transformation/pureProtocol/V1_DSL_DataQuality_ProtocolHelper.js';
import {
  V1_transformDataQualityExecutionContext,
  V1_transformDataQualityGraphFetchTree,
} from './v1/transformation/V1_ValueSpecificationTransformer.js';
import {
  V1_buildDataQualityExecutionContext,
  V1_buildDataQualityGraphFetchTree,
} from './v1/transformation/V1_ValueSpecificationBuilderHelper.js';
import type { V1_DataQualityRootGraphFetchTree } from './v1/model/graphFetch/V1_DataQualityRootGraphFetchTree.js';
import {
  type V1_ElementProtocolClassifierPathGetter,
  type V1_ElementProtocolDeserializer,
  type V1_ElementProtocolSerializer,
  type V1_ElementTransformer,
  type V1_GraphBuilderContext,
  type V1_GraphTransformerContext,
  type V1_PackageableElement,
  type PackageableElement,
  V1_buildFullPath,
  V1_buildRawLambdaWithResolvedPaths,
  V1_initPackageableElement,
  V1_transformRawLambda,
  V1_ElementBuilder,
  V1_ProcessingContext,
  PureProtocolProcessorPlugin,
} from '@finos/legend-graph';
import type { DataQualityRootGraphFetchTree } from '../../../graph/metamodel/pure/packageableElements/data-quality/DataQualityGraphFetchTree.js';

const DATA_QUALITY_CLASSIFIER_PATH =
  'meta::pure::metamodel::dataquality::DataQuality';

export class DSL_DataQuality_PureProtocolProcessorPlugin extends PureProtocolProcessorPlugin {
  constructor() {
    super(
      packageJson.extensions.pureProtocolProcessorPlugin,
      packageJson.version,
    );
  }

  override V1_getExtraElementBuilders(): V1_ElementBuilder<V1_PackageableElement>[] {
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
          const path = V1_buildFullPath(
            elementProtocol.package,
            elementProtocol.name,
          );
          const element = getOwnDataQualityClassValidationsConfiguration(
            path,
            context.currentSubGraph,
          );
          element.context = V1_buildDataQualityExecutionContext(
            elementProtocol.context,
            context,
          );
          element.dataQualityRootGraphFetchTree =
            elementProtocol.dataQualityRootGraphFetchTree
              ? (V1_buildDataQualityGraphFetchTree(
                  elementProtocol.dataQualityRootGraphFetchTree,
                  context,
                  undefined,
                  [],
                  new V1_ProcessingContext(''),
                  true,
                ) as DataQualityRootGraphFetchTree)
              : undefined;
          element.filter = elementProtocol.filter
            ? V1_buildRawLambdaWithResolvedPaths(
                elementProtocol.filter.parameters,
                elementProtocol.filter.body,
                context,
              )
            : undefined;
        },
      }),
      //TODO handle service validations
      new V1_ElementBuilder<V1_DataQualityServiceValidationsConfiguration>({
        elementClassName: 'dataQualityServiceValidations',
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
          const path = V1_buildFullPath(
            elementProtocol.package,
            elementProtocol.name,
          );
          const element = getOwnDataQualityServiceValidationsConfiguration(
            path,
            context.currentSubGraph,
          );
          element.contextName = elementProtocol.contextName;
          element.serviceName = elementProtocol.serviceName;
          element.dataQualityRootGraphFetchTree =
            elementProtocol.dataQualityRootGraphFetchTree
              ? (V1_buildDataQualityGraphFetchTree(
                  elementProtocol.dataQualityRootGraphFetchTree,
                  context,
                  undefined,
                  [],
                  new V1_ProcessingContext(''),
                  true,
                ) as DataQualityRootGraphFetchTree)
              : undefined;
        },
      }),
    ];
  }

  override V1_getExtraElementClassifierPathGetters(): V1_ElementProtocolClassifierPathGetter[] {
    return [
      (protocol: V1_PackageableElement): string | undefined => {
        if (protocol instanceof V1_DataQualityClassValidationsConfiguration) {
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
      ): PlainObject<V1_PackageableElement> | undefined => {
        if (protocol instanceof V1_DataQualityClassValidationsConfiguration) {
          return V1_serializeDataQualityClassValidation(protocol);
        }
        if (protocol instanceof V1_DataQualityServiceValidationsConfiguration) {
          return V1_serializeDataQualityServiceValidation(protocol);
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
        if (json._type === V1_DATA_QUALITY_PROTOCOL_TYPE) {
          return V1_deserializeDataQualityClassValidation(json);
        }
        if (json._type === V1_DATA_QUALITY_SERVICE_PROTOCOL_TYPE) {
          return V1_deserializeDataQualityServiceValidation(json);
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
          const protocol = new V1_DataQualityClassValidationsConfiguration();
          V1_initPackageableElement(protocol, metamodel);
          protocol.name = metamodel.name;
          protocol.package = metamodel.package?.path ?? '';
          protocol.dataQualityRootGraphFetchTree =
            metamodel.dataQualityRootGraphFetchTree
              ? (V1_transformDataQualityGraphFetchTree(
                  metamodel.dataQualityRootGraphFetchTree,
                  [],
                  new Map<string, unknown[]>(),
                  false,
                  false,
                ) as V1_DataQualityRootGraphFetchTree)
              : undefined;
          protocol.context = V1_transformDataQualityExecutionContext(
            metamodel.context,
          );
          protocol.filter = metamodel.filter
            ? V1_transformRawLambda(metamodel.filter, context)
            : undefined;
          return protocol;
        }
        return undefined;
      },
    ];
  }
}
