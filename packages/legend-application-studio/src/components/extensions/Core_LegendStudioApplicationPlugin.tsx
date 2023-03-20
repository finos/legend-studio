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

import {
  collectContextualDocumentationEntries,
  collectKeyedCommandConfigEntriesFromConfig,
  type KeyedCommandConfigEntry,
  type ContextualDocumentationEntry,
  type SettingConfigurationEntry,
  collectSettingConfigurationEntriesFromConfig,
} from '@finos/legend-application';
import packageJson from '../../../package.json';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../application/LegendStudioApplicationNavigationContext.js';
import {
  CORE_CONTEXTUAL_DOCUMENTATION_CONFIG,
  LEGEND_STUDIO_DOCUMENTATION_KEY,
} from '../../application/LegendStudioDocumentation.js';
import { LegendStudioApplicationPlugin } from '../../stores/LegendStudioApplicationPlugin.js';
import { LEGEND_STUDIO_COMMAND_CONFIG } from '../../application/LegendStudioCommand.js';
import { LEGEND_STUDIO_SETTING_CONFIG } from '../../application/LegendStudioSetting.js';

export class Core_LegendStudioApplicationPlugin extends LegendStudioApplicationPlugin {
  static NAME = packageJson.extensions.applicationStudioPlugin;

  constructor() {
    super(Core_LegendStudioApplicationPlugin.NAME, packageJson.version);
  }

  override getExtraKeyedCommandConfigEntries(): KeyedCommandConfigEntry[] {
    return collectKeyedCommandConfigEntriesFromConfig(
      LEGEND_STUDIO_COMMAND_CONFIG,
    );
  }

  override getExtraRequiredDocumentationKeys(): string[] {
    return [
      // grammar parsers
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER_PURE,
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER_MAPPING,
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER_CONNECTION,
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER_RUNTIME,
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER_RELATIONAL,
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER_SERVICE,
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER_GENERATION_SPECIFICATION,
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER_FILE_GENERATION,
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER_DATA,
      // grammar elements
      LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_CLASS,
      LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_PROFILE,
      LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_ENUMERATION,
      LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_MEASURE,
      LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_ASSOCIATION,
      LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_FUNCTION,
      LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_MAPPING,
      LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_DATABASE,
      LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_SERVICE,
      LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_RUNTIME,
      LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_CONNECTION,
      LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_GENERATION_SPECIFICATION,
      LEGEND_STUDIO_DOCUMENTATION_KEY.CONCEPT_ELEMENT_FILE_GENERATION_SPECIFICATION,
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_DATA_ELEMENT,
      // grammar elements
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_CONNECTION_JSON_MODEL_CONNECTION,
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_CONNECTION_XML_MODEL_CONNECTION,
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_CONNECTION_MODEL_CHAIN_CONNECTION,
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_CONNECTION_RELATIONAL_DATABASE_CONNECTION,
    ];
  }

  override getExtraContextualDocumentationEntries(): ContextualDocumentationEntry[] {
    return collectContextualDocumentationEntries(
      CORE_CONTEXTUAL_DOCUMENTATION_CONFIG,
    );
  }

  override getExtraAccessEventLoggingApplicationContextKeys(): string[] {
    return [
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.EMBEDDED_QUERY_BUILDER,
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.TEXT_MODE_EDITOR,
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.MODEL_LOADER,
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.CLASS_EDITOR,
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.PROFILE_EDITOR,
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.ENUMERATION_EDITOR,
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.ASSOCIATION_EDITOR,
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.FUNCTION_EDITOR,
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.MAPPING_EDITOR,
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.RUNTIME_EDITOR,
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.CONNECTION_EDITOR,
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.DATABASE_BUILDER,
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.SERVICE_EDITOR,
    ];
  }

  override getExtraSettingConfigurationEntries(): SettingConfigurationEntry[] {
    return collectSettingConfigurationEntriesFromConfig(
      LEGEND_STUDIO_SETTING_CONFIG,
    );
  }
}
