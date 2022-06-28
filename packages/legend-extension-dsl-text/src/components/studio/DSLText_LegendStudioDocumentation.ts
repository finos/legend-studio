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

export enum DSL_TEXT_LEGEND_STUDIO_DOCUMENTATION_KEY {
  GRAMMAR_PARSER = 'dsl-text.grammar.parser',
  GRAMMAR_ELEMENT_TEXT = 'dsl-text.grammar.element.text',
}

export const DSL_TEXT_DOCUMENTATION_ENTRIES: Record<
  string,
  LegendApplicationDocumentationConfigEntry
> = {
  [DSL_TEXT_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER]: {
    title: 'What is Text DSL about?',
    markdownText: {
      value: `\`Text DSL\` (corresponding to header \`###DataSpace\` section in \`Pure\`) concerns with storing data in plain-text`,
    },
  },
  [DSL_TEXT_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_ELEMENT_TEXT]: {
    title: 'What is a text element?',
    markdownText: {
      value: `A \`Text\` element stores plain-text content with a specified content-type, which can be used for formatting, syntax-highlighting`,
    },
  },
};
