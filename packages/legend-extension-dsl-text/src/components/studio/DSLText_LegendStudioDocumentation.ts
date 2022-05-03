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

export enum DSL_TEXT_LEGEND_STUDIO_DOCUMENTATION_KEY {
  GRAMMAR_PARSER = 'dsl-text__grammar-parser',
  GRAMMAR_TEXT_ELEMENT = 'dsl-text__grammar-text-element',
}

export const DSL_TEXT_DOCUMENTATION_ENTRIES = {
  [DSL_TEXT_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER]: {
    markdownText: {
      value: `A DSL concerning with storing data in plain text`,
    },
  },
  [DSL_TEXT_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_TEXT_ELEMENT]: {
    markdownText: {
      value: `A text element can be used to store some text content with a specified type, which can be used for formatting, syntax-highlighting`,
    },
  },
};
