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

import type { LegendApplicationDocumentationConfigEntry } from '@finos/legend-application';

export enum DSL_EXTERNAL_FORMAT_LEGEND_STUDIO_DOCUMENTATION_KEY {
  GRAMMAR_PARSER = 'dsl-external-format.grammar.parser',
  GRAMMAR_ELEMENT_BINDING = 'dsl-external-format.grammar.element.binding',
  GRAMMAR_ELEMENT_SCHEMASET = 'dsl-external-format.grammar.element.schema-set',
}

export const DSL_EXTERNAL_FORMAT_DOCUMENTATION_ENTRIES: Record<
  string,
  LegendApplicationDocumentationConfigEntry
> = {
  [DSL_EXTERNAL_FORMAT_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER]: {
    title: `What is External Format DSL about?`,
    markdownText: {
      value: `\`External Format DSL\` (coressponding to \`###ExternalFormat\` section in \`Pure\`) concerns with the serialization between data models and external formats like CSV, JSON, etc.`,
    },
  },
  [DSL_EXTERNAL_FORMAT_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_BINDING]:
    {
      title: `What is a binding element?`,
      markdownText: {
        value: `A \`Binding\` element specifies the mapping between data models and schemas of the data sources in external formats (e.g. JSON, CSV, etc.) as well as the serialization driver to use for data transformation`,
      },
    },
  [DSL_EXTERNAL_FORMAT_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_SCHEMASET]:
    {
      title: `What is a schema-set element?`,
      markdownText: {
        value: `A \`Schema-set\` element specifies schemas of data-sources in external formats (e.g. JSON, CSV, etc.)`,
      },
    },
};
