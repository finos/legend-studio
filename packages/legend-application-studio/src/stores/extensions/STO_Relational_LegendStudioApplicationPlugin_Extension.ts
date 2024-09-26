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

import type { DSL_LegendStudioApplicationPlugin_Extension } from '../LegendStudioApplicationPlugin.js';
import type {
  DatasourceSpecification,
  AuthenticationStrategy,
  PostProcessor,
  ObserverContext,
} from '@finos/legend-graph';
import type { RelationalDatabaseConnectionValueState } from '../editor/editor-state/element-editor-state/connection/ConnectionEditorState.js';
import type { PostProcessorEditorState } from '../editor/editor-state/element-editor-state/connection/PostProcessorEditorState.js';
import type { ElementEmbeddedContentSnippetSuggestion } from '@finos/legend-code-editor';

/**
 * NOTE: The tab-stop index of the snippet must start from 6
 */
export type EmbeddedPostProcessorSnippetSuggestion =
  ElementEmbeddedContentSnippetSuggestion;

// connection datasource specification

export type DatasourceSpecificationClassifier = (
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

export type AuthenticationStrategyClassifier = (
  metamodel: AuthenticationStrategy,
) => string | undefined;

export type AuthenticationStrategyCreator = (
  type: string,
) => AuthenticationStrategy | undefined;

export type AuthenticationStrategyEditorRenderer = (
  metamodel: AuthenticationStrategy,
  isReadOnly: boolean,
) => React.ReactNode | undefined;

// connection post-processor

export type PostProcessorTypeGetter = (
  metamodel: PostProcessor,
) => string | undefined;

export type PostProcessorCreator = (
  type: string,
  connectionValueState: RelationalDatabaseConnectionValueState,
  observerContext: ObserverContext,
) => PostProcessor | undefined;

export type PostProcessorEditorRenderer = (
  metamodel: PostProcessor,
  connectionValueState: RelationalDatabaseConnectionValueState,
  isReadOnly: boolean,
) => React.ReactNode | undefined;

export type PostProcessorStateCreator = (
  metamodel: PostProcessor,
  connectionValueState: RelationalDatabaseConnectionValueState,
) => PostProcessorEditorState | undefined;

export interface STO_Relational_LegendStudioApplicationPlugin_Extension
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
  getExtraDatasourceSpecificationClassifiers?(): DatasourceSpecificationClassifier[];

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
  getExtraAuthenticationStrategyClassifiers?(): AuthenticationStrategyClassifier[];

  /**
   * Get the list of creators for relational database authentication strategy given the type specifier.
   */
  getExtraAuthenticationStrategyCreators?(): AuthenticationStrategyCreator[];

  /**
   * Get the list of renderers for the editor for a relational database authentication strategy.
   */
  getExtraAuthenticationStrategyEditorRenderers?(): AuthenticationStrategyEditorRenderer[];

  // --------------------- relational database connection post-processor ------------------

  /**
   * Get the list of the supported type for post-processors.
   *
   */
  getExtraPostProcessorClassifiers?(): string[];

  /**
   * Get the list of classifiers for a post-processor.
   */
  getExtraPostProcessorClassifierGetters?(): PostProcessorTypeGetter[];

  /**
   * Get the list of creators for post-processor given the type specifier.
   */
  getExtraPostProcessorCreators?(): PostProcessorCreator[];

  /**
   * Get the list of state creators for a post-processor.
   */
  getExtraPostProcessorStateCreators?(): PostProcessorStateCreator[];

  /**
   * Get the list of Pure grammar suggestion snippet getters for post-processors.
   */
  getExtraPostProcessorSnippetSuggestions?(): EmbeddedPostProcessorSnippetSuggestion[];

  /**
   * Get the list of renderers for the editor for a post-processor.
   */
  getExtraPostProcessorEditorRenderers?(): PostProcessorEditorRenderer[];
}
