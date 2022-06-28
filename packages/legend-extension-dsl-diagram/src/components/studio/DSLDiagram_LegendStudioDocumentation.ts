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

export enum DSL_DIAGRAM_LEGEND_STUDIO_DOCUMENTATION_KEY {
  GRAMMAR_PARSER = 'dsl-diagram.grammar.parser',
  GRAMMAR_ELEMENT_DIAGRAM = 'dsl-diagram.grammar.element.diagram',
}

export const DSL_DIAGRAM_DOCUMENTATION_ENTRIES: Record<
  string,
  LegendApplicationDocumentationConfigEntry
> = {
  [DSL_DIAGRAM_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER]: {
    title: `What is Diagram DSL about?`,
    markdownText: {
      value: `\`Diagram DSL\`  (coressponding to \`###Diagram\` section in \`Pure\`) concerns with visualizing data models and their relationship`,
    },
  },
  [DSL_DIAGRAM_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_DIAGRAM]: {
    title: `What is a diagram element?`,
    markdownText: {
      value: `A \`Diagram\` element specifies the visualization/rendering of data models and their relationship`,
    },
  },
};
