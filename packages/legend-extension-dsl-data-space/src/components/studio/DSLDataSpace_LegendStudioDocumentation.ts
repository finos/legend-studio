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

export enum DSL_DATA_SPACE_LEGEND_STUDIO_DOCUMENTATION_KEY {
  GRAMMAR_PARSER = 'dsl-dataspace__grammar-parser',
  GRAMMAR_DATA_SPACE_ELEMENT = 'dsl-dataspace__grammar-data-space-element',
}

export const DSL_DATA_SPACE_DOCUMENTATION_ENTRIES = {
  [DSL_DATA_SPACE_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_PARSER]: {
    markdownText: {
      value: `A DSL concerning with providing information, documentation about the taxonomy of data models`,
    },
  },
  [DSL_DATA_SPACE_LEGEND_STUDIO_DOCUMENTATION_KEY.GRAMMAR_DATA_SPACE_ELEMENT]: {
    markdownText: {
      value: `A data-space can be used to communicate about the _meaning_, _usage_, and relationships of data models by providing model diagrams, execution context (mapping, runtime), test data, and so on, to help users quickly explore and understand the models`,
    },
  },
};
