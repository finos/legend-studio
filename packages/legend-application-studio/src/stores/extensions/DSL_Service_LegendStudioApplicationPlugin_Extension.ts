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

import type { HostedServiceFunctionActivatorEditorState } from '../editor/editor-state/element-editor-state/function-activator/HostedServiceFunctionActivatorEditorState.js';
import type { DSL_LegendStudioApplicationPlugin_Extension } from '../LegendStudioApplicationPlugin.js';
import type {
  Connection,
  Runtime,
  PostDeploymentAction,
  ObserverContext,
  PostDeploymentProperties,
  HostedService,
} from '@finos/legend-graph';

export type ServiceTestRuntimeConnectionBuilder = (
  sourceConnection: Connection,
  runtime: Runtime,
  testData: string,
) => Connection | undefined;

export type PostDeploymentActionCreator = (
  type: string,
  hostedService: HostedService,
  observerContext: ObserverContext,
) => PostDeploymentAction | undefined;

export type PostDeploymentActionEditorRenderer = (
  postDeploymentContent: PostDeploymentProperties,
  activatorState: HostedServiceFunctionActivatorEditorState,
  isReadOnly: boolean,
  postDeploymentAction: PostDeploymentAction,
) => React.ReactNode | undefined;

export type PostDeploymentActionTypeGetter = (
  metamodel: PostDeploymentProperties,
) => string | undefined;

export interface DSL_Service_LegendStudioApplicationPlugin_Extension
  extends DSL_LegendStudioApplicationPlugin_Extension {
  /**
   * Get the list of service test runtime connection builder for a provided connection and test data.
   */
  getExtraServiceTestRuntimeConnectionBuilders?(): ServiceTestRuntimeConnectionBuilder[];
  /**
   * Get the list of renderers for the actions tab on Hosted Services.
   */
  getExtraActionEditorRenderers?(): PostDeploymentActionEditorRenderer[];
  /**
   * Get the list of renderers for the actions creators Hosted Services.
   */
  getExtraActionCreators?(): PostDeploymentActionCreator[];
  /**
   * Get the list of Post Deployment Types.
   */
  getExtraPostDeploymentTypes?(): string[];
  /**
   * Get the list of the Classifiers for Post Deployment Actions.
   */
  getExtraPostDeploymentActionClassifierGetters?(): PostDeploymentActionTypeGetter[];
}
