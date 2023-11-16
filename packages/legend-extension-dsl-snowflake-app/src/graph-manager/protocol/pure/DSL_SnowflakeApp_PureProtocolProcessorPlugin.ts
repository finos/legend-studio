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

import packageJson from '../../../../package.json' assert { type: 'json' };
import {
  type PlainObject,
  guaranteeNonNullable,
  assertType,
  assertNonEmptyString,
} from '@finos/legend-shared';
import { deserialize, serialize } from 'serializr';
import {
  V1_snowflakeAppModelSchema,
  V1_SNOWFLAKE_APP_ELEMENT_PROTOCOL_TYPE,
} from './v1/transformation/pureProtocol/V1_DSL_SnowflakeApp_ProtocolHelper.js';
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
  V1_checkDuplicatedElement,
  PackageableElementExplicitReference,
  generateFunctionPrettyName,
} from '@finos/legend-graph';
import { V1_SnowflakeApp } from './v1/model/packageableElements/snowflakeApp/V1_SnowflakeApp_SnowflakeApp.js';
import { SnowflakeApp } from '../../../graph/metamodel/pure/model/packageableElements/snowflakeApp/DSL_SnowflakeApp_SnowflakeApp.js';
import {
  V1_buildSnowflakeAppDeploymentConfiguration,
  V1_buildSnowflakeAppType,
} from './v1/transformation/pureGraph/to/V1_DSL_SnowflakeApp_BuilderHelper.js';
import { V1_transformSnowflakeApp } from './v1/transformation/pureGraph/from/V1_DSL_SnowflakeApp_TransformerHelper.js';

const SNOWFLAKE_APP_ELEMENT_CLASSIFIER_PATH =
  'meta::external::function::activator::snowflakeApp::SnowflakeApp';

export class DSL_SnowflakeApp_PureProtocolProcessorPlugin extends PureProtocolProcessorPlugin {
  constructor() {
    super(
      packageJson.extensions.pureProtocolProcessorPlugin,
      packageJson.version,
    );
  }

  override V1_getExtraElementBuilders(): V1_ElementBuilder<V1_PackageableElement>[] {
    return [
      new V1_ElementBuilder<V1_SnowflakeApp>({
        elementClassName: 'SnowflakeApp',
        _class: V1_SnowflakeApp,
        firstPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): PackageableElement => {
          assertNonEmptyString(
            elementProtocol.package,
            `Function activator 'package' field is missing or empty`,
          );
          assertNonEmptyString(
            elementProtocol.name,
            `Function activator 'name' field is missing or empty`,
          );
          assertType(elementProtocol, V1_SnowflakeApp);
          const metamodel = new SnowflakeApp(elementProtocol.name);
          const path = V1_buildFullPath(
            elementProtocol.package,
            elementProtocol.name,
          );
          V1_checkDuplicatedElement(path, context, undefined);
          // since FunctionActivator is in core and SnowflakeApp extends FunctionActivator, we will index SnowflakeApp
          // as FunctionActivator in the graph.
          context.currentSubGraph.setOwnFunctionActivator(path, metamodel);
          metamodel.applicationName = elementProtocol.applicationName;
          metamodel.description = elementProtocol.description;
          metamodel.owner = elementProtocol.owner;
          if (elementProtocol.type) {
            metamodel.type = V1_buildSnowflakeAppType(elementProtocol.type);
          }
          return metamodel;
        },
        secondPass: (
          elementProtocol: V1_PackageableElement,
          context: V1_GraphBuilderContext,
        ): void => {
          assertType(elementProtocol, V1_SnowflakeApp);
          // since FunctionActivator is in core and SnowflakeApp extends FunctionActivator, we will index SnowflakeApp
          // as FunctionActivator in the graph.
          const metamodel = context.currentSubGraph.getOwnFunctionActivator(
            V1_buildFullPath(elementProtocol.package, elementProtocol.name),
          );
          metamodel.function = PackageableElementExplicitReference.create(
            guaranteeNonNullable(
              context.graph.functions.find(
                (fn) =>
                  generateFunctionPrettyName(fn, {
                    fullPath: true,
                    spacing: false,
                    notIncludeParamName: true,
                  }) === elementProtocol.function.replaceAll(/\s*/gu, ''),
              ),
            ),
          );
          metamodel.activationConfiguration =
            V1_buildSnowflakeAppDeploymentConfiguration(
              elementProtocol.activationConfiguration,
              context,
            );
        },
      }),
    ];
  }

  override V1_getExtraElementClassifierPathGetters(): V1_ElementProtocolClassifierPathGetter[] {
    return [
      (elementProtocol: V1_PackageableElement): string | undefined => {
        if (elementProtocol instanceof V1_SnowflakeApp) {
          return SNOWFLAKE_APP_ELEMENT_CLASSIFIER_PATH;
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
        if (elementProtocol instanceof V1_SnowflakeApp) {
          return serialize(V1_snowflakeAppModelSchema, elementProtocol);
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
        if (json._type === V1_SNOWFLAKE_APP_ELEMENT_PROTOCOL_TYPE) {
          return deserialize(V1_snowflakeAppModelSchema, json);
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
        if (metamodel instanceof SnowflakeApp) {
          return V1_transformSnowflakeApp(metamodel);
        }
        return undefined;
      },
    ];
  }
}
