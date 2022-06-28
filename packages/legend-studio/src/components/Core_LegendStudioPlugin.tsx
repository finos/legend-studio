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
  collectContextualDocumnetationEntry,
  type LegendApplicationContextualDocumentationEntry,
} from '@finos/legend-application';
import packageJson from '../../package.json';
import {
  CORE_CONTEXTUAL_DOCUMENTATION_MAP,
  LEGEND_STUDIO_DOCUMENTATION_KEY,
} from '../stores/LegendStudioDocumentation.js';
import { LegendStudioPlugin } from '../stores/LegendStudioPlugin.js';

export class Core_LegendStudioPlugin extends LegendStudioPlugin {
  static NAME = packageJson.extensions.core_studioPlugin;

  constructor() {
    super(Core_LegendStudioPlugin.NAME, packageJson.version);
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
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_CLASS,
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_PROFILE,
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_ENUMERATION,
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_MEASURE,
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_ASSOCIATION,
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_FUNCTION,
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_MAPPING,
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_DATABASE,
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_SERVICE,
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_RUNTIME,
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_CONNECTION,
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_GENERATION_SPECIFICATION,
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_FILE_GENERATION_SPECIFICATION,
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_DATA_ELEMENT,
      // grammar elements
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_CONNECTION_JSON_MODEL_CONNECTION,
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_CONNECTION_XML_MODEL_CONNECTION,
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_CONNECTION_MODEL_CHAIN_CONNECTION,
      LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_CONNECTION_RELATIONAL_DATABASE_CONNECTION,
    ];
  }

  override getExtraContextualDocumentationEntries(): LegendApplicationContextualDocumentationEntry[] {
    return collectContextualDocumnetationEntry(
      CORE_CONTEXTUAL_DOCUMENTATION_MAP,
    );
  }
}
