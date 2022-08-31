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

import type { DSL_LegendStudioApplicationPlugin_Extension } from './LegendStudioApplicationPlugin.js';
import type {
  DatasourceSpecification,
  AuthenticationStrategy,
  PostProcessor,
  ObserverContext,
} from '@finos/legend-graph';
import type { RelationalDatabaseConnectionValueState } from './editor-state/element-editor-state/connection/ConnectionEditorState.js';

// connection datasource specification

export type DatasourceSpecificationTypeGetter = (
  metamodel: DatasourceSpecification,
) => string | undefined;

export type DatasourceSpecificationCreator = (
  type: string,
) => DatasourceSpecification | undefined;

export type DatasourceSpecificationEditorRenderer = (
  metamodel: DatasourceSpecification,
  isReadOnly: boolean,
) => React.ReactNode | undefined;

// connection authentication strategy

export type AuthenticationStrategyTypeGetter = (
  metamodel: AuthenticationStrategy,
) => string | undefined;

export type AuthenticationStrategyCreator = (
  type: string,
) => AuthenticationStrategy | undefined;

export type AuthenticationStrategyEditorRenderer = (
  metamodel: AuthenticationStrategy,
  isReadOnly: boolean,
) => React.ReactNode | undefined;

// connection post processor specification

export type PostProcessorTypeGetter = (
  metamodel: PostProcessor,
) => string | undefined;

export type PostProcessorCreator = (type: string) => PostProcessor | undefined;

export type PostProcessorEditorRenderer = (
  metamodel: PostProcessor,
  connectionValueState: RelationalDatabaseConnectionValueState,
  isReadOnly: boolean,
) => React.ReactNode | undefined;

export interface StoreRelational_LegendStudioApplicationPlugin_Extension
  extends DSL_LegendStudioApplicationPlugin_Extension {
  // --------------------- relational database connection datasource specification ------------------

  /**
   * Get the list of the supported type specifiers for relational database
   * datasource specifications.
   */
  getExtraDatasourceSpecificationTypes?(): string[];

  /**
   * Get the list of classifiers for a relational database datasource specification.
   */
  getExtraDatasourceSpecificationTypeGetters?(): DatasourceSpecificationTypeGetter[];

  /**
   * Get the list of creators for relational database datasource specification given the type specifier.
   */
  getExtraDatasourceSpecificationCreators?(): DatasourceSpecificationCreator[];

  /**
   * Get the list of renderers for the editor for a relational database datasource specification.
   */
  getExtraDatasourceSpecificationEditorRenderers?(): DatasourceSpecificationEditorRenderer[];

  // --------------------- relational database connection authentication strategy ------------------

  /**
   * Get the list of supported type specifiers for relational database connection
   * authentication strategies.
   */
  getExtraAuthenticationStrategyTypes?(): string[];

  /**
   * Get the list of classifiers for a relational database authentication strategy.
   */
  getExtraAuthenticationStrategyTypeGetters?(): AuthenticationStrategyTypeGetter[];

  /**
   * Get the list of creators for relational database authentication strategy given the type specifier.
   */
  getExtraAuthenticationStrategyCreators?(): AuthenticationStrategyCreator[];

  /**
   * Get the list of renderers for the editor for a relational database authentication strategy.
   */
  getExtraAuthenticationStrategyEditorRenderers?(): AuthenticationStrategyEditorRenderer[];

  // --------------------- relational database connection post processor ------------------

  /**
   * Get the list of the supported type specifiers for relational post processors
   */
  getExtraPostProcessorTypes?(): string[];

  /**
   * Get the list of classifiers for a relational post processor specification.
   */
  getExtraPostProcessorTypeGetters?(): PostProcessorTypeGetter[];

  /**
   * Get the list of creators for relational post processor specification given the type specifier.
   */
  getExtraPostProcessorCreators?(
    connectionValueState: RelationalDatabaseConnectionValueState,
    observerContext: ObserverContext,
  ): PostProcessorCreator[];

  /**
   * Get the list of renderers for the editor for a relational post processor specification.
   */
  getExtraPostProcessorEditorRenderers?(): PostProcessorEditorRenderer[];
}
