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

export enum DSL_DATA_SPACE_LEGEND_STUDIO_DOCUMENTATION_KEY {
  GRAMMAR_PARSER = 'dsl-dataspace.grammar.parser',
  GRAMMAR_ELEMENT_DATA_SPACE = 'dsl-dataspace.grammar.element.data-space',
}

export const DSL_DATA_SPACE_DOCUMENTATION_ENTRIES: Record<
  string,
  LegendApplicationDocumentationConfigEntry
> = {
  [DSL_DATA_SPACE_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER]: {
    title: `What is DataSpace DSL about?`,
    markdownText: {
      value: `\`DataSpace DSL\` (corresponding to header \`###DataSpace\` section in \`Pure\`) concerns with providing information and documentation about the taxonomy of data models`,
    },
  },
  [DSL_DATA_SPACE_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_DATA_SPACE]: {
    title: `What is a data-space element?`,
    markdownText: {
      value: `A \`Data-space\` element specifies a grouping of model diagrams, execution context (mapping, runtime), test data, and so on to help communicate about the _meaning_, _usage_, and relationships of data models and to help users quickly explore and understand the models`,
    },
  },
};
