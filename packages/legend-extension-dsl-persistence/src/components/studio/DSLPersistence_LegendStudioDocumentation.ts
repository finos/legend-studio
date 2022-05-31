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

import type { LegendApplicationDocumentationEntryConfig } from '@finos/legend-application';

export enum DSL_PERSISTENCE_LEGEND_STUDIO_DOCUMENTATION_KEY {
  GRAMMAR_PARSER = 'dsl-persistence.grammar.parser',
  GRAMMAR_ELEMENT_PERSISTENCE = 'dsl-persistence.grammar.element.persistence',
}

export const DSL_PERSISTENCE_DOCUMENTATION_ENTRIES: Record<
  string,
  LegendApplicationDocumentationEntryConfig
> = {
  [DSL_PERSISTENCE_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER]: {
    title: `What is Persistence DSL about?`,
    markdownText: {
      value: `\`Persistence DSL\` (coressponding to \`###Persistence\` section in \`Pure\`) concerns with data pipelines which enable writing/persisting data`,
    },
  },
  [DSL_PERSISTENCE_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_PERSISTENCE]:
    {
      title: `What is a persistence element?`,
      markdownText: {
        value: `A \`Persistence\` element specifies a data pipeline`,
      },
    },
};
